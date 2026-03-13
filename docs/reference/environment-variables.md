# Environment Variables

This page lists the main NanoMind environment and config values.

## Frontend

- `NEXT_PUBLIC_WS_URL`: browser WebSocket endpoint
- `NEXT_PUBLIC_AUTH_TOKEN`: browser token for edge auth
- `NEXT_PUBLIC_GEMINI_API_KEY`: required for direct Gemini browser fallback

Relevant code:

- [components/ControlConsole.tsx](../../components/ControlConsole.tsx)
- [hooks/useNanoMind.ts](../../hooks/useNanoMind.ts)

## Edge Server

- `PORT`: edge-server listen port
- `OLLAMA_URL`: local Ollama base URL
- `AUTH_TOKEN`: shared auth token
- `CLOUD_API_KEY`: cloud fallback credential

Relevant code:

- [ai-assistant/edge_server/src/config.rs](../../ai-assistant/edge_server/src/config.rs)
- [ai-assistant/edge_server/src/cloud_fallback.rs](../../ai-assistant/edge_server/src/cloud_fallback.rs)

## Firmware

Firmware uses compile-time values in:

- [ai-assistant/firmware/main/config.h](../../ai-assistant/firmware/main/config.h)

Current values include:

- `WIFI_SSID`
- `WIFI_PASS`
- `SERVER_URI`
- `DEVICE_ID`
- `AUTH_TOKEN`

## Important Note

The root [.env.example](../../.env.example) is not yet a full source of truth for the whole stack.
