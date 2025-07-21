// Simple file-based storage for demo
// In production, use MongoDB, PostgreSQL, etc.
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
}

module.exports = new UserMerkleModel();
