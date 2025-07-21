const { generateMerkleProof, buildMerkleTree } = require("../../scripts/zkp-merkle-proof");
const merkleZkpContract = require("../contracts/merkleZkpContract");
const { generateUserHash } = require("../utils/hash");
const userMerkleModel = require("../models/userMerkleModel");
const crypto = require("crypto");

let currentMerkleTree = null;

class MerkleZKPService {
  constructor() {
    // Initialize with empty Merkle tree
    this.initializeMerkleTree();
  }

  async initializeMerkleTree() {
    // Create an empty tree or load from database
    const { tree } = await buildMerkleTree([]);
    currentMerkleTree = tree;
  }

  async getContractAddress() {
    return await merkleZkpContract.getAddress();
  }

  async submitUserData(userId, nik, nama, ttl, key) {
    console.log("submitUserData", userId, nik, nama, ttl, key);

    // Generate user hash for internal tracking
    const userHash = generateUserHash(userId);
    console.log("userHash", userHash);

    // Generate salt for this user (stored for later use)
    const salt = crypto.randomBytes(16).toString("hex");
    const saltBigInt = BigInt("0x" + salt);
    console.log("saltBigInt", saltBigInt);

    // Store user data for later Merkle tree construction
    const userData = {
      userId,
      userHash,
      nik,
      nama,
      ttl,
      key,
      salt: saltBigInt.toString(),
      status: "pending",
      submittedAt: Date.now(),
    };

    await userMerkleModel.saveUser(userId, userData);

    // Calculate identity hash for return
    const { identityHash } = await this.calculateIdentityHash(nik, nama, ttl, key);
    console.log("identityHash", identityHash);

    return {
      userHash,
      identityHash: identityHash.toString(),
      status: "pending",
    };
  }

  async approveUser(userId) {
    const userData = await userMerkleModel.getUser(userId);
    console.log("userData", userData);
    if (!userData) {
      throw new Error("User data not found");
    }

    if (userData.status === "approved" || userData.status === "verified") {
      throw new Error("User already approved");
    }

    // Mark as approved first
    userData.status = "approved";
    userData.approvedAt = Date.now();

    // Save the approved status
    await userMerkleModel.saveUser(userId, userData);

    // Rebuild Merkle tree with all approved users
    const { merkleTree, newRoot, leafIndex } = await this.rebuildMerkleTree(userId);
    console.log("newRoot", newRoot);
    console.log("leafIndex", leafIndex);

    // Store the leaf index for this user
    userData.leafIndex = leafIndex;
    await userMerkleModel.saveUser(userId, userData);

    // Update Merkle root on-chain
    // Convert the root to bytes32 format
    const rootBytes32 = "0x" + BigInt(newRoot).toString(16).padStart(64, "0");
    console.log("rootBytes32", rootBytes32);

    const tx = await merkleZkpContract.updateMerkleRoot(rootBytes32);
    await tx.wait();

    return {
      userHash: userData.userHash,
      newMerkleRoot: newRoot,
      leafIndex: leafIndex,
      totalApprovedUsers: Object.keys(await userMerkleModel.getApprovedUsers()).length,
    };
  }

  async rebuildMerkleTree(targetUserId = null) {
    // Get all approved users from database
    const approvedUsers = await userMerkleModel.getApprovedUsers();
    const approvedUsersList = Object.values(approvedUsers);

    // Build leaves array with all approved users
    const leavesData = [];
    let targetLeafIndex = -1;

    for (let i = 0; i < approvedUsersList.length; i++) {
      const user = approvedUsersList[i];
      const leafData = {
        nik: user.nik,
        nama: user.nama,
        ttl: user.ttl,
        key: user.key,
        salt: user.salt,
      };
      leavesData.push(leafData);

      // Track the index of the target user
      if (targetUserId && user.userId === targetUserId) {
        targetLeafIndex = i;
      }
    }

    // Build new Merkle tree
    const { tree, root, leaves } = await buildMerkleTree(leavesData);
    currentMerkleTree = tree; // Store only the tree instance, not the whole object

    // Save tree data
    await userMerkleModel.saveMerkleTree({ root, leaves });

    return {
      merkleTree: tree,
      newRoot: root,
      leafIndex: targetLeafIndex >= 0 ? targetLeafIndex : approvedUsersList.length - 1,
    };
  }

  async verifyUser(userId, nik, nama, ttl, key) {
    const userData = await userMerkleModel.getUser(userId);
    if (!userData) {
      throw new Error("User data not found");
    }

    if (userData.status !== "approved" && userData.status !== "verified") {
      throw new Error("User not approved yet");
    }

    // If tree not in memory, rebuild it
    if (!currentMerkleTree || !currentMerkleTree.leaves || currentMerkleTree.leaves.length === 0) {
      console.log("Rebuilding Merkle tree...");
      const rebuilt = await this.rebuildMerkleTree();
      currentMerkleTree = rebuilt.merkleTree;
    }

    // Get current merkle root from contract
    const currentRoot = await merkleZkpContract.currentMerkleRoot();
    console.log("Contract current root:", currentRoot);

    // Generate Merkle proof
    const { proof, publicSignals } = await generateMerkleProof({
      nik,
      nama,
      ttl,
      key,
      salt: userData.salt,
      leafIndex: userData.leafIndex,
      merkleTree: currentMerkleTree,
    });

    console.log("Generated proof public signal:", publicSignals[0]);

    // Convert both to BigInt for comparison
    const contractRootBigInt = BigInt(currentRoot);
    const proofRootBigInt = BigInt(publicSignals[0]);

    // Verify the root matches
    if (contractRootBigInt !== proofRootBigInt) {
      console.error("Root mismatch:");
      console.error("Contract root (hex):", currentRoot);
      console.error("Contract root (dec):", contractRootBigInt.toString());
      console.error("Proof root (dec):", proofRootBigInt.toString());
      throw new Error("Merkle root mismatch - tree may be outdated");
    }

    // Submit proof to contract
    // Convert the root to bytes32 format if needed
    const rootBytes32 = currentRoot.startsWith("0x")
      ? currentRoot
      : "0x" + BigInt(currentRoot).toString(16).padStart(64, "0");

    const tx = await merkleZkpContract.verifyIdentity(proof.a, proof.b, proof.c, rootBytes32);

    const receipt = await tx.wait();

    // Update user status
    userData.status = "verified";
    userData.verifiedAt = Date.now();
    userData.verificationTx = receipt.hash;

    await userMerkleModel.saveUser(userId, userData);

    return {
      transactionHash: receipt.hash,
      merkleRoot: currentRoot.toString(),
    };
  }

  async isVerified(userId) {
    // Check local status
    const userData = await userMerkleModel.getUser(userId);
    if (!userData) return false;

    // For production, you'd map userId to wallet address and check:
    // return await merkleZkpContract.isVerified(userWalletAddress);

    return userData.status === "verified";
  }

  async isApproved(userId) {
    return await userMerkleModel.isApproved(userId);
  }

  async hasSubmitted(userId) {
    return await userMerkleModel.isSubmitted(userId);
  }

  async getMerkleTreeInfo() {
    const currentRoot = await merkleZkpContract.currentMerkleRoot();
    const contractInfo = await merkleZkpContract.getContractInfo();
    const allUsers = await userMerkleModel.getAllUsers();
    const approvedUsers = await userMerkleModel.getApprovedUsers();

    return {
      currentRoot: currentRoot.toString(),
      totalApprovedUsers: Object.keys(approvedUsers).length,
      totalSubmittedUsers: Object.keys(allUsers).length,
      treeHeight: 16,
      maxUsers: 65536,
      contractInfo: {
        rootNonce: contractInfo.totalRootUpdates.toString(),
        admin: contractInfo.contractAdmin,
      },
    };
  }

  async calculateIdentityHash(nik, nama, ttl, key) {
    // This is used internally - matches the circuit logic
    const poseidon = await require("circomlibjs").buildPoseidon();

    const namaHex = Buffer.from(nama, "utf8").toString("hex");
    const namaBigInt = BigInt("0x" + namaHex);
    const keyHex = Buffer.from(key, "utf8").toString("hex");
    const keyBigInt = BigInt("0x" + keyHex);

    const inputArray = [BigInt(nik), namaBigInt, BigInt(ttl), keyBigInt];
    const identityHash = poseidon.F.toObject(poseidon(inputArray));

    return { identityHash, namaBigInt, keyBigInt };
  }

  // Additional helper methods
  async getContractInfo() {
    const contractInfo = await merkleZkpContract.getContractInfo();
    return {
      currentRoot: contractInfo.currentRoot,
      rootNonce: contractInfo.totalRootUpdates.toString(),
      admin: contractInfo.contractAdmin,
    };
  }

  async getPendingUsers() {
    const allUsers = await userMerkleModel.getAllUsers();
    const pendingUsers = [];

    for (const [userId, userData] of Object.entries(allUsers)) {
      if (userData.status === "pending") {
        pendingUsers.push(userData);
      }
    }

    return pendingUsers;
  }

  async getCurrentRoot() {
    const root = await merkleZkpContract.currentMerkleRoot();
    return root.toString();
  }

  async isValidRoot(rootHash) {
    return await merkleZkpContract.isValidRoot(rootHash);
  }

  async rebuildAndUpdateTree() {
    // Rebuild tree with all approved users and update on-chain
    const { merkleTree, newRoot } = await this.rebuildMerkleTree();

    // Convert the root to bytes32 format
    const rootBytes32 = "0x" + BigInt(newRoot).toString(16).padStart(64, "0");
    const tx = await merkleZkpContract.updateMerkleRoot(rootBytes32);
    await tx.wait();

    const approvedUsers = await userMerkleModel.getApprovedUsers();

    return {
      newRoot,
      totalUsers: Object.keys(approvedUsers).length,
      transactionHash: tx.hash,
    };
  }

  async isUserVerified(address) {
    return await merkleZkpContract.isVerified(address);
  }

  async getUserVerificationInfo(address) {
    const info = await merkleZkpContract.getUserVerificationInfo(address);
    return {
      verified: info.verified,
      merkleRoot: info.merkleRoot,
      timestamp: info.timestamp.toString(),
    };
  }
}

module.exports = new MerkleZKPService();
