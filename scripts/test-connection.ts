import { ethers } from "hardhat";

async function main() {
    console.log("Testing network connection...");

    try {
        const [deployer] = await ethers.getSigners();
        console.log("Connected with account:", deployer.address);

        const balance = await deployer.provider.getBalance(deployer.address);
        console.log("Account balance:", ethers.formatEther(balance));

        const network = await deployer.provider.getNetwork();
        console.log("Network:", network.name, "Chain ID:", network.chainId.toString());

    } catch (error) {
        console.error("Connection failed:", error);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
