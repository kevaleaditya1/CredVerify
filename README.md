# Decentralized Academic Credential Verification System (DACV)

A blockchain-based system for issuing, storing, and verifying academic credentials using Ethereum smart contracts and IPFS.

## Features

- **Credential Issuance**: Universities can issue tamper-proof digital credentials
- **Blockchain Verification**: Instant verification through smart contracts
- **IPFS Storage**: Decentralized storage for credential documents
- **Role-Based Access**: Separate interfaces for Universities, Students, and Employers
- **QR Code Support**: Easy verification via QR codes
- **Revocation System**: Ability to revoke compromised or invalid credentials

## Tech Stack

- **Smart Contracts**: Solidity with Hardhat
- **Frontend**: React + Tailwind CSS
- **Storage**: IPFS via NFT.Storage/Pinata
- **Blockchain**: Ethereum Sepolia Testnet
- **Development**: TypeScript, Ethers.js

## Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- MetaMask or compatible wallet
- Sepolia testnet ETH

### Installation

```bash
# Install dependencies
npm install
```
```bash
# Compile smart contracts
npm run compile
```
```bash
# Run tests
npm run test
```
```bash
# Deploy to Sepolia
npm run deploy:sepolia
```
```bash
# Start frontend
npm run dev
```

## Project Structure

```
DACV-1/
├── contracts/          # Smart contracts
├── scripts/           # Deployment scripts
├── test/             # Contract tests
├── frontend/         # React application
├── utils/            # IPFS and utility functions
└── hardhat.config.ts # Hardhat configuration
```

## Usage

1. **University**: Issue credentials to students
2. **Student**: View and share their credentials
3. **Employer**: Verify credential authenticity

## License

[MIT](https://choosealicense.com/licenses/mit/)