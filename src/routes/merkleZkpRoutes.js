const express = require("express");
const router = express.Router();
const merkleZkpController = require("../controllers/merkleZkpController");

// ===== CORE ROUTES (Same as original flow) =====
// These maintain compatibility with existing frontend
router.get("/", merkleZkpController.getStatus);
router.post("/submit-hash", merkleZkpController.submitHash);
router.post("/approve", merkleZkpController.approveHash);
router.post("/verify", merkleZkpController.verify);

// Status check routes
router.get("/is-verified/:userId", merkleZkpController.checkVerification);
router.get("/is-approved/:userId", merkleZkpController.checkApproval);
router.get("/has-submitted/:userId", merkleZkpController.checkSubmission);

// ===== ADDITIONAL ROUTES =====
// Contract and Merkle tree information
router.get("/contract-info", merkleZkpController.getContractInfo);
router.get("/merkle-info", merkleZkpController.getMerkleInfo);
router.get("/current-root", merkleZkpController.getCurrentRoot);
router.get("/valid-root/:rootHash", merkleZkpController.isValidRoot);

// Alternative user management (combines submit + approve)
router.post("/add-user", merkleZkpController.addUser);

// Batch operations
router.get("/pending-users", merkleZkpController.getPendingUsers);
router.post("/build-tree", merkleZkpController.buildAndUpdateTree);

// For future: verification by address instead of userId
// router.get("/verified/:address", merkleZkpController.checkUserVerification);
// router.get("/user-info/:address", merkleZkpController.getUserVerificationInfo);

module.exports = router;
