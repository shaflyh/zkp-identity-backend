require("dotenv").config();
const express = require("express");
const { generateProofFromInput } = require("./scripts/zkp-proof");
const zkpContract = require("./scripts/zkp-contract");
const { isAddress } = require("ethers");

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
    const { nik, nama, ttl } = req.body;
    if (!nik || !nama || !ttl) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const { a, b, c, input } = await generateProofFromInput({ nik, nama, ttl });

    const tx = await zkpContract.submitProof(a, b, c, input);
    await tx.wait();

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
app.get("/status/:address", async (req, res) => {
  const { address } = req.params;

  // Validate Ethereum address
  if (!isAddress(address)) {
    return res.status(400).json({ error: "Invalid Ethereum address format" });
  }

  try {
    const verified = await zkpContract.isUserVerified(address);
    return res.json({ address, verified });
  } catch (err) {
    console.error("Status check error:", err);
    return res.status(500).json({ error: "Failed to check verification status" });
  }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`ZKP Backend running at http://localhost:${PORT}`));
