import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers, BrowserProvider, Contract } from 'ethers';
import toast from 'react-hot-toast';
import { config } from '../config';

// Contract ABI (simplified - you'll need to import the full ABI from your compiled contract)
const CONTRACT_ABI = [
  "function addIssuer(address _issuer, string calldata _name, string calldata _country) external",
  "function issueCredential(address _student, string calldata _ipfsHash, string calldata _credentialType, uint256 _expiryDate) external returns (bytes32)",
  "function verifyCredential(bytes32 _credentialId) external view returns (bool isValid, address issuer, address student, string memory credentialType, uint256 issueDate, uint256 expiryDate, bool isRevoked)",
  "function revokeCredential(bytes32 _credentialId) external",
  "function getStudentCredentials(address _student) external view returns (bytes32[] memory)",
  "function getIssuerCredentials(address _issuer) external view returns (bytes32[] memory)",
  "function authorizedIssuers(address) external view returns (bool)",
  "function issuers(address) external view returns (string memory name, string memory country, bool isActive, uint256 registrationDate, uint256 credentialsIssued)",
  "event CredentialIssued(bytes32 indexed credentialId, address indexed issuer, address indexed student, string credentialType, string ipfsHash)",
  "event CredentialRevoked(bytes32 indexed credentialId, address indexed issuer)"
];

interface Web3ContextType {
  provider: BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  account: string | null;
  contract: Contract | null;
  chainId: number | null;
  isConnected: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchNetwork: () => Promise<void>;
}

const Web3Context = createContext<Web3ContextType | null>(null);

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};

interface Web3ProviderProps {
  children: ReactNode;
}

const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS || '';

export const Web3Provider: React.FC<Web3ProviderProps> = ({ children }) => {
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        toast.error('Please install MetaMask to use this application');
        return;
      }

      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();
      const network = await provider.getNetwork();

      setProvider(provider);
      setSigner(signer);
      setAccount(accounts[0]);
      setChainId(Number(network.chainId));
      setIsConnected(true);

      // Initialize contract if address is available
      if (CONTRACT_ADDRESS) {
        const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        setContract(contract);
      }

      toast.success('Wallet connected successfully');
    } catch (error) {
      console.error('Error connecting wallet:', error);
      toast.error('Failed to connect wallet');
    }
  };

  const disconnectWallet = () => {
    setProvider(null);
    setSigner(null);
    setAccount(null);
    setContract(null);
    setChainId(null);
    setIsConnected(false);
    toast.success('Wallet disconnected');
  };

  const switchNetwork = async () => {
    try {
      if (!window.ethereum) return;
      
      // Find the currently configured network from config
      const targetNetworkKey = Object.keys(config.networks).find(
        key => config.networks[key as keyof typeof config.networks].chainId === config.chainId
      ) as keyof typeof config.networks;
      
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${config.chainId.toString(16)}` }],
      });
    } catch (error: any) {
      if (error.code === 4902) {
        // Chain not added to MetaMask
        const targetNetKey = Object.keys(config.networks).find(
          key => config.networks[key as keyof typeof config.networks].chainId === config.chainId
        ) as keyof typeof config.networks;
        const fallbackActiveNetwork = targetNetKey ? config.networks[targetNetKey] : config.networks.holesky;
        
        try {
          const addParams: any = {
            chainId: `0x${config.chainId.toString(16)}`,
            chainName: fallbackActiveNetwork.name,
            nativeCurrency: {
              name: 'ETH',
              symbol: 'ETH',
              decimals: 18,
            },
            rpcUrls: fallbackActiveNetwork.rpcUrls,
          };
          
          if (fallbackActiveNetwork.blockExplorer) {
            addParams.blockExplorerUrls = [fallbackActiveNetwork.blockExplorer];
          }

          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [addParams],
          });
        } catch (addError: any) {
          console.error("MetaMask Add Error:", addError);
          toast.error(addError?.message || `Failed to add ${fallbackActiveNetwork.name}`);
        }
      } else {
        console.error("MetaMask Switch Error:", error);
        toast.error(error?.message || 'Failed to switch network');
      }
    }
  };

  // Listen for account and chain changes
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else {
          setAccount(accounts[0]);
        }
      };

      const handleChainChanged = (chainId: string) => {
        setChainId(parseInt(chainId, 16));
        window.location.reload(); // Reload to reset state
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum?.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, []);

  // Auto-connect if previously connected
  useEffect(() => {
    const autoConnect = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            await connectWallet();
          }
        } catch (error) {
          console.error('Auto-connect failed:', error);
        }
      }
    };

    autoConnect();
  }, []);

  const value: Web3ContextType = {
    provider,
    signer,
    account,
    contract,
    chainId,
    isConnected,
    connectWallet,
    disconnectWallet,
    switchNetwork,
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
};

// Extend window object for TypeScript
declare global {
  interface Window {
    ethereum?: any;
  }
}