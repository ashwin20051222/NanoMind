# Gateway Runbook

This page is the day-1 and day-2 operations guide for NanoMind.

## Local Startup

1. Start Ollama.
2. Run the Rust edge server on `3001`.
3. Run the Next.js frontend on `3000`.
4. Open the browser UI.
5. Optionally connect an ESP32 device.

## Suggested Port Layout

- UI: `127.0.0.1:3000`
- Edge: `127.0.0.1:3001`
- Ollama: `127.0.0.1:11434`

## Operational Checks

- UI Overview page loads
- edge status leaves `connecting`
- `GET /assistant` accepts a WebSocket upgrade
- Ollama responds at `OLLAMA_URL/api/generate`
- logs page shows runtime events

## Main Files

- [ai-assistant/edge_server/src/server.rs](../../ai-assistant/edge_server/src/server.rs)
- [ai-assistant/edge_server/src/websocket.rs](../../ai-assistant/edge_server/src/websocket.rs)
- [components/ControlConsole.tsx](../../components/ControlConsole.tsx)
- [api/wsClient.ts](../../api/wsClient.ts)

## When Things Go Wrong

- Use [Troubleshooting](../help/troubleshooting.md)
- Inspect [Protocol](./protocol.md)
- Inspect [API Reference](../reference/api-reference.md)
