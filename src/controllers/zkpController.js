const zkpService = require("../services/zkpService");

class ZKPController {
  async getStatus(req, res) {
    try {
      const contractAddress = await zkpService.getContractAddress();
      res.send(`ZKP backend is running. Contract at: ${contractAddress}`);
    } catch (e) {
      res.status(500).send("Contract failed to load.");
    }
  }

  async submitHash(req, res) {
    try {
      const { userId, nik, nama, ttl, key } = req.body;
      if (!userId || !nik || !nama || !ttl || !key) {
        return res.status(400).json({ error: "Missing required fields." });
      }

      const { userHash, publicSignal } = await zkpService.submitUserHash(
        userId,
        nik,
        nama,
        ttl,
        key
      );

      return res.json({
        success: true,
        message: "Hash submitted to smart contract.",
        userHash,
        publicSignal,
      });
    } catch (err) {
      console.error("Submit hash error:", err);
      res.status(500).json({ error: "Failed to submit hash", message: err });
    }
  }

  async approveHash(req, res) {
    try {
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ error: "Missing userId" });

      const userHash = await zkpService.approveUserHash(userId);
      return res.json({ success: true, message: "Hash approved.", userHash });
    } catch (err) {
      console.error("Approval error:", err);
      return res.status(500).json({ error: "Failed to approve hash", message: err });
    }
  }

  async verify(req, res) {
    try {
      const { userId, nik, nama, ttl, key } = req.body;
      if (!userId || !nik || !nama || !ttl || !key) {
        return res.status(400).json({ error: "Missing required fields." });
      }

      await zkpService.verifyUser(userId, nik, nama, ttl, key);

      return res.json({
        success: true,
        message: "Proof submitted and verified on-chain.",
      });
    } catch (err) {
      console.error("Verification error:", err);
      return res.status(500).json({ error: "Verification failed", message: err });
    }
  }

  async checkVerification(req, res) {
    try {
      const { userId } = req.params;
      const verified = await zkpService.isVerified(userId);
      return res.json({ userId, verified });
    } catch (err) {
      return res.status(500).json({ error: "Failed to check verification status", message: err });
    }
  }

  async checkApproval(req, res) {
    try {
      const { userId } = req.params;
      const approved = await zkpService.isApproved(userId);
      return res.json({ userId, approved });
    } catch (err) {
      return res.status(500).json({ error: "Failed to check approval status", message: err });
    }
  }

  async checkSubmission(req, res) {
    try {
      const { userId } = req.params;
      const submitted = await zkpService.hasSubmitted(userId);
      return res.json({ userId, submitted });
    } catch (err) {
      return res.status(500).json({ error: "Failed to check submission status", message: err });
    }
  }
}

module.exports = new ZKPController();
