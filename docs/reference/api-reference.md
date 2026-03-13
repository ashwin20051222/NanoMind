# API Reference

This page documents the API surfaces that exist in the repository today.

## Edge Server HTTP

### `POST /query`

Purpose:

- device-style request path

Implemented in:

- [ai-assistant/edge_server/src/server.rs](../../ai-assistant/edge_server/src/server.rs)

Request fields:

- `device_id`
- `token`
- `query`

Response fields:

- `response`

## Edge Server WebSocket

### `GET /assistant`

Purpose:

- WebSocket runtime connection

Implemented in:

- [ai-assistant/edge_server/src/websocket.rs](../../ai-assistant/edge_server/src/websocket.rs)

Current request fields:

- `device_id`
- `token`
- `query`
- `timestamp`

Current response fields:

- `response`

## Browser Helper APIs

### `fetchIntegrations`

File:

- [api/httpClient.ts](../../api/httpClient.ts)

Current behavior:

- throws `Integrations API not implemented`

### `generatePairingToken`

File:

- [api/httpClient.ts](../../api/httpClient.ts)

Current behavior:

- throws `Pairing API not implemented`

## Browser WebSocket Client

File:

- [api/wsClient.ts](../../api/wsClient.ts)

Current behaviors:

- reconnect backoff
- `nanomind-protocol-v1` subprotocol request
- auth frame sent on open
- queue for messages while reconnecting
