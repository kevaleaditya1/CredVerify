import { ethers } from "hardhat";

async function main() {
    const contractAddress = process.env.CONTRACT_ADDRESS || process.argv[2];
    const userAddress = process.env.USER_ADDRESS || process.argv[3];

    if (!contractAddress || !userAddress) {
        throw new Error(
            "Missing contract or user address. Set CONTRACT_ADDRESS and USER_ADDRESS, or pass them as CLI args."
        );
    }

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
