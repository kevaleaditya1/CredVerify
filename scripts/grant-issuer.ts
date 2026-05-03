import { Contract, JsonRpcProvider, Wallet } from "ethers";

const registryAbi = [
  "function owner() view returns (address)",
  "function authorizedIssuers(address) view returns (bool)",
  "function addIssuer(address _issuer, string calldata _name, string calldata _country)"
];

async function main() {
  const contractAddress = process.env.CONTRACT_ADDRESS || process.argv[2];
  const issuerAddress = process.env.ISSUER_ADDRESS || process.argv[3];
  const issuerName = process.env.ISSUER_NAME || process.argv[4] || "Authorized Registrar";
  const issuerCountry = process.env.ISSUER_COUNTRY || process.argv[5] || "Holesky";

  if (!contractAddress || !issuerAddress) {
    throw new Error("Missing contract or issuer address. Set CONTRACT_ADDRESS and ISSUER_ADDRESS, or pass them as CLI args.");
  }

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("PRIVATE_KEY not found in environment variables");
  }

  const rpcUrls = [
    process.env.HOLESKY_RPC_URL,
    "https://holesky.drpc.org",
    "https://ethereum-holesky.publicnode.com",
    "https://1rpc.io/holesky",
  ].filter((url): url is string => Boolean(url));

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

  console.log(`Owner wallet: ${wallet.address}`);
  const ownerAddress = await contract.owner();
  console.log(`Contract owner: ${ownerAddress}`);

  if (ownerAddress.toLowerCase() !== wallet.address.toLowerCase()) {
    throw new Error("The provided PRIVATE_KEY is not the contract owner");
  }

  const alreadyAuthorized = await contract.authorizedIssuers(issuerAddress);
  if (alreadyAuthorized) {
    console.log("Issuer is already authorized.");
    return;
  }

  console.log(`Authorizing ${issuerAddress} as ${issuerName} (${issuerCountry})...`);
  const tx = await contract.addIssuer(issuerAddress, issuerName, issuerCountry, { gasLimit: 200000 });
  console.log("Transaction sent:", tx.hash);
  await tx.wait();
  console.log(`✅ ${issuerAddress} is now an authorized issuer.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
