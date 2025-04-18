const fs = require("fs");
const path = require("path");
const snarkjs = require("snarkjs");
const poseidonFactory = require("circomlibjs").buildPoseidon;

const CIRCUIT_NAME = "IdentityPossessionProof";
const BUILD_DIR = "./proof";
const WASM_FILE = path.join(BUILD_DIR, `${CIRCUIT_NAME}_js/${CIRCUIT_NAME}.wasm`);
const ZKEY_FILE = path.join(BUILD_DIR, `${CIRCUIT_NAME}_final.zkey`);

async function generateProof({ nik, nama, ttl }) {
  const poseidon = await poseidonFactory();
  const inputArray = [BigInt(nik), BigInt(nama), BigInt(ttl)];
  const hash = poseidon.F.toObject(poseidon(inputArray));

  const input = {
    nik: nik.toString(),
    nama: nama.toString(),
    ttl: ttl.toString(),
    identityHash: hash.toString(),
  };

  // Step 1: generate witness
  const wasmBuffer = fs.readFileSync(WASM_FILE);
  const witnessCalculatorBuilder = require(`../${BUILD_DIR}/${CIRCUIT_NAME}_js/witness_calculator.js`);
  const wc = await witnessCalculatorBuilder(wasmBuffer);
  const witness = await wc.calculateWTNSBin(input, 0);

  // Step 2: generate proof and public signals
  const { proof, publicSignals } = await snarkjs.groth16.prove(ZKEY_FILE, witness);

  // Step 3: format for Solidity
  const a = [proof.pi_a[0], proof.pi_a[1]];
  const b = [
    [proof.pi_b[0][1], proof.pi_b[0][0]],
    [proof.pi_b[1][1], proof.pi_b[1][0]],
  ];
  const c = [proof.pi_c[0], proof.pi_c[1]];
  const inputFormatted = publicSignals.map((x) => x.toString());

  return { a, b, c, input: inputFormatted };
}

module.exports = { generateProof };
