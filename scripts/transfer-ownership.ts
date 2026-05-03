import { Contract, JsonRpcProvider, Wallet } from "ethers";

const registryAbi = [
  "function owner() view returns (address)",
  "function transferOwnership(address newOwner)"
];

async function main() {
  const contractAddress = process.env.CONTRACT_ADDRESS || process.argv[2];
  const newOwner = process.env.NEW_OWNER || process.argv[3];

  if (!contractAddress || !newOwner) {
    throw new Error("Missing contract or new owner address. Set CONTRACT_ADDRESS and NEW_OWNER, or pass them as CLI args.");
  }

  const rpcUrls = [
    process.env.HOLESKY_RPC_URL,
    "https://ethereum-holesky.publicnode.com",
    "https://1rpc.io/holesky",
    "https://rpc.holesky.ethpandaops.io",
    "https://holesky.drpc.org",
  ].filter((url): url is string => Boolean(url));
  const privateKey = process.env.PRIVATE_KEY;

  if (!privateKey) {
    throw new Error("PRIVATE_KEY not found in environment variables");
  }

  console.log(`Preparing to transfer ownership of ${contractAddress} to ${newOwner}...`);

  let provider: JsonRpcProvider | null = null;

  for (const rpcUrl of rpcUrls) {
    try {
      const candidate = new JsonRpcProvider(rpcUrl);
      await candidate.getBlockNumber();
      provider = candidate;
      console.log(`Using RPC: ${rpcUrl}`);
      break;
    } catch (error) {
      console.warn(`Skipping RPC ${rpcUrl}:`, error instanceof Error ? error.message : error);
    }
  }

  if (!provider) {
    throw new Error("No working Holesky RPC endpoint was available");
  }

  const wallet = new Wallet(privateKey, provider);
  const contract = new Contract(contractAddress, registryAbi, wallet);

  const currentOwner = await contract.owner();
  console.log("Current owner:", currentOwner);

  if (currentOwner.toLowerCase() === newOwner.toLowerCase()) {
    console.log("Target address is already the owner.");
    return;
  }

  try {
    const tx = await contract.transferOwnership(newOwner, { gasLimit: 200000 });
    console.log("Transaction sent:", tx.hash);
    await tx.wait();
    console.log(`✅ Ownership transferred to ${newOwner}`);
  } catch (err: any) {
    console.error("❌ Ownership transfer failed:", err);
    throw err;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
