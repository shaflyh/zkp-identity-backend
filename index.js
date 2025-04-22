require("dotenv").config();
const express = require("express");
const { generateProof, getPublicSignal } = require("./scripts/zkp-proof");
const zkpContract = require("./scripts/zkp-contract");
const { keccak256, toUtf8Bytes } = require("ethers");

const app = express();
app.use(express.json());

console.log("Starting ZKP backend...");

// GET /
app.get("/", async (req, res) => {
  try {
    const contractAddress = await zkpContract.getAddress();
    console.log("ZKP Contract loaded:", contractAddress);
    res.send(`ZKP backend is running. ZKP Contract at: ${contractAddress}`);
  } catch (e) {
    console.error("❌ Failed to get contract address:", e);
    res.status(500).send("Contract failed to load.");
  }
});

// POST /register
app.post("/register", async (req, res) => {
  try {
    const { userId, nik, nama, ttl, key } = req.body;
    if (!userId || !nik || !nama || !ttl || !key) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    const userHash = keccak256(toUtf8Bytes(userId));
    const publicSignals = await getPublicSignal({ nik, nama, ttl, key });

    const tx = await zkpContract.registerHash(userHash, publicSignals);
    await tx.wait();

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
});

// POST /verify
app.post("/verify", async (req, res) => {
  try {
    const { userId, nik, nama, ttl, key } = req.body;

    if (!userId || !nik || !nama || !ttl || !key) {
      return res
        .status(400)
        .json({ error: "Missing required fields (userId, nik, nama, ttl, key)" });
    }

    const userHash = keccak256(toUtf8Bytes(userId));
    const { a, b, c } = await generateProof({ nik, nama, ttl, key });

    try {
      console.log("User Hash:", userHash);
      const tx = await zkpContract.submitProof(userHash, a, b, c);
      await tx.wait();
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
});

// GET /is-registered/:userId
app.get("/is-registered/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const userHash = keccak256(toUtf8Bytes(userId));

    const verified = await zkpContract.isVerified(userHash);
    return res.json({ userId, registered: verified });
  } catch (err) {
    console.error("Registration check error:", err);
    return res.status(500).json({ error: "Failed to check registration status." });
  }
});

// GET /is-verified/:userId
app.get("/is-verified/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const userHash = keccak256(toUtf8Bytes(userId));

    const verified = await zkpContract.isVerified(userHash);
    return res.json({ userId, verified });
  } catch (err) {
    console.error("Verification check error:", err);
    return res.status(500).json({ error: "Failed to check verification status" });
  }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`ZKP Backend running at http://localhost:${PORT}`));
