# Gateway Protocol

NanoMind currently has two protocol realities:

1. the simple Rust server protocol
2. the richer frontend expectation

## Rust Edge Server HTTP

Endpoint:

- `POST /query`

Request:

```json
{
  "device_id": "esp32-1",
  "token": "super_secret_token_123",
  "query": "hello"
}
```

Response:

```json
{
  "response": "..."
}
```

## Rust Edge Server WebSocket

Endpoint:

- `GET /assistant`

Current request shape expected by the Rust server:

```json
{
  "device_id": "esp32-1",
  "token": "super_secret_token_123",
  "query": "hello",
  "timestamp": 1710000000
}
```

Current response shape:

```json
{
  "response": "..."
}
```

## Frontend Expectation

The browser currently expects a richer event model with things like:

- auth confirmation
- device inventory
- response chunks
- response end events
- route and source metadata

It also opens the socket with:

- `nanomind-protocol-v1`

## Main Files

- [api/wsClient.ts](../../api/wsClient.ts)
- [hooks/useNanoMind.ts](../../hooks/useNanoMind.ts)
- [ai-assistant/edge_server/src/websocket.rs](../../ai-assistant/edge_server/src/websocket.rs)
- [ai-assistant/edge_server/src/server.rs](../../ai-assistant/edge_server/src/server.rs)

## Main Gap

The frontend and edge server are not protocol-complete with each other yet.
