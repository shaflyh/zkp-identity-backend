# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Start/Run:**
- `npm run dev` - Start with hot reload using nodemon (development)
- `npm start` - Start production server
- `node index.js` - Direct start

**Testing:**
- `npm test` - Run all tests with Jest
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report

**Docker:**
- `docker compose up --build` - Start with Docker Compose
- `docker compose up -d --build` - Start in background
- `docker compose down` - Stop containers
- `docker compose logs -f` - View logs

## Architecture Overview

This is a Zero Knowledge Proof (ZKP) identity verification backend that uses Merkle trees for on-chain identity management. The system operates on Polygon network.

### Core Components

**Entry Point:** `index.js` - Express server running on port 3002

**API Structure:**
- Main routes: `/api/merkle-zkp/*` (currently active)
- Legacy routes: `/src/routes/zkpRoutes.js` (commented out)

**Layer Architecture:**
```
Routes → Controllers → Services → Contracts/Models
```

**Key Services:**
- `MerkleZKPService` - Core Merkle tree operations and ZKP proof generation
- `merkleZkpContract.js` - Smart contract interactions via ethers.js

**Data Flow:**
1. User submits identity data (NIK, nama, TTL) via `/submit-hash`
2. System generates identity hash and salt (raw data NOT stored)
3. Admin approves via `/approve` - adds to Merkle tree
4. User proves identity via `/verify` with ZKP proof
5. On-chain verification against Merkle root

### ZKP Implementation

**Proof Systems:**
- `IdentityMerkleProof` - Merkle tree membership proof
- `IdentityPossessionProof` - Identity possession proof
- Uses SnarkJS and Circom circuits

**Key Files:**
- `proof/` - Contains .zkey files and WASM circuits
- `scripts/zkp-merkle-proof.js` - Proof generation logic
- `src/utils/hash.js` - Poseidon hashing utilities

### Environment Configuration

Required `.env` variables (see `.env.example`):
- `POLYGON_MAINNET_RPC_URL` or `POLYGON_AMOY_RPC_URL`
- `PRIVATE_KEY` - Deployer wallet private key
- `MERKLE_ZKP_CONTRACT_ADDRESS` - Deployed contract address
- `PORT` - Server port (default: 3002)

### Data Storage

**Models:**
- `userMerkleModel.js` - Manages user state (pending/approved/verified)
- Storage in `data/` directory (JSON files for development)

**Security Note:** Raw identity data (NIK, nama, TTL) is never persisted - only hashes are stored.

### Testing Setup

Jest configuration includes:
- Node.js test environment
- Global setup in `jest.setup.js`
- Coverage reporting for `src/**/*.js`
- Mock environment variables for testing

### Docker Configuration

- `Dockerfile` for containerization
- `compose.yaml` for Docker Compose setup
- `nodemon.json` configures file watching for development