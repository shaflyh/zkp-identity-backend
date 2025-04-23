const express = require("express");
const router = express.Router();
const zkpController = require("../controllers/zkpController");

router.get("/", zkpController.getStatus);
router.post("/submit-hash", zkpController.submitHash);
router.post("/approve", zkpController.approveHash);
router.post("/verify", zkpController.verify);

router.get("/is-verified/:userId", zkpController.checkVerification);
router.get("/is-approved/:userId", zkpController.checkApproval);
router.get("/has-submitted/:userId", zkpController.checkSubmission);

module.exports = router;
