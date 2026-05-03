require("dotenv").config();
const { ethers } = require("ethers");

// ABI for the functions we need
const ABI = [
  "function owner() view returns (address)",
  "function authorizedIssuers(address) view returns (bool)",
  "function addIssuer(address _issuer, string calldata _name, string calldata _country) external",
  "function transferOwnership(address newOwner) external"
];

async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("❌ PRIVATE_KEY not found in .env");
    process.exit(1);
  }

  const rpcUrl = "https://holesky.drpc.org";
  console.log("Connecting to RPC:", rpcUrl);
  
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  
  console.log("Running with account:", wallet.address);

  const contractAddress = "0x3753cfB00dd01D35A36284A909EcBb73a06Fcc7b";
  const targetAddress = "0x8626f6940e2eb28930efb4cef49b2d1f2c9c1199";

  console.log("Contract Address:", contractAddress);
  console.log("Target Address:", targetAddress);

  const dacvRegistry = new ethers.Contract(contractAddress, ABI, wallet);

  const currentOwner = await dacvRegistry.owner();
  console.log("Current Owner:", currentOwner);

  if (currentOwner.toLowerCase() !== wallet.address.toLowerCase()) {
    console.error("❌ Deployer is not the owner! Cannot grant access.");
    process.exit(1);
  }

  // 1. Grant Issuer Access
  const isAuthorized = await dacvRegistry.authorizedIssuers(targetAddress);
  if (!isAuthorized) {
    console.log("Adding target as issuer...");
    const feeData = await provider.getFeeData();
    const tx = await dacvRegistry.addIssuer(targetAddress, "New Admin Issuer", "Global", {
      maxPriorityFeePerGas: ethers.parseUnits("2", "gwei"),
      maxFeePerGas: feeData.maxFeePerGas || ethers.parseUnits("20", "gwei")
    });
    console.log("Tx hash:", tx.hash);
    await tx.wait();
    console.log("✅ Issuer access granted!");
  } else {
    console.log("✅ Target is already an issuer.");
  }

  // 2. Grant Admin Access (Transfer Ownership)
  if (currentOwner.toLowerCase() !== targetAddress.toLowerCase()) {
    console.log("Transferring ownership to target...");
    const tx2 = await dacvRegistry.transferOwnership(targetAddress);
    console.log("Tx hash:", tx2.hash);
    await tx2.wait();
    console.log("✅ Admin access (ownership) transferred!");
  } else {
    console.log("✅ Target is already the admin.");
  }

  console.log("Done!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
