import { ethers, artifacts } from "hardhat";

async function main() {
    console.log("Starting debug script...");

    try {
        const contractAddress = process.env.CONTRACT_ADDRESS || process.argv[2];
        const userAddress = process.env.USER_ADDRESS || process.argv[3];

        if (!contractAddress || !userAddress) {
            throw new Error(
                "Missing contract or user address. Set CONTRACT_ADDRESS and USER_ADDRESS, or pass them as CLI args."
            );
        }
        const rpcUrl = process.env.HOLESKY_RPC_URL || "https://ethereum-holesky.publicnode.com";

        console.log("Reading artifact...");
        const artifact = await artifacts.readArtifact("DACVRegistry");
        console.log(`Artifact found. ABI length: ${artifact.abi.length}`);

        console.log(`Creating provider with ${rpcUrl}...`);
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const network = await provider.getNetwork();
        console.log(`Connected to network: ${network.name} (${network.chainId})`);

        console.log(`Checking authorization for ${userAddress} on contract ${contractAddress}...`);

        const contract = new ethers.Contract(contractAddress, artifact.abi, provider);

        // Check if contract exists
        const code = await provider.getCode(contractAddress);
        console.log(`Code at address: ${code.slice(0, 20)}...`);

        if (code === "0x") {
            console.error("Error: Contract does not exist at this address on the current network.");
            return;
        }

        const isAuthorized = await contract.authorizedIssuers(userAddress);
        console.log(`Is Authorized: ${isAuthorized}`);

    } catch (error) {
        console.error("Error in main:", error);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
