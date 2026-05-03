// Environment configuration
const parseRpcUrls = (value: string | undefined, fallback: string[]) => {
  const urls = value
    ?.split(',')
    .map((url) => url.trim())
    .filter(Boolean);

  return urls && urls.length > 0 ? urls : fallback;
};

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