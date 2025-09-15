// Simple file-based storage
const fs = require("fs").promises;
const path = require("path");

const DATA_DIR = "./data";
const USERS_FILE = path.join(DATA_DIR, "merkle_users.json");
const TREE_FILE = path.join(DATA_DIR, "merkle_tree.json");

class UserMerkleModel {
  constructor() {
    this.ensureDataDir();
  }

  async ensureDataDir() {
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
    } catch (err) {
      // Directory might already exist
    }
  }

  // User data operations
  async saveUser(userId, userData) {
    const users = await this.getAllUsers();
    users[userId] = userData;
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
  }

  async getUser(userId) {
    const users = await this.getAllUsers();
    return users[userId];
  }

  async getAllUsers() {
    try {
      const data = await fs.readFile(USERS_FILE, "utf8");
      return JSON.parse(data);
    } catch (err) {
      return {};
    }
  }

  async getApprovedUsers() {
    const users = await this.getAllUsers();
    const approved = {};
    for (const [userId, userData] of Object.entries(users)) {
      if (userData.status === "approved" || userData.status === "verified") {
        approved[userId] = userData;
      }
    }
    return approved;
  }

  // Bulk save users (for IPFS restoration)
  async bulkSaveUsers(usersData) {
    try {
      await fs.writeFile(USERS_FILE, JSON.stringify(usersData, null, 2));
      console.log(`Bulk saved ${Object.keys(usersData).length} users from IPFS`);
    } catch (error) {
      console.error("Error bulk saving users:", error);
      throw error;
    }
  }

  // Merkle tree operations
  async saveMerkleTree(treeData) {
    await fs.writeFile(
      TREE_FILE,
      JSON.stringify(
        {
          root: treeData.root,
          leaves: treeData.leaves,
          timestamp: Date.now(),
        },
        null,
        2
      )
    );
  }

  async getMerkleTree() {
    try {
      const data = await fs.readFile(TREE_FILE, "utf8");
      return JSON.parse(data);
    } catch (err) {
      return null;
    }
  }

  // User status checks
  async isSubmitted(userId) {
    const user = await this.getUser(userId);
    return !!user;
  }

  async isApproved(userId) {
    const user = await this.getUser(userId);
    return user && (user.status === "approved" || user.status === "verified");
  }

  async isVerified(userId) {
    const user = await this.getUser(userId);
    return user && user.status === "verified";
  }

  // Clear all data (for testing/reset purposes)
  async clearAllData() {
    try {
      await fs.unlink(USERS_FILE);
      await fs.unlink(TREE_FILE);
      console.log("All local data cleared");
    } catch (error) {
      // Files might not exist, which is fine
      console.log("No local data to clear");
    }
  }

  // Get data stats
  async getDataStats() {
    const users = await this.getAllUsers();
    const tree = await this.getMerkleTree();

    const stats = {
      totalUsers: Object.keys(users).length,
      pendingUsers: Object.values(users).filter((u) => u.status === "pending").length,
      approvedUsers: Object.values(users).filter((u) => u.status === "approved").length,
      verifiedUsers: Object.values(users).filter((u) => u.status === "verified").length,
      hasTreeData: !!tree,
      lastTreeUpdate: tree?.timestamp || null,
    };

    return stats;
  }
}

module.exports = new UserMerkleModel();
