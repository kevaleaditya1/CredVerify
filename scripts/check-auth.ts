import { ethers } from "hardhat";

async function main() {
    const contractAddress = "0x3753cfB00dd01D35A36284A909EcBb73a06Fcc7b";
    const userAddress = "0x19d6f54282377c031e2f19d2e4699c1541de760e";

    console.log(`Checking authorization for ${userAddress} on contract ${contractAddress}...`);

    try {
        const contract = await ethers.getContractAt("DACVRegistry", contractAddress);

        // Check if contract exists
        const code = await ethers.provider.getCode(contractAddress);
        if (code === "0x") {
            console.error("Error: Contract does not exist at this address on the current network.");
            return;
        }
        console.log("Contract exists at address.");

        const isAuthorized = await contract.authorizedIssuers(userAddress);
        console.log(`Is Authorized: ${isAuthorized}`);

        if (isAuthorized) {
            const issuerInfo = await contract.issuers(userAddress);
            console.log("Issuer Info:", issuerInfo);
        } else {
            console.log("User is NOT authorized.");
        }
    } catch (error) {
        console.error("Error checking status:", error);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
