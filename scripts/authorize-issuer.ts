import { ethers } from "hardhat";

async function main() {
    const contractAddress = "0x3753cfB00dd01D35A36284A909EcBb73a06Fcc7b";
    const newIssuerAddress = "0x19d6f54282377c031e2f19d2e4699c1541de760e";
    const issuerName = "University of Holesky";
    const issuerCountry = "Global";

    const rpcUrl = process.env.HOLESKY_RPC_URL || "https://ethereum-holesky.publicnode.com";

    console.log(`Preparing to authorize ${newIssuerAddress} on contract ${contractAddress}...`);

    // Create provider and signer manually to ensure connection
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const privateKey = process.env.PRIVATE_KEY;

    if (!privateKey) {
        throw new Error("PRIVATE_KEY not found in environment variables");
    }

    const wallet = new ethers.Wallet(privateKey, provider);
    console.log("Executing with account:", wallet.address);

    const artifact = await ethers.getContractFactory("DACVRegistry");
    const contract = new ethers.Contract(contractAddress, artifact.interface, wallet);

    // Check if already authorized
    try {
        const isAuthorized = await contract.authorizedIssuers(newIssuerAddress);
        if (isAuthorized) {
            console.log("User is ALREADY authorized.");
            return;
        }
    } catch (e) {
        console.log("Error checking authorization (might be network):", e.message);
    }

    console.log("User is NOT authorized. Sending transaction to add issuer...");

    try {
        // Manual gas settings to avoid estimation errors
        const tx = await contract.addIssuer(newIssuerAddress, issuerName, issuerCountry, {
            gasLimit: 200000
        });
        console.log("Transaction sent:", tx.hash);

        console.log("Waiting for confirmation...");
        await tx.wait();

        console.log("✅ Success! User has been authorized.");
    } catch (error) {
        console.error("❌ Transaction failed:", error);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
