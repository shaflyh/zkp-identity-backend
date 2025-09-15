// services/ipfsService.js
const axios = require("axios");
require("dotenv").config();

class IPFSService {
  constructor() {
    this.pinataApiKey = process.env.PINATA_API_KEY;
    this.pinataSecretApiKey = process.env.PINATA_SECRET_API_KEY;
    this.pinataJWT = process.env.PINATA_JWT;
    this.pinataGroupId = "5bddc8a9-cc83-4d09-903f-88f7b15f3634";

    // Pinata API endpoints
    this.pinataBaseUrl = "https://api.pinata.cloud";
    this.pinataGateway = "https://gateway.pinata.cloud/ipfs/";

    if (!this.pinataJWT && (!this.pinataApiKey || !this.pinataSecretApiKey)) {
      console.warn("Pinata credentials not found. IPFS functionality will be limited.");
    }
  }

  /**
   * Upload JSON data to IPFS via Pinata
   * @param {Object} data - Data to upload
   * @param {string} fileName - Name for the file
   * @returns {Promise<string>} IPFS hash
   */
  async uploadJSON(data, fileName = "merkle-tree-data.json") {
    try {
      // Handle BigInt serialization
      const jsonString = JSON.stringify(
        data,
        (key, value) => {
          if (typeof value === "bigint") {
            return value.toString();
          }
          return value;
        },
        2
      );

      // Use Node.js form-data instead of browser FormData
      const FormData = require("form-data");
      const formData = new FormData();

      // Add file as buffer instead of blob
      formData.append("file", Buffer.from(jsonString, "utf8"), {
        filename: fileName,
        contentType: "application/json",
      });

      // Add metadata
      const metadata = JSON.stringify({
        name: fileName,
        keyvalues: {
          type: "merkle-tree-backup",
          timestamp: new Date().toISOString(),
          version: "1.0",
        },
      });
      formData.append("pinataMetadata", metadata);

      // Add options
      const options = JSON.stringify({
        cidVersion: 0,
        groupId: this.pinataGroupId,
        customPinPolicy: {
          regions: [
            { id: "FRA1", desiredReplicationCount: 1 },
            { id: "NYC1", desiredReplicationCount: 1 },
          ],
        },
      });
      formData.append("pinataOptions", options);

      // Use form-data headers
      const headers = {
        ...this.getAuthHeaders(),
        ...formData.getHeaders(),
      };

      const response = await axios.post(`${this.pinataBaseUrl}/pinning/pinFileToIPFS`, formData, {
        headers,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });

      console.log(`Successfully uploaded to IPFS: ${response.data.IpfsHash}`);
      return response.data.IpfsHash;
    } catch (error) {
      console.error("Error uploading to IPFS:", error.response?.data || error.message);
      throw new Error(`Failed to upload to IPFS: ${error.message}`);
    }
  }

  /**
   * Retrieve JSON data from IPFS
   * @param {string} ipfsHash - IPFS hash to retrieve
   * @returns {Promise<Object>} Parsed JSON data
   */
  async retrieveJSON(ipfsHash) {
    try {
      console.log(`Retrieving data from IPFS: ${ipfsHash}`);

      // Try multiple gateways for reliability
      const gateways = [
        `${this.pinataGateway}${ipfsHash}`,
        `https://ipfs.io/ipfs/${ipfsHash}`,
        `https://dweb.link/ipfs/${ipfsHash}`,
        `https://cloudflare-ipfs.com/ipfs/${ipfsHash}`,
      ];

      for (const gateway of gateways) {
        try {
          const response = await axios.get(gateway, {
            timeout: 10000, // 10 second timeout
            headers: {
              Accept: "application/json",
            },
          });

          return response.data;
        } catch (gatewayError) {
          console.warn(`Failed to retrieve from ${gateway}:`, gatewayError.message);
          continue;
        }
      }

      throw new Error("All IPFS gateways failed");
    } catch (error) {
      console.error("Error retrieving from IPFS:", error.message);
      throw new Error(`Failed to retrieve from IPFS: ${error.message}`);
    }
  }

  sanitizeData(obj) {
    if (typeof obj === "bigint") {
      return obj.toString();
    }
    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeData(item));
    }
    if (obj !== null && typeof obj === "object") {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = this.sanitizeData(value);
      }
      return sanitized;
    }
    return obj;
  }

  /**
   * Upload tree data with proper structure
   * @param {Object} merkleTree - Merkle tree object
   * @param {Object} users - User data
   * @returns {Promise<string>} IPFS hash
   */
  async uploadTreeData(merkleTree, users) {
    // Debug: Log the tree structure to see what we're working with
    console.log("DEBUG - Tree structure before upload:");
    console.log("merkleTree.root:", merkleTree.root);
    console.log("merkleTree.leaves:", merkleTree.leaves);

    // Sanitize BigInt values before uploading
    const sanitizedTreeData = {
      timestamp: Date.now(),
      blockNumber: null,
      version: "1.0",
      merkleTree: {
        root: merkleTree.root?.toString() || merkleTree.root,
        leaves:
          merkleTree.leaves?.map((leaf) => (typeof leaf === "bigint" ? leaf.toString() : leaf)) ||
          merkleTree.leaves,
      },
      users: this.sanitizeData(users),
      metadata: {
        totalUsers: Object.keys(users).length,
        approvedUsers: Object.values(users).filter(
          (u) => u.status === "approved" || u.status === "verified"
        ).length,
        uploadedAt: new Date().toISOString(),
      },
    };

    return await this.uploadJSON(sanitizedTreeData, `merkle-tree-${Date.now()}.json`);
  }

  /**
   * Retrieve and validate tree data
   * @param {string} ipfsHash - IPFS hash
   * @returns {Promise<Object>} Tree data with validation
   */
  async retrieveTreeData(ipfsHash) {
    try {
      const data = await this.retrieveJSON(ipfsHash);

      // Basic validation
      if (!data.merkleTree || !data.users) {
        throw new Error("Invalid tree data structure");
      }

      // More flexible validation - root and leaves can be strings or BigInt
      if (
        data.merkleTree.root === undefined ||
        data.merkleTree.root === null ||
        !data.merkleTree.leaves ||
        !Array.isArray(data.merkleTree.leaves)
      ) {
        throw new Error("Invalid merkle tree structure");
      }

      console.log(`Retrieved tree data: ${data.metadata?.totalUsers || "unknown"} total users`);
      return data;
    } catch (error) {
      console.error("Error retrieving tree data:", error.message);
      throw error;
    }
  }

  /**
   * List all pinned files (for debugging/management)
   * @returns {Promise<Array>} List of pinned files
   */
  async listPinnedFiles() {
    try {
      const response = await axios.get(
        `${this.pinataBaseUrl}/data/pinList?status=pinned&pageLimit=100`,
        { headers: this.getAuthHeaders() }
      );

      return response.data.rows.filter(
        (pin) => pin.metadata?.keyvalues?.type === "merkle-tree-backup"
      );
    } catch (error) {
      console.error("Error listing pinned files:", error.message);
      throw error;
    }
  }

  /**
   * Unpin old files (cleanup)
   * @param {string} ipfsHash - Hash to unpin
   */
  async unpinFile(ipfsHash) {
    try {
      await axios.delete(`${this.pinataBaseUrl}/pinning/unpin/${ipfsHash}`, {
        headers: this.getAuthHeaders(),
      });

      console.log(`Unpinned file: ${ipfsHash}`);
    } catch (error) {
      console.error("Error unpinning file:", error.message);
      // Don't throw error - unpinning failures shouldn't break the flow
    }
  }

  /**
   * Get authentication headers for Pinata API
   * @returns {Object} Headers object
   */
  getAuthHeaders() {
    if (this.pinataJWT) {
      return {
        Authorization: `Bearer ${this.pinataJWT}`,
      };
    } else if (this.pinataApiKey && this.pinataSecretApiKey) {
      return {
        pinata_api_key: this.pinataApiKey,
        pinata_secret_api_key: this.pinataSecretApiKey,
      };
    } else {
      throw new Error("Pinata credentials not configured");
    }
  }

  /**
   * Test IPFS connection
   * @returns {Promise<boolean>} Connection status
   */
  async testConnection() {
    try {
      const testData = { test: true, timestamp: Date.now() };
      const hash = await this.uploadJSON(testData, "connection-test.json");
      const retrieved = await this.retrieveJSON(hash);

      // Cleanup test file
      await this.unpinFile(hash);

      return retrieved.test === true;
    } catch (error) {
      console.error("IPFS connection test failed:", error.message);
      return false;
    }
  }
}

module.exports = new IPFSService();
