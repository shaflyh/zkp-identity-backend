// zkp.js
const { execSync } = require("child_process");
const fs = require("fs");
const poseidonFactory = require("circomlibjs").buildPoseidon;
const { toHex } = require("circomlibjs");

async function generateProofFromInput({ nik, nama, ttl }) {
  // Hash input
  const poseidon = await poseidonFactory();
  const inputArray = [BigInt(nik), BigInt(nama), BigInt(ttl)];
  const hash = poseidon.F.toObject(poseidon(inputArray));

  // Generate input.json
  const inputJson = {
    nik: nik.toString(),
    nama: nama.toString(),
    ttl: ttl.toString(),
    identityHash: hash.toString(),
  };
  fs.writeFileSync("input.json", JSON.stringify(inputJson, null, 2));

  // Run proof generation
  execSync("node scripts/generate_proof.js", { stdio: "inherit" });

  // Read proof and public
  const proof = JSON.parse(fs.readFileSync("proof/proof.json"));
  const publicSignals = JSON.parse(fs.readFileSync("proof/public.json"));

  const a = [proof.pi_a[0], proof.pi_a[1]];
  const b = [
    [proof.pi_b[0][1], proof.pi_b[0][0]],
    [proof.pi_b[1][1], proof.pi_b[1][0]],
  ];
  const c = [proof.pi_c[0], proof.pi_c[1]];
  const input = publicSignals;

  return { a, b, c, input };
}

module.exports = { generateProofFromInput };
