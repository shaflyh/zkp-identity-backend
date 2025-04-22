const { generateProof, getPublicSignal } = require("../../scripts/zkp-proof");
const zkpContract = require("../../scripts/zkp-contract");
const { generateUserHash } = require("../utils/hash");

class ZKPService {
  async getContractAddress() {
    return await zkpContract.getAddress();
  }

  async registerUser(userId, nik, nama, ttl, key) {
    const userHash = generateUserHash(userId);
    const publicSignals = await getPublicSignal({ nik, nama, ttl, key });

    const tx = await zkpContract.registerHash(userHash, publicSignals);
    await tx.wait();

    return { userHash, publicSignals };
  }

  async verifyUser(userId, nik, nama, ttl, key) {
    const userHash = generateUserHash(userId);
    const { a, b, c } = await generateProof({ nik, nama, ttl, key });

    const tx = await zkpContract.submitProof(userHash, a, b, c);
    await tx.wait();
  }

  async isRegistered(userId) {
    const userHash = generateUserHash(userId);
    return await zkpContract.isVerified(userHash);
  }

  async isVerified(userId) {
    const userHash = generateUserHash(userId);
    return await zkpContract.isVerified(userHash);
  }
}

module.exports = new ZKPService();
