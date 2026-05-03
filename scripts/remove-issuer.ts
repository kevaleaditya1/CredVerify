import { ethers } from "hardhat";

async function main() {
  const contractAddress = process.env.CONTRACT_ADDRESS || process.argv[2];
  const issuerAddress = process.env.ISSUER_ADDRESS || process.argv[3];

  if (!contractAddress || !issuerAddress) {
    throw new Error(
      "Missing contract or issuer address. Set CONTRACT_ADDRESS and ISSUER_ADDRESS, or pass them as CLI args."
    );
  }

  const rpcUrl = process.env.HOLESKY_RPC_URL || "https://ethereum-holesky.publicnode.com";
  const privateKey = process.env.PRIVATE_KEY;

  if (!privateKey) {
    throw new Error("PRIVATE_KEY not found in environment variables");
  }

  console.log(`Preparing to remove issuer ${issuerAddress} on contract ${contractAddress}...`);

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  const artifact = await ethers.getContractFactory("DACVRegistry");
  const contract = new ethers.Contract(contractAddress, artifact.interface, wallet);

  const isAuthorized = await contract.authorizedIssuers(issuerAddress);
  if (!isAuthorized) {
    console.log("Issuer is already not authorized.");
    return;
  }

  const tx = await contract.removeIssuer(issuerAddress, {
    gasLimit: 200000,
  });
  console.log("Transaction sent:", tx.hash);

  await tx.wait();
  console.log("✅ Success! Issuer has been removed.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Failed to remove issuer:", error);
    process.exit(1);
  });