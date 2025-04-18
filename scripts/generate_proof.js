const { execSync } = require("child_process");
const fs = require("fs");

const CIRCUIT_NAME = "IdentityPossessionProof";
const INPUT_FILE = "input.json";
const BUILD_DIR = "./proof";
const WITNESS_FILE = `${BUILD_DIR}/witness.wtns`;
const PROOF_FILE = `${BUILD_DIR}/proof.json`;
const PUBLIC_FILE = `${BUILD_DIR}/public.json`;
const WASM_DIR = `${BUILD_DIR}/${CIRCUIT_NAME}_js`;
const ZKEY_FILE = `${BUILD_DIR}/${CIRCUIT_NAME}_final.zkey`;

async function main() {
  try {
    console.log("\n📥 Generating witness...");
    execSync(`node ${WASM_DIR}/generate_witness.js ${WASM_DIR}/${CIRCUIT_NAME}.wasm ${INPUT_FILE} ${WITNESS_FILE}`, {
      stdio: "inherit",
    });

    console.log("\n🧾 Generating proof...");
    execSync(`snarkjs groth16 prove ${ZKEY_FILE} ${WITNESS_FILE} ${PROOF_FILE} ${PUBLIC_FILE}`, {
      stdio: "inherit",
    });

    console.log("\n✅ Proof generated successfully!");
  } catch (error) {
    console.error("❌ Error during proof generation:", error);
  }
}

main();
