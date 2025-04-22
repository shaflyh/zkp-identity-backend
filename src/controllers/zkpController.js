const zkpService = require("../services/zkpService");

class ZKPController {
  async getStatus(req, res) {
    try {
      const contractAddress = await zkpService.getContractAddress();
      console.log("ZKP Contract loaded:", contractAddress);
      res.send(`ZKP backend is running. ZKP Contract at: ${contractAddress}`);
    } catch (e) {
      console.error("❌ Failed to get contract address:", e);
      res.status(500).send("Contract failed to load.");
    }
  }

  async register(req, res) {
    try {
      const { userId, nik, nama, ttl, key } = req.body;
      if (!userId || !nik || !nama || !ttl || !key) {
        return res.status(400).json({ error: "Missing required fields." });
      }

      const { userHash, publicSignals } = await zkpService.registerUser(
        userId,
        nik,
        nama,
        ttl,
        key
      );

      return res.json({
        success: true,
        message: "Hash registered.",
        userHash,
        publicSignals,
      });
    } catch (err) {
      console.error("Register error:", err);
      res.status(500).json({ error: "Registration failed." });
    }
  }

  async verify(req, res) {
    try {
      const { userId, nik, nama, ttl, key } = req.body;
      if (!userId || !nik || !nama || !ttl || !key) {
        return res.status(400).json({
          error: "Missing required fields (userId, nik, nama, ttl, key)",
        });
      }

      try {
        await zkpService.verifyUser(userId, nik, nama, ttl, key);
      } catch (err) {
        console.error("❌ Contract execution failed:", err);
        return res.status(400).json({
          error: "Contract rejected the proof. Possibly invalid proof or not registered.",
        });
      }

      return res.json({
        success: true,
        message: "Proof submitted and verified on-chain.",
      });
    } catch (err) {
      console.error("Verification error:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  async checkRegistration(req, res) {
    const { userId } = req.params;
    try {
      const registered = await zkpService.isRegistered(userId);
      return res.json({ userId, registered });
    } catch (err) {
      console.error("Registration check error:", err);
      return res.status(500).json({ error: "Failed to check registration status." });
    }
  }

  async checkVerification(req, res) {
    const { userId } = req.params;
    try {
      const verified = await zkpService.isVerified(userId);
      return res.json({ userId, verified });
    } catch (err) {
      console.error("Verification check error:", err);
      return res.status(500).json({ error: "Failed to check verification status" });
    }
  }
}

module.exports = new ZKPController();
