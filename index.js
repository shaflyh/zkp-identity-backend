require("dotenv").config();
const express = require("express");
const zkpRoutes = require("./src/routes/zkpRoutes");

const app = express();
app.use(express.json());

console.log("Starting ZKP backend...");

// Routes
app.use("/", zkpRoutes);

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`ZKP Backend running at http://localhost:${PORT}`));
