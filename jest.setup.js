// Global test setup
global.console = {
  ...console,
  // Uncomment to suppress console.log during tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// Mock environment variables
process.env.POLYGON_MAINNET_RPC_URL = "https://polygon-rpc-url";
process.env.PRIVATE_KEY = "0x1234567890123456789012345678901234567890123456789012345678901234";
process.env.MERKLE_ZKP_CONTRACT_ADDRESS = "0xContractAddress";

// Mock BigInt to avoid issues in tests
if (typeof BigInt === "undefined") {
  global.BigInt = require("big-integer");
}

// Mock Buffer if not available
if (typeof Buffer === "undefined") {
  global.Buffer = require("buffer").Buffer;
}
