const { generateProof, getPublicSignal } = require("../../scripts/zkp-proof");
const zkpContract = require("../contracts/zkpContracts");
const { generateUserHash } = require("../utils/hash");

class ZKPService {
  async getContractAddress() {
    return await zkpContract.getAddress();
  }

  async submitUserHash(userId, nik, nama, ttl, key) {
    const userHash = generateUserHash(userId);
    const publicSignal = await getPublicSignal({ nik, nama, ttl, key });

    const tx = await zkpContract.submitHashByUser(userHash, publicSignal);
    await tx.wait();

    return { userHash, publicSignal };
  }

  async approveUserHash(userId) {
    const userHash = generateUserHash(userId);
    const tx = await zkpContract.approveIdentity(userHash);
    await tx.wait();
    return userHash;
  }

  async verifyUser(userId, nik, nama, ttl, key) {
    const userHash = generateUserHash(userId);
    const { a, b, c } = await generateProof({ nik, nama, ttl, key });

    const tx = await zkpContract.submitProof(userHash, a, b, c);
    await tx.wait();
  }

  async isVerified(userId) {
    const userHash = generateUserHash(userId);
    return await zkpContract.isVerified(userHash);
  }

  async isApproved(userId) {
    const userHash = generateUserHash(userId);
    return await zkpContract.isApproved(userHash);
  }

  async hasSubmitted(userId) {
    const userHash = generateUserHash(userId);
    return await zkpContract.hasSubmitted(userHash);
  }
}

module.exports = new ZKPService();
