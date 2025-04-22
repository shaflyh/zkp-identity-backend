const fs = require("fs");
const path = require("path");
const snarkjs = require("snarkjs");
const poseidonFactory = require("circomlibjs").buildPoseidon;

const CIRCUIT_NAME = "IdentityPossessionProof";
const BUILD_DIR = "./proof";
const WASM_FILE = path.join(BUILD_DIR, `${CIRCUIT_NAME}_js/${CIRCUIT_NAME}.wasm`);
const ZKEY_FILE = path.join(BUILD_DIR, `${CIRCUIT_NAME}_final.zkey`);

async function generateProof({ nik, nama, ttl, key }) {
  console.log("Generating proof for:", { nik, nama, ttl, key });
  const poseidon = await poseidonFactory();
  const namaHex = Buffer.from(nama, "utf8").toString("hex");
  const namaBigInt = BigInt("0x" + namaHex);
  const keyHex = Buffer.from(key, "utf8").toString("hex");
  const keyBigInt = BigInt("0x" + keyHex);
  const inputArray = [BigInt(nik), namaBigInt, BigInt(ttl), keyBigInt];
  const identityHash = poseidon.F.toObject(poseidon(inputArray));

  const input = {
    nik: nik.toString(),
    nama: namaBigInt,
    ttl: ttl.toString(),
    key: keyBigInt,
    identityHash: identityHash.toString(),
  };

  console.log("Input:", input);

  const wasmBuffer = fs.readFileSync(WASM_FILE);
  const witnessCalculatorBuilder = require(`../${BUILD_DIR}/${CIRCUIT_NAME}_js/witness_calculator.js`);
  const wc = await witnessCalculatorBuilder(wasmBuffer);
  const witness = await wc.calculateWTNSBin(input, 0);

  const { proof } = await snarkjs.groth16.prove(ZKEY_FILE, witness);

  const a = [proof.pi_a[0], proof.pi_a[1]];
  const b = [
    [proof.pi_b[0][1], proof.pi_b[0][0]],
    [proof.pi_b[1][1], proof.pi_b[1][0]],
  ];
  const c = [proof.pi_c[0], proof.pi_c[1]];

  return { a, b, c };
}

async function getPublicSignal({ nik, nama, ttl, key }) {
  const poseidon = await poseidonFactory();
  const namaHex = Buffer.from(nama, "utf8").toString("hex");
  const keyHex = Buffer.from(key, "utf8").toString("hex");
  const inputArray = [BigInt(nik), BigInt("0x" + namaHex), BigInt(ttl), BigInt("0x" + keyHex)];
  const hash = poseidon.F.toObject(poseidon(inputArray));
  return hash.toString(); // public signal
}

module.exports = { generateProof, getPublicSignal };
