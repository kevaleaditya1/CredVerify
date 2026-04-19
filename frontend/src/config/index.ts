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
  chainId: parseInt(process.env.REACT_APP_CHAIN_ID || '17000'),
  nftStorageKey: process.env.REACT_APP_NFT_STORAGE_KEY || '',
  networks: {
    holesky: {
      chainId: 17000,
      name: 'Holesky Testnet',
      rpcUrls: parseRpcUrls(process.env.REACT_APP_HOLESKY_RPC_URLS, [
        'https://ethereum-holesky.publicnode.com',
        'https://1rpc.io/holesky',
        'https://rpc.holesky.ethpandaops.io',
        'https://holesky.drpc.org',
      ]),
      blockExplorer: 'https://holesky.etherscan.io',
    },
    localhost: {
      chainId: 31338,
      name: 'Hardhat Localhost',
      rpcUrls: ['http://localhost:8545'],
      blockExplorer: '',
    },
  },
};

export const SUPPORTED_CHAINS = [17000, 31338]; // Holesky and Localhost