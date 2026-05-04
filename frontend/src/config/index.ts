// Environment configuration

export const config = {
  contractAddress: process.env.REACT_APP_CONTRACT_ADDRESS || '',
  chainId: parseInt(process.env.REACT_APP_CHAIN_ID || '31338'),
  nftStorageKey: process.env.REACT_APP_NFT_STORAGE_KEY || '',
  networks: {

    localhost: {
      chainId: 31338,
      name: 'Hardhat Localhost',
      rpcUrls: ['http://localhost:8545'],
      blockExplorer: '',
    },
  },
};

export const SUPPORTED_CHAINS = [31338]; // Localhost