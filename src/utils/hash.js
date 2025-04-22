const { keccak256, toUtf8Bytes } = require("ethers");

const generateUserHash = (userId) => {
  return keccak256(toUtf8Bytes(userId));
};

module.exports = {
  generateUserHash,
};
