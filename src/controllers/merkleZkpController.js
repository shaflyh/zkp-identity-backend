const merkleZkpService = require("../services/merkleZkpService");

class MerkleZKPController {
  async getStatus(req, res) {
    try {
      const contractAddress = await merkleZkpService.getContractAddress();
      const merkleInfo = await merkleZkpService.getMerkleTreeInfo();
      res.json({
        status: "ZKP Merkle backend is running",
        contractAddress,
        currentMerkleRoot: merkleInfo.currentRoot,
        totalApprovedOnChain: merkleInfo.totalApprovedOnChain,
      });
    } catch (e) {
      res.status(500).json({ error: "Contract failed to load.", message: e.message });
    }
  }

  async submitHash(req, res) {
    try {
      const { userId, nik, nama, ttl, key } = req.body;
      if (!userId || !nik || !nama || !ttl || !key) {
        return res.status(400).json({ error: "Missing required fields." });
      }

      // Store only identity hash, not raw data
      const result = await merkleZkpService.submitUserData(userId, nik, nama, ttl, key);

      return res.json({
        success: true,
        message: "Identity hash submitted and pending approval.",
        userId,
        identityHash: result.identityHash,
      });
    } catch (err) {
      console.error("Submit hash error:", err);
      res.status(500).json({ error: "Failed to submit data", message: err.message });
    }
  }

  async approveHash(req, res) {
    try {
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ error: "Missing userId" });

      // This will add user to approved list, update Merkle tree, and update on-chain status
      const result = await merkleZkpService.approveUser(userId);

      return res.json({
        success: true,
        message: "User approved, added to Merkle tree, and registered on-chain.",
        userId,
        identityHash: result.identityHash,
        newMerkleRoot: result.newMerkleRoot,
        leafIndex: result.leafIndex,
      });
    } catch (err) {
      console.error("Approval error:", err);
      return res.status(500).json({ error: "Failed to approve user", message: err.message });
    }
  }

  async verify(req, res) {
    try {
      const { userId, nik, nama, ttl, key } = req.body;
      if (!userId || !nik || !nama || !ttl || !key) {
        return res.status(400).json({ error: "Missing required fields." });
      }

      // Generate Merkle proof and submit to contract
      const result = await merkleZkpService.verifyUser(userId, nik, nama, ttl, key);

      return res.json({
        success: true,
        message: "Identity verified on-chain with Merkle proof.",
        transactionHash: result.transactionHash,
      });
    } catch (err) {
      console.error("Verification error:", err);
      return res.status(500).json({ error: "Verification failed", message: err.message });
    }
  }

  async checkVerification(req, res) {
    try {
      const { userId } = req.params;
      const verified = await merkleZkpService.isVerified(userId);
      return res.json({ userId, verified });
    } catch (err) {
      return res
        .status(500)
        .json({ error: "Failed to check verification status", message: err.message });
    }
  }

  async checkApproval(req, res) {
    try {
      const { userId } = req.params;
      const approved = await merkleZkpService.isApproved(userId);
      return res.json({ userId, approved });
    } catch (err) {
      return res
        .status(500)
        .json({ error: "Failed to check approval status", message: err.message });
    }
  }

  async checkSubmission(req, res) {
    try {
      const { userId } = req.params;
      const submitted = await merkleZkpService.hasSubmitted(userId);
      return res.json({ userId, submitted });
    } catch (err) {
      return res
        .status(500)
        .json({ error: "Failed to check submission status", message: err.message });
    }
  }

  async getMerkleInfo(req, res) {
    try {
      const info = await merkleZkpService.getMerkleTreeInfo();
      return res.json(info);
    } catch (err) {
      return res.status(500).json({ error: "Failed to get Merkle info", message: err.message });
    }
  }

  async getContractInfo(req, res) {
    try {
      const info = await merkleZkpService.getContractInfo();
      res.json(info);
    } catch (e) {
      console.error("Contract info error:", e);
      res.status(500).json({ error: "Failed to get contract info" });
    }
  }

  // Check if an identity (not userId) is approved on-chain
  async checkIdentityApproval(req, res) {
    try {
      const { nik, nama, ttl, key } = req.body;
      if (!nik || !nama || !ttl || !key) {
        return res.status(400).json({ error: "Missing required identity fields" });
      }

      const approved = await merkleZkpService.checkIdentityApproval(nik, nama, ttl, key);

      return res.json({
        success: true,
        approved,
        message: approved ? "Identity is approved on-chain" : "Identity not approved",
      });
    } catch (err) {
      console.error("Check identity approval error:", err);
      res.status(500).json({ error: "Failed to check identity approval", message: err.message });
    }
  }

  async getPendingUsers(req, res) {
    try {
      const pendingUsers = await merkleZkpService.getPendingUsers();
      res.json({
        success: true,
        pendingUsers,
        count: pendingUsers.length,
      });
    } catch (err) {
      console.error("Get pending users error:", err);
      res.status(500).json({ error: "Failed to get pending users", message: err.message });
    }
  }

  async buildAndUpdateTree(req, res) {
    try {
      // Manual tree rebuild - useful for batch operations
      const result = await merkleZkpService.rebuildAndUpdateTree();
      res.json({
        success: true,
        message: "Merkle tree rebuilt and updated with all identity hashes",
        ...result,
      });
    } catch (err) {
      console.error("Build tree error:", err);
      res.status(500).json({ error: "Failed to build and update tree", message: err.message });
    }
  }

  async getCurrentRoot(req, res) {
    try {
      const currentRoot = await merkleZkpService.getCurrentRoot();
      res.json({
        success: true,
        currentRoot,
      });
    } catch (err) {
      console.error("Get current root error:", err);
      res.status(500).json({ error: "Failed to get current root", message: err.message });
    }
  }
}

module.exports = new MerkleZKPController();
