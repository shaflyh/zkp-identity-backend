# 🛡️ ZKP Identity Backend API

Backend API yang mengekspos fungsionalitas smart contract ZKP (Zero Knowledge Proof) untuk verifikasi identitas. API ini memungkinkan verifikasi identitas menggunakan ZKP tanpa harus mengungkapkan data asli.

## 🚀 Cara Menjalankan

### Menggunakan Node.js

1. Install dependencies:
```bash
npm install
```

2. Buat file `.env` dari `.env.example` dan isi dengan konfigurasi yang sesuai:
```
CONTRACT_ADDRESS=0x0a5Ae258F23E8Ce4816a40BA81796ceD47b293Ca
RPC_URL=https://polygon-amoy.infura.io/v3/your_project_id
PRIVATE_KEY=your_private_key
```

3. Jalankan server:
```bash
node index.js
```

### Menggunakan Docker

#### Docker CLI
1. Build image:
```bash
docker build -t zkp-identity-backend .
```

2. Jalankan container:
```bash
docker run -p 3002:3002 --env-file .env zkp-identity-backend
```

#### Docker Compose
Proyek ini menggunakan `compose.yaml` untuk konfigurasi Docker Compose.

1. Jalankan dengan Docker Compose:
```bash
docker compose up --build
```

2. Untuk menjalankan di background:
```bash
docker compose up -d
```

3. Untuk menghentikan:
```bash
docker compose down
```

4. Untuk melihat logs:
```bash
docker compose logs -f
```

5. Untuk rebuild image (setelah mengubah dependencies):
```bash
docker compose build
```

6. Untuk restart container (setelah mengubah environment variables):
```bash
docker compose restart
```

## 📡 Endpoint API

### 1. Verifikasi Identitas
```bash
curl -X POST http://localhost:3002/verify \
  -H "Content-Type: application/json" \
  -d '{
    "nik": "3204280701000002",
    "nama": "987654321",
    "ttl": "20000101",
    "userId": "User1"
  }'
```

### 2. Cek Status Verifikasi
```bash
curl http://localhost:3002/status/User1
```

## 📦 Dependencies

- Express.js - Web framework
- Ethers.js - Interaksi dengan smart contract
- SnarkJS - Zero Knowledge Proof
- Circomlibjs - Library untuk hashing Poseidon
- Dotenv - Manajemen environment variables

## 🔧 Teknologi yang Digunakan

- Node.js
- Docker
- Smart Contract ZKP
- Polygon Amoy Testnet

## 📝 Catatan

- Pastikan smart contract sudah terdeploy di Polygon Amoy Testnet
- Gunakan private key yang sesuai dengan akun yang memiliki akses ke smart contract
- API berjalan di port 3002 secara default
