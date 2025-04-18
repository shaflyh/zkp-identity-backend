curl -X POST http://localhost:3002/verify \
  -H "Content-Type: application/json" \
  -d '{"nik": "3204280701000002", "nama": "987654321", "ttl": "20000101"}'

curl http://localhost:3002/status/0x1082f6bF761FCe2B585A87a7E787123aD3D5F8a3
