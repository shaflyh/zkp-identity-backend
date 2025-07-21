// Test script to demonstrate the Merkle ZKP flow
const axios = require("axios");

const API_BASE = "http://localhost:3002/api/merkle-zkp";

async function testFlow() {
  try {
    console.log("🚀 Testing Merkle ZKP Flow\n");

    // 1. Check status
    console.log("1️⃣ Checking backend status...");
    const statusRes = await axios.get(`${API_BASE}/`);
    console.log("Status:", statusRes.data);
    console.log("");

    // 2. Submit user data
    console.log("2️⃣ Submitting user data...");
    const userData = {
      userId: "user123",
      nik: "3204280701000002",
      nama: "John Doe",
      ttl: "20000101",
      key: "mySecretKey",
    };

    const submitRes = await axios.post(`${API_BASE}/submit-hash`, userData);
    console.log("Submit response:", submitRes.data);
    console.log("");

    // 3. Check submission status
    console.log("3️⃣ Checking submission status...");
    const submissionRes = await axios.get(`${API_BASE}/has-submitted/user123`);
    console.log("Has submitted:", submissionRes.data);
    console.log("");

    // 4. Admin approves user
    console.log("4️⃣ Admin approving user...");
    const approveRes = await axios.post(`${API_BASE}/approve`, { userId: "user123" });
    console.log("Approve response:", approveRes.data);
    console.log("");

    // 5. Check approval status
    console.log("5️⃣ Checking approval status...");
    const approvalRes = await axios.get(`${API_BASE}/is-approved/user123`);
    console.log("Is approved:", approvalRes.data);
    console.log("");

    // 6. Get Merkle info
    console.log("6️⃣ Getting Merkle tree info...");
    const merkleInfoRes = await axios.get(`${API_BASE}/merkle-info`);
    console.log("Merkle info:", merkleInfoRes.data);
    console.log("");

    // 7. User verifies identity
    console.log("7️⃣ User verifying identity with ZKP...");
    const verifyRes = await axios.post(`${API_BASE}/verify`, userData);
    console.log("Verify response:", verifyRes.data);
    console.log("");

    // 8. Check verification status
    console.log("8️⃣ Checking verification status...");
    const verificationRes = await axios.get(`${API_BASE}/is-verified/user123`);
    console.log("Is verified:", verificationRes.data);
    console.log("");

    console.log("✅ Test flow completed successfully!");
  } catch (error) {
    console.error("❌ Error in test flow:", error.response?.data || error.message);
  }
}

// Test with multiple users
async function testMultipleUsers() {
  try {
    console.log("\n🚀 Testing Multiple Users\n");

    const users = [
      { userId: "alice", nik: "1234567890123456", nama: "Alice", ttl: "19950101", key: "aliceKey" },
      { userId: "bob", nik: "2345678901234567", nama: "Bob", ttl: "19900505", key: "bobKey" },
      {
        userId: "charlie",
        nik: "3456789012345678",
        nama: "Charlie",
        ttl: "19850315",
        key: "charlieKey",
      },
    ];

    // Submit all users
    console.log("📝 Submitting all users...");
    for (const user of users) {
      await axios.post(`${API_BASE}/submit-hash`, user);
      console.log(`Submitted: ${user.userId}`);
    }

    // Approve all users
    console.log("\n✅ Approving all users...");
    for (const user of users) {
      await axios.post(`${API_BASE}/approve`, { userId: user.userId });
      console.log(`Approved: ${user.userId}`);
    }

    // Check Merkle info
    console.log("\n📊 Merkle tree info after approvals:");
    const merkleInfo = await axios.get(`${API_BASE}/merkle-info`);
    console.log(merkleInfo.data);

    // Verify one user
    console.log("\n🔐 Verifying Bob...");
    const bobData = users.find((u) => u.userId === "bob");
    const verifyRes = await axios.post(`${API_BASE}/verify`, bobData);
    console.log("Bob verified:", verifyRes.data);
  } catch (error) {
    console.error("❌ Error:", error.response?.data || error.message);
  }
}

// Run tests
async function runTests() {
  await testFlow();
  await testMultipleUsers();
}

// Check command line arguments
if (process.argv[2] === "single") {
  testFlow();
} else if (process.argv[2] === "multiple") {
  testMultipleUsers();
} else {
  runTests();
}
