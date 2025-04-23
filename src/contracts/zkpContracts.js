// contract.js
const { ethers } = require("ethers");
require("dotenv").config();

const contract = require("./IdentityZKP.json");
const abi = contract.abi;
const provider = new ethers.JsonRpcProvider(process.env.POLYGON_AMOY_RPC_URL);
const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const identityContract = new ethers.Contract(process.env.IDENTITY_CONTRACT_ADDRESS, abi, signer);

module.exports = {
  getAddress: () => identityContract.getAddress(),
  submitHashByUser: (user, hash) => identityContract.submitHashByUser(user, hash),
  approveIdentity: (user) => identityContract.approveIdentity(user),
  submitProof: (user, a, b, c) => identityContract.submitProof(user, a, b, c),
  isVerified: (user) => identityContract.isVerified(user),
  isApproved: (user) => identityContract.isApproved(user),
  hasSubmitted: (user) => identityContract.hasSubmitted(user),
};
