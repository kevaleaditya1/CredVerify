const { ethers } = require("hardhat");

async function main() {
  const contractAddress = process.env.CONTRACT_ADDRESS;
  if (!contractAddress) {
    console.error("Please set CONTRACT_ADDRESS environment variable");
    console.log("Usage: CONTRACT_ADDRESS=0x... npx hardhat run scripts/list-issuers.js --network <network>");
    process.exit(1);
  }

  console.log("Contract:", contractAddress);

  const DACVRegistry = await ethers.getContractFactory("DACVRegistry");
  const dacv = DACVRegistry.attach(contractAddress);

  // Fetch IssuerAdded and IssuerRemoved events
  console.log("Querying events (may take a moment)...");
  const added = await dacv.queryFilter(dacv.filters.IssuerAdded());
  const removed = await dacv.queryFilter(dacv.filters.IssuerRemoved());

  const addedAddresses = added.map(e => e.args[0].toLowerCase());
  const removedAddresses = removed.map(e => e.args[0].toLowerCase());

  // Unique candidate addresses from events
  const candidates = Array.from(new Set([...addedAddresses, ...removedAddresses]));

  if (candidates.length === 0) {
    console.log("No issuer events found in the contract logs.");
    process.exit(0);
  }

  console.log(`Found ${candidates.length} unique candidate addresses from events.`);

  // Check current authorization for each candidate
  for (const addr of candidates) {
    try {
      const isAuth = await dacv.authorizedIssuers(addr);
      const info = await dacv.issuers(addr);
      console.log("---------------------------");
      console.log("Address:", addr);
      console.log("Authorized:", isAuth);
      console.log("Name:", info.name || "(empty)");
      console.log("Country:", info.country || "(empty)");
      console.log("Active:", info.isActive);
      console.log("RegistrationDate:", info.registrationDate.toString());
      console.log("CredentialsIssued:", info.credentialsIssued.toString());
    } catch (err) {
      console.error("Error reading issuer info for", addr, err.message || err);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
