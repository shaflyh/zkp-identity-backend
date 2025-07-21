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
  batchUpdateRoots: (roots) => merkleZkpContract.batchUpdateRoots(roots),
  addSubAdmin: (subAdminAddress) => merkleZkpContract.addSubAdmin(subAdminAddress),
  removeSubAdmin: (subAdminAddress) => merkleZkpContract.removeSubAdmin(subAdminAddress),
  transferAdmin: (newAdminAddress) => merkleZkpContract.transferAdmin(newAdminAddress),
  revokeVerification: (userAddress, reason) =>
    merkleZkpContract.revokeVerification(userAddress, reason),
  invalidateRoot: (rootHash) => merkleZkpContract.invalidateRoot(rootHash),
  cleanupExpiredRoots: (roots) => merkleZkpContract.cleanupExpiredRoots(roots),

  // User verification
  verifyIdentity: (a, b, c, merkleRoot) => merkleZkpContract.verifyIdentity(a, b, c, merkleRoot),

  // View functions
  isValidRoot: (rootHash) => merkleZkpContract.isValidRoot(rootHash),
  getUserVerificationInfo: (userAddress) => merkleZkpContract.getUserVerificationInfo(userAddress),
  getRootInfo: (rootHash) => merkleZkpContract.getRootInfo(rootHash),
  isSubAdmin: (address) => merkleZkpContract.isSubAdmin(address),

  // Public variables
  currentMerkleRoot: () => merkleZkpContract.currentMerkleRoot(),
  validRoots: (rootHash) => merkleZkpContract.validRoots(rootHash),
  rootTimestamp: (rootHash) => merkleZkpContract.rootTimestamp(rootHash),
  rootNonce: () => merkleZkpContract.rootNonce(),
  admin: () => merkleZkpContract.admin(),
  subAdmins: (address) => merkleZkpContract.subAdmins(address),
  isVerified: (userAddress) => merkleZkpContract.isVerified(userAddress),
  userMerkleRoot: (userAddress) => merkleZkpContract.userMerkleRoot(userAddress),
  verificationTimestamp: (userAddress) => merkleZkpContract.verificationTimestamp(userAddress),

  // Constants
  ROOT_EXPIRY_TIME: () => merkleZkpContract.ROOT_EXPIRY_TIME(),
  MAX_BATCH_SIZE: () => merkleZkpContract.MAX_BATCH_SIZE(),
};
