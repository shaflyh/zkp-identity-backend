// contract.js
const { ethers } = require("ethers");
require("dotenv").config();

const contract = require("../contracts/IdentityZKP.json");
const abi = contract.abi;
const provider = new ethers.JsonRpcProvider(process.env.POLYGON_AMOY_RPC_URL);
const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const identityContract = new ethers.Contract(process.env.IDENTITY_CONTRACT_ADDRESS, abi, signer);

module.exports = {
  getAddress: () => identityContract.getAddress(),
  isVerified: (userHash) => identityContract.isVerified(userHash),
  isRegistered: (userHash) => identityContract.isRegistered(userHash),
  registerHash: (userHash, hash) => identityContract.registerHash(userHash, hash),
  submitProof: (userHash, a, b, c) => identityContract.submitProof(userHash, a, b, c),
};
