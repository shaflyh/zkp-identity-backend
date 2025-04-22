const express = require("express");
const router = express.Router();
const zkpController = require("../controllers/zkpController");

router.get("/", zkpController.getStatus);
router.post("/register", zkpController.register);
router.post("/verify", zkpController.verify);
router.get("/is-registered/:userId", zkpController.checkRegistration);
router.get("/is-verified/:userId", zkpController.checkVerification);

module.exports = router;
