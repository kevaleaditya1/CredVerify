const { ethers } = require("hardhat");

async function main() {
  // Get the deployer account (contract owner)
  const [deployer] = await ethers.getSigners();
  console.log("Adding issuer with account:", deployer.address);

  const contractAddress = process.env.CONTRACT_ADDRESS || process.argv[2];
  
  if (!contractAddress) {
    console.error("❌ Please set CONTRACT_ADDRESS environment variable");
    process.exit(1);
  }
  
  console.log("Contract Address:", contractAddress);
  
  // Connect to the deployed contract
  const DACVRegistry = await ethers.getContractFactory("DACVRegistry");
  const dacvRegistry = DACVRegistry.attach(contractAddress);

  // University details
  const universityAddress = process.env.UNIVERSITY_ADDRESS || process.argv[3];
  const universityName = process.env.UNIVERSITY_NAME || process.argv[4] || "AGPIT";
  const universityCountry = process.env.UNIVERSITY_COUNTRY || process.argv[5] || "India";

  if (!universityAddress) {
    console.error("❌ Please set UNIVERSITY_ADDRESS environment variable");
    process.exit(1);
  }

  console.log("Adding university issuer...");
  console.log("University Address:", universityAddress);
  console.log("University Name:", universityName);
  console.log("University Country:", universityCountry);

  try {
    // Add the issuer
    const tx = await dacvRegistry.addIssuer(
      universityAddress,
      universityName,
      universityCountry
    );
    
    await tx.wait();
    console.log("✅ University issuer added successfully!");
    console.log("Transaction hash:", tx.hash);

    // Verify the issuer was added
    const isAuthorized = await dacvRegistry.authorizedIssuers(universityAddress);
    console.log("Is authorized:", isAuthorized);

    const issuerInfo = await dacvRegistry.issuers(universityAddress);
    console.log("Issuer info:", {
      name: issuerInfo.name,
      country: issuerInfo.country,
      isActive: issuerInfo.isActive,
      credentialsIssued: issuerInfo.credentialsIssued.toString()
    });

  } catch (error) {
    console.error("❌ Failed to add issuer:", error.message);
  }
}

main()
  .then(() => {
    console.log("\n🎉 Setup completed!");
    console.log("Next steps:");
    console.log("1. Update frontend/.env with contract address");
    console.log("2. Restart frontend development server");
    console.log("3. Connect MetaMask to Holesky testnet");
    console.log("4. Test the university dashboard");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Setup failed:", error);
    process.exit(1);
  });