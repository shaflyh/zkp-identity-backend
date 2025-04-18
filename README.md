curl -X POST http://localhost:3002/verify \
  -H "Content-Type: application/json" \
  -d '{"nik": "3204280701000002", "nama": "987654321", "ttl": "20000101", "userId": "User1"}'

curl http://localhost:3002/status/User1
