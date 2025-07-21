const fs = require("fs");
const path = require("path");
const snarkjs = require("snarkjs");
const poseidonFactory = require("circomlibjs").buildPoseidon;

const CIRCUIT_NAME = "IdentityMerkleProof";
const BUILD_DIR = "./proof";
const WASM_FILE = path.join(BUILD_DIR, `${CIRCUIT_NAME}_js/${CIRCUIT_NAME}.wasm`);
const ZKEY_FILE = path.join(BUILD_DIR, `${CIRCUIT_NAME}_final.zkey`);

// Simple Merkle Tree implementation
class SimpleMerkleTree {
  constructor(leaves, levels = 16) {
    this.leaves = leaves.map((l) => BigInt(l));
    this.levels = levels;
    this.tree = [];
    this.poseidonLib = null;
  }

  async initialize(poseidonLib) {
    this.poseidonLib = poseidonLib;
    await this.buildTree();
  }

  async buildTree() {
    if (!this.poseidonLib) {
      throw new Error("Poseidon library not set");
    }

    // Initialize tree array
    for (let i = 0; i <= this.levels; i++) {
      this.tree[i] = [];
    }

    // Set leaves at level 0
    this.tree[0] = [...this.leaves];

    // Pad leaves to power of 2
    const maxLeaves = 2 ** this.levels;
    while (this.tree[0].length < maxLeaves) {
      this.tree[0].push(0n);
    }

    // Build tree from bottom to top
    for (let level = 0; level < this.levels; level++) {
      const currentLevel = this.tree[level];
      const nextLevel = [];

      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = currentLevel[i + 1] || 0n;
        const parent = this.poseidonHash(left, right);
        nextLevel.push(parent);
      }

      this.tree[level + 1] = nextLevel;
    }
  }

  poseidonHash(left, right) {
    return this.poseidonLib.F.toObject(this.poseidonLib([BigInt(left), BigInt(right)]));
  }

  getRoot() {
    return this.tree[this.levels][0];
  }

  getProof(leafIndex) {
    const proof = {
      pathElements: [],
      pathIndices: [],
    };

    let currentIndex = leafIndex;

    for (let level = 0; level < this.levels; level++) {
      const isRightNode = currentIndex % 2 === 1;
      const siblingIndex = isRightNode ? currentIndex - 1 : currentIndex + 1;

      const sibling = this.tree[level][siblingIndex] || 0n;
      proof.pathElements.push(sibling);

      // 0 = sibling is on left, 1 = sibling is on right
      proof.pathIndices.push(isRightNode ? 0 : 1);

      currentIndex = Math.floor(currentIndex / 2);
    }

    return proof;
  }
}

async function buildMerkleTree(usersData) {
  const poseidon = await poseidonFactory();
  const leaves = [];

  // Generate leaves for all users
  for (const userData of usersData) {
    // Convert nama and key to BigInt
    const namaHex = Buffer.from(userData.nama, "utf8").toString("hex");
    const namaBigInt = BigInt("0x" + namaHex);
    const keyHex = Buffer.from(userData.key, "utf8").toString("hex");
    const keyBigInt = BigInt("0x" + keyHex);

    // Generate identity hash
    const identityInputs = [BigInt(userData.nik), namaBigInt, BigInt(userData.ttl), keyBigInt];
    const identityHash = poseidon.F.toObject(poseidon(identityInputs));

    // Generate leaf hash with salt and status
    const leafInputs = [identityHash, BigInt(userData.salt), 1n]; // status: 1 = active
    const leafHash = poseidon.F.toObject(poseidon(leafInputs));

    leaves.push(leafHash.toString());
  }

  // Create and build Merkle tree
  const merkleTree = new SimpleMerkleTree(leaves, 16);
  await merkleTree.initialize(poseidon);

  const root = merkleTree.getRoot().toString();

  return { tree: merkleTree, root, leaves };
}

async function generateMerkleProof({ nik, nama, ttl, key, salt, leafIndex, merkleTree }) {
  console.log("Generating Merkle proof for user at index:", leafIndex);

  const poseidon = await poseidonFactory();

  // Convert nama and key to BigInt
  const namaHex = Buffer.from(nama, "utf8").toString("hex");
  const namaBigInt = BigInt("0x" + namaHex);
  const keyHex = Buffer.from(key, "utf8").toString("hex");
  const keyBigInt = BigInt("0x" + keyHex);

  // Get Merkle proof
  const merkleProof = merkleTree.getProof(leafIndex);
  const merkleRoot = merkleTree.getRoot().toString();

  // Create input for circuit
  const input = {
    // Public input
    merkleRoot: merkleRoot,

    // Private inputs - Identity
    nik: nik.toString(),
    nama: namaBigInt.toString(),
    ttl: ttl.toString(),
    key: keyBigInt.toString(),

    // Private inputs - Merkle proof
    pathElements: merkleProof.pathElements.map((p) => p.toString()),
    pathIndices: merkleProof.pathIndices,
    salt: salt.toString(),
  };

  console.log("Circuit input prepared, generating proof...");

  // Generate witness
  const wasmBuffer = fs.readFileSync(WASM_FILE);
  const witnessCalculatorBuilder = require(`../${BUILD_DIR}/${CIRCUIT_NAME}_js/witness_calculator.js`);
  const wc = await witnessCalculatorBuilder(wasmBuffer);
  const witness = await wc.calculateWTNSBin(input, 0);

  // Generate proof
  const { proof, publicSignals } = await snarkjs.groth16.prove(ZKEY_FILE, witness);

  // Format proof for smart contract
  const a = [proof.pi_a[0], proof.pi_a[1]];
  const b = [
    [proof.pi_b[0][1], proof.pi_b[0][0]],
    [proof.pi_b[1][1], proof.pi_b[1][0]],
  ];
  const c = [proof.pi_c[0], proof.pi_c[1]];

  return {
    proof: { a, b, c },
    publicSignals,
    merkleRoot,
  };
}

module.exports = { generateMerkleProof, buildMerkleTree };
