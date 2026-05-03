const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Running with account:", deployer.address);

  // Read contract address from env or use the holesky default
  const contractAddress = process.env.CONTRACT_ADDRESS || "0x3753cfB00dd01D35A36284A909EcBb73a06Fcc7b";
  const targetAddress = "0x8626f6940e2eb28930efb4cef49b2d1f2c9c1199";

  console.log("Contract Address:", contractAddress);
  console.log("Target Address:", targetAddress);
  
  const DACVRegistry = await ethers.getContractFactory("DACVRegistry");
  const dacvRegistry = DACVRegistry.attach(contractAddress);

  const currentOwner = await dacvRegistry.owner();
  console.log("Current Owner:", currentOwner);

  if (currentOwner.toLowerCase() !== deployer.address.toLowerCase()) {
    console.error("❌ Deployer is not the owner! Cannot grant access.");
    process.exit(1);
  }

  // 1. Grant Issuer Access
  const isAuthorized = await dacvRegistry.authorizedIssuers(targetAddress);
  if (!isAuthorized) {
    console.log("Adding target as issuer...");
    const tx = await dacvRegistry.addIssuer(targetAddress, "New Admin Issuer", "Global");
    await tx.wait();
    console.log("✅ Issuer access granted!");
  } else {
    console.log("✅ Target is already an issuer.");
  }

  // 2. Grant Admin Access (Transfer Ownership)
  if (currentOwner.toLowerCase() !== targetAddress.toLowerCase()) {
    console.log("Transferring ownership to target...");
    const tx2 = await dacvRegistry.transferOwnership(targetAddress);
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
