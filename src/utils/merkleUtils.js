const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");
const { getPublicSignal } = require("../../scripts/zkp-merkle-proof");

class MerkleTreeUtils {
  /**
   * Build Merkle tree from user data
   * @param {Array} users Array of user objects with {userId, nik, nama, ttl, key}
   * @returns {Object} Tree data including tree instance, root, and leaf mapping
   */
  static async buildTreeFromUsers(users) {
    if (!users || users.length === 0) {
      throw new Error("No users provided to build tree");
    }

    const leaves = [];
    const userLeafMap = new Map();

    // Generate leaves from user public signals
    for (const user of users) {
      const publicSignal = await getPublicSignal({
        nik: user.nik,
        nama: user.nama,
        ttl: user.ttl,
        key: user.key,
      });

      const leaf = keccak256(Buffer.from(publicSignal.toString()));
      leaves.push(leaf);
      userLeafMap.set(user.userId, {
        leaf: leaf,
        publicSignal: publicSignal,
        userData: user,
      });
    }

    // Build Merkle tree
    const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
    const root = tree.getHexRoot();

    return {
      tree,
      root,
      leaves,
      userLeafMap,
      leafCount: leaves.length,
    };
  }

  /**
   * Generate Merkle proof for a specific user
   * @param {MerkleTree} tree Merkle tree instance
   * @param {Buffer} leaf User's leaf hash
   * @returns {Object} Proof data
   */
  static generateProof(tree, leaf) {
    const proof = tree.getHexProof(leaf);
    const root = tree.getHexRoot();
    const isValid = tree.verify(proof, leaf, root);

    return {
      proof,
      root,
      leaf: leaf.toString("hex"),
      isValid,
    };
  }

  /**
   * Verify Merkle proof
   * @param {Array} proof Merkle proof array
   * @param {Buffer} leaf Leaf to verify
   * @param {string} root Root hash
   * @returns {boolean} True if proof is valid
   */
  static verifyProof(proof, leaf, root) {
    return MerkleTree.verify(proof, leaf, root, keccak256);
  }

  /**
   * Generate leaf hash from user data
   * @param {Object} userData User data {nik, nama, ttl, key}
   * @returns {Buffer} Leaf hash
   */
  static async generateLeaf(userData) {
    const publicSignal = await getPublicSignal(userData);
    return keccak256(Buffer.from(publicSignal.toString()));
  }

  /**
   * Build incremental tree (add users to existing tree)
   * @param {MerkleTree} existingTree Existing tree
   * @param {Array} newUsers New users to add
   * @returns {Object} Updated tree data
   */
  static async buildIncrementalTree(existingTree, newUsers) {
    const existingLeaves = existingTree ? existingTree.getLeaves() : [];

    // Generate new leaves
    const newLeaves = [];
    const userLeafMap = new Map();

    for (const user of newUsers) {
      const publicSignal = await getPublicSignal({
        nik: user.nik,
        nama: user.nama,
        ttl: user.ttl,
        key: user.key,
      });

      const leaf = keccak256(Buffer.from(publicSignal.toString()));
      newLeaves.push(leaf);
      userLeafMap.set(user.userId, {
        leaf: leaf,
        publicSignal: publicSignal,
        userData: user,
      });
    }

    // Combine existing and new leaves
    const allLeaves = [...existingLeaves, ...newLeaves];

    // Build new tree
    const tree = new MerkleTree(allLeaves, keccak256, { sortPairs: true });
    const root = tree.getHexRoot();

    return {
      tree,
      root,
      leaves: allLeaves,
      userLeafMap,
      leafCount: allLeaves.length,
      newLeavesCount: newLeaves.length,
    };
  }

  /**
   * Convert tree to JSON for storage
   * @param {MerkleTree} tree Merkle tree instance
   * @param {Map} userLeafMap User to leaf mapping
   * @returns {Object} Serializable tree data
   */
  static serializeTree(tree, userLeafMap) {
    return {
      root: tree.getHexRoot(),
      leaves: tree.getLeaves().map((leaf) => leaf.toString("hex")),
      depth: tree.getDepth(),
      leafCount: tree.getLeafCount(),
      userMappings: Array.from(userLeafMap.entries()).map(([userId, data]) => ({
        userId,
        leaf: data.leaf.toString("hex"),
        publicSignal: data.publicSignal,
        userData: data.userData,
      })),
    };
  }

  /**
   * Restore tree from JSON data
   * @param {Object} treeData Serialized tree data
   * @returns {Object} Restored tree and mappings
   */
  static deserializeTree(treeData) {
    const leaves = treeData.leaves.map((leafHex) => Buffer.from(leafHex, "hex"));
    const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });

    const userLeafMap = new Map();
    treeData.userMappings.forEach((mapping) => {
      userLeafMap.set(mapping.userId, {
        leaf: Buffer.from(mapping.leaf, "hex"),
        publicSignal: mapping.publicSignal,
        userData: mapping.userData,
      });
    });

    return {
      tree,
      userLeafMap,
      root: tree.getHexRoot(),
    };
  }

  /**
   * Find user in tree by userId
   * @param {Map} userLeafMap User to leaf mapping
   * @param {string} userId User ID to find
   * @returns {Object|null} User data or null if not found
   */
  static findUserInTree(userLeafMap, userId) {
    return userLeafMap.get(userId) || null;
  }

  /**
   * Validate tree integrity
   * @param {MerkleTree} tree Merkle tree instance
   * @param {Map} userLeafMap User to leaf mapping
   * @returns {Object} Validation results
   */
  static validateTree(tree, userLeafMap) {
    const treeLeaves = tree.getLeaves();
    const mappedLeaves = Array.from(userLeafMap.values()).map((data) => data.leaf);

    // Check if all mapped leaves are in tree
    const allMappedInTree = mappedLeaves.every((leaf) =>
      treeLeaves.some((treeLeaf) => treeLeaf.equals(leaf))
    );

    // Check if tree has extra leaves
    const hasExtraLeaves = treeLeaves.length > mappedLeaves.length;

    return {
      isValid: allMappedInTree && !hasExtraLeaves,
      treeLeafCount: treeLeaves.length,
      mappedLeafCount: mappedLeaves.length,
      allMappedInTree,
      hasExtraLeaves,
    };
  }

  /**
   * Get tree statistics
   * @param {MerkleTree} tree Merkle tree instance
   * @returns {Object} Tree statistics
   */
  static getTreeStats(tree) {
    return {
      root: tree.getHexRoot(),
      leafCount: tree.getLeafCount(),
      depth: tree.getDepth(),
      layers: tree.getLayers().length,
    };
  }

  /**
   * Batch verify multiple proofs
   * @param {Array} proofData Array of {proof, leaf, root} objects
   * @returns {Array} Array of boolean results
   */
  static batchVerifyProofs(proofData) {
    return proofData.map(({ proof, leaf, root }) => this.verifyProof(proof, leaf, root));
  }
}

module.exports = MerkleTreeUtils;
