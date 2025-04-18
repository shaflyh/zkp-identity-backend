require("dotenv").config();
const express = require("express");
const { generateProof } = require("./scripts/zkp-proof");
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

// POST /verify
app.post("/verify", async (req, res) => {
  try {
    const { userId, nik, nama, ttl } = req.body;

    if (!userId || !nik || !nama || !ttl) {
      return res.status(400).json({ error: "Missing required fields (userId, nik, nama, ttl)" });
    }

    // Hash the userId to bytes32
    const userHash = keccak256(toUtf8Bytes(userId));

    const { a, b, c, input } = await generateProof({ nik, nama, ttl });

    try {
      console.log("User Hash: ", userHash);
      console.log("Proof inputs:");
      console.log({ a, b, c, input });
      const tx = await zkpContract.submitProof(userHash, a, b, c, input);
      await tx.wait();
    } catch (err) {
      console.error("❌ Contract execution failed:", err);
      return res
        .status(400)
        .json({ error: "Contract rejected the proof. Possibly invalid proof or input mismatch." });
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

// GET /status/:address
app.get("/status/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const userHash = keccak256(toUtf8Bytes(userId));

    const verified = await zkpContract.isVerified(userHash);
    return res.json({ userId, verified });
  } catch (err) {
    console.error("Status check error:", err);
    return res.status(500).json({ error: "Failed to check verification status" });
  }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`ZKP Backend running at http://localhost:${PORT}`));
