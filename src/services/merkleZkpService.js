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
    console.log("submitUserData", userId);

    // Generate user hash for internal tracking
    const userHash = generateUserHash(userId);
    console.log("userHash", userHash);

    // Generate salt for this user (stored for later use)
    const salt = crypto.randomBytes(16).toString("hex");
    const saltBigInt = BigInt("0x" + salt);
    console.log("saltBigInt", saltBigInt);

    // Calculate identity hash - this is what we'll store
    const { identityHash } = await this.calculateIdentityHash(nik, nama, ttl, key);
    console.log("identityHash", identityHash);

    // Store ONLY the hash and metadata - NOT the raw data
    const userData = {
      userId,
      userHash,
      identityHash: identityHash.toString(), // Only store the hash
      salt: saltBigInt.toString(),
      status: "pending",
      submittedAt: Date.now(),
      // NOT storing: nik, nama, ttl, key
    };

    await userMerkleModel.saveUser(userId, userData);

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

    // if (userData.status === "approved" || userData.status === "verified") {
    //   throw new Error("User already approved");
    // }

    // Mark as approved first
    userData.status = "approved";
    userData.approvedAt = Date.now();

    // Save the approved status
    await userMerkleModel.saveUser(userId, userData);

    // Rebuild Merkle tree with all approved users
    const { merkleTree, newRoot, leafIndex, identityHashes } = await this.rebuildMerkleTree(userId);
    console.log("newRoot", newRoot);
    console.log("leafIndex", leafIndex);

    // Store the leaf index for this user
    userData.leafIndex = leafIndex;
    await userMerkleModel.saveUser(userId, userData);

    // Update Merkle root and identity statuses on-chain
    const rootBytes32 = "0x" + BigInt(newRoot).toString(16).padStart(64, "0");
    console.log("rootBytes32", rootBytes32);

    // Convert identity hashes to bytes32 format
    const identityHashesBytes32 = identityHashes.map(
      (hash) => "0x" + BigInt(hash).toString(16).padStart(64, "0")
    );

    // Use the new contract function that updates both root and identity statuses
    const tx = await merkleZkpContract.updateMerkleRootWithIdentities(
      rootBytes32,
      identityHashesBytes32
    );
    await tx.wait();

    return {
      userHash: userData.userHash,
      identityHash: userData.identityHash,
      newMerkleRoot: newRoot,
      leafIndex: leafIndex,
      totalApprovedUsers: Object.keys(await userMerkleModel.getApprovedUsers()).length,
    };
  }

  async rebuildMerkleTree(targetUserId = null) {
    // Get all approved users from database
    const approvedUsers = await userMerkleModel.getApprovedUsers();
    const approvedUsersList = Object.values(approvedUsers);

    // Build leaves array using ONLY identity hashes
    const leavesData = [];
    const identityHashes = [];
    let targetLeafIndex = -1;

    for (let i = 0; i < approvedUsersList.length; i++) {
      const user = approvedUsersList[i];

      // Create leaf data from stored hash
      const leafData = {
        identityHash: user.identityHash,
        salt: user.salt,
      };
      leavesData.push(leafData);
      identityHashes.push(user.identityHash);

      // Track the index of the target user
      if (targetUserId && user.userId === targetUserId) {
        targetLeafIndex = i;
      }
    }

    // Build new Merkle tree from identity hashes
    const { tree, root, leaves } = await buildMerkleTreeFromHashes(leavesData);
    currentMerkleTree = tree;

    // Save tree data
    await userMerkleModel.saveMerkleTree({ root, leaves });

    return {
      merkleTree: tree,
      newRoot: root,
      leafIndex: targetLeafIndex >= 0 ? targetLeafIndex : approvedUsersList.length - 1,
      identityHashes,
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

    // Verify that the provided data matches the stored identity hash
    const { identityHash } = await this.calculateIdentityHash(nik, nama, ttl, key);
    if (identityHash.toString() !== userData.identityHash) {
      throw new Error("Identity data mismatch");
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

    // Generate Merkle proof using the provided raw data
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

    // Convert identity hash to bytes32 for event tracking
    const identityHashBytes32 = "0x" + BigInt(userData.identityHash).toString(16).padStart(64, "0");

    // Submit proof to contract with identity hash for event
    const tx = await merkleZkpContract.verifyIdentity(
      proof.a,
      proof.b,
      proof.c,
      identityHashBytes32
    );

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
    const userData = await userMerkleModel.getUser(userId);
    if (!userData) return false;
    return userData.status === "verified";
  }

  async isApproved(userId) {
    const userData = await userMerkleModel.getUser(userId);
    if (!userData) return false;

    // Also check on-chain if identity is approved
    if (userData.identityHash) {
      const identityHashBytes32 =
        "0x" + BigInt(userData.identityHash).toString(16).padStart(64, "0");
      const onChainApproved = await merkleZkpContract.isIdentityApproved(identityHashBytes32);
      return onChainApproved || userData.status === "approved" || userData.status === "verified";
    }

    return userData.status === "approved" || userData.status === "verified";
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
      totalApprovedOnChain: contractInfo.totalIdentities.toString(),
      treeHeight: 16,
      maxUsers: 65536,
      contractInfo: {
        merkleRoot: contractInfo.merkleRoot,
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
      currentRoot: contractInfo.merkleRoot,
      totalIdentities: contractInfo.totalIdentities.toString(),
      admin: contractInfo.contractAdmin,
    };
  }

  async getPendingUsers() {
    const allUsers = await userMerkleModel.getAllUsers();
    const pendingUsers = [];

    for (const [userId, userData] of Object.entries(allUsers)) {
      if (userData.status === "pending") {
        // Don't expose raw data that we no longer store
        pendingUsers.push({
          userId: userData.userId,
          identityHash: userData.identityHash,
          submittedAt: userData.submittedAt,
          status: userData.status,
        });
      }
    }

    return pendingUsers;
  }

  async getCurrentRoot() {
    const root = await merkleZkpContract.currentMerkleRoot();
    return root.toString();
  }

  async rebuildAndUpdateTree() {
    // Rebuild tree with all approved users and update on-chain
    const { merkleTree, newRoot, identityHashes } = await this.rebuildMerkleTree();

    // Convert to bytes32 format
    const rootBytes32 = "0x" + BigInt(newRoot).toString(16).padStart(64, "0");
    const identityHashesBytes32 = identityHashes.map(
      (hash) => "0x" + BigInt(hash).toString(16).padStart(64, "0")
    );

    const tx = await merkleZkpContract.updateMerkleRootWithIdentities(
      rootBytes32,
      identityHashesBytes32
    );
    await tx.wait();

    const approvedUsers = await userMerkleModel.getApprovedUsers();

    return {
      newRoot,
      totalUsers: Object.keys(approvedUsers).length,
      transactionHash: tx.hash,
    };
  }

  // Check identity approval on-chain
  async checkIdentityApproval(nik, nama, ttl, key) {
    const { identityHash } = await this.calculateIdentityHash(nik, nama, ttl, key);
    const identityHashBytes32 = "0x" + BigInt(identityHash).toString(16).padStart(64, "0");
    return await merkleZkpContract.isIdentityApproved(identityHashBytes32);
  }
}

// Helper function to build Merkle tree from identity hashes
async function buildMerkleTreeFromHashes(leavesData) {
  // Pass the leavesData directly to buildMerkleTree since it already contains
  // the correct structure with identityHash and salt properties
  return await buildMerkleTree(leavesData);
}

module.exports = new MerkleZKPService();
