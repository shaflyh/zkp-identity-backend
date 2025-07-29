const express = require("express");
const router = express.Router();
const merkleZkpController = require("../controllers/merkleZkpController");

// ===== CORE ROUTES (Same as original flow) =====
// These maintain compatibility with existing frontend
router.get("/", merkleZkpController.getStatus);
router.post("/submit-hash", merkleZkpController.submitHash);
router.post("/approve", merkleZkpController.approveHash);
router.post("/verify", merkleZkpController.verify);

// Status check routes by userId
router.get("/is-verified/:userId", merkleZkpController.checkVerification);
router.get("/is-approved/:userId", merkleZkpController.checkApproval);
router.get("/has-submitted/:userId", merkleZkpController.checkSubmission);

// ===== ADDITIONAL ROUTES =====
// Contract and Merkle tree information
router.get("/contract-info", merkleZkpController.getContractInfo);
router.get("/merkle-info", merkleZkpController.getMerkleInfo);
router.get("/current-root", merkleZkpController.getCurrentRoot);

// Check identity approval on-chain (without userId)
router.post("/check-identity-approval", merkleZkpController.checkIdentityApproval);

// Batch operations
router.get("/pending-users", merkleZkpController.getPendingUsers);
router.post("/build-tree", merkleZkpController.buildAndUpdateTree);

module.exports = router;
