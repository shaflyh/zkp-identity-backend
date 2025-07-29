// merkleZkpContract.js
const { ethers } = require("ethers");
require("dotenv").config();

// Import the contract ABI - you'll need to generate this after deployment
const contract = require("./IdentityMerkleZKP.json");
const abi = contract.abi;

const provider = new ethers.JsonRpcProvider(process.env.POLYGON_MAINNET_RPC_URL);
const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const merkleZkpContract = new ethers.Contract(process.env.MERKLE_ZKP_CONTRACT_ADDRESS, abi, signer);

module.exports = {
  // Contract info
  getAddress: () => merkleZkpContract.getAddress(),
  getContractInfo: () => merkleZkpContract.getContractInfo(),

  // Admin functions
  updateMerkleRoot: (newRoot) => merkleZkpContract.updateMerkleRoot(newRoot),
  updateMerkleRootWithIdentities: (newRoot, identityHashes) =>
    merkleZkpContract.updateMerkleRootWithIdentities(newRoot, identityHashes),
  approveIdentity: (identityHash) => merkleZkpContract.approveIdentity(identityHash),
  revokeIdentity: (identityHash) => merkleZkpContract.revokeIdentity(identityHash),
  transferAdmin: (newAdminAddress) => merkleZkpContract.transferAdmin(newAdminAddress),

  // User verification
  verifyIdentity: (a, b, c, identityHash) =>
    merkleZkpContract.verifyIdentity(a, b, c, identityHash),

  // View functions
  isIdentityApproved: (identityHash) => merkleZkpContract.isIdentityApproved(identityHash),
  getIdentityInfo: (identityHash) => merkleZkpContract.getIdentityInfo(identityHash),
  computeIdentityHash: (nik, nama, ttl, key) =>
    merkleZkpContract.computeIdentityHash(nik, nama, ttl, key),

  // Public variables
  currentMerkleRoot: () => merkleZkpContract.currentMerkleRoot(),
  totalApprovedIdentities: () => merkleZkpContract.totalApprovedIdentities(),
  admin: () => merkleZkpContract.admin(),
  approvedIdentities: (identityHash) => merkleZkpContract.approvedIdentities(identityHash),
  identityApprovalBlock: (identityHash) => merkleZkpContract.identityApprovalBlock(identityHash),
};
