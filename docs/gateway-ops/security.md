# Gateway Security

## Current Security Model

NanoMind currently uses a shared-token model.

The token is:

- sent from the browser to the edge server
- sent from the firmware to the edge server
- checked in both HTTP and WebSocket paths

## Implemented

- constant-time token comparison in the edge server
- shared auth token across browser and firmware
- browser-side secure-context `ws://` to `wss://` upgrade attempt

## Not Implemented Yet

- per-user auth
- per-device credential rotation
- OAuth provider auth lifecycle
- secrets vault
- role-based authorization

## Main Files

- [ai-assistant/edge_server/src/server.rs](../../ai-assistant/edge_server/src/server.rs)
- [ai-assistant/edge_server/src/websocket.rs](../../ai-assistant/edge_server/src/websocket.rs)
- [api/wsClient.ts](../../api/wsClient.ts)
- [ai-assistant/firmware/main/config.h](../../ai-assistant/firmware/main/config.h)
