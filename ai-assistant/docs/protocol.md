# Communication Protocol

## WebSocket Endpoint
`ws://<server_ip>:3000/assistant`

## Request Format (ESP32 -> Server)
```json
{
  "device_id": "esp32_s3_01",
  "token": "super_secret_token_123",
  "query": "turn on the lights",
  "timestamp": 123456
}
```

## Response Format (Server -> ESP32)
```json
{
  "response": "The lights have been turned on."
}
```
