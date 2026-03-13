# Quick Start

This page gives the shortest working paths for NanoMind.

## Option 1: Frontend Only

Use this to inspect the control UI.

1. Install dependencies with `npm install`.
2. Start the UI with `npm run dev`.
3. Open `http://127.0.0.1:3000`.

What you should expect:

- The UI loads.
- Connection state may show offline or reconnecting.
- Integrations and pairing will show `Not implemented`.
- Workflows can still be created and imported locally in the browser.

Related files:

- [package.json](../../package.json)
- [app/page.tsx](../../app/page.tsx)
- [components/ControlConsole.tsx](../../components/ControlConsole.tsx)

## Option 2: Frontend + Rust Edge Server

Use this to test a real local runtime path.

1. Start Ollama and ensure `llama3` is available.
2. Create `.env.local` for the frontend.
3. Create `ai-assistant/edge_server/.env` for the edge server.
4. Run the Rust server on `3001`.
5. Run the frontend on `3000`.

Read:

- [Frontend Install](../install/frontend.md)
- [Edge Server Install](../install/edge-server.md)

## Option 3: Full Stack with ESP32

Use this to include the device layer.

1. Complete Option 2.
2. Configure firmware credentials in [config.h](../../ai-assistant/firmware/main/config.h).
3. Build and flash the ESP32 firmware.

Read:

- [Firmware Install](../install/firmware.md)
- [ESP32-S3 Device Client](../platforms/esp32-s3.md)

## After You Are Running

- Open [Overview](../get-started/overview.md)
- Check [Gateway Runbook](../gateway-ops/runbook.md)
- Use [Troubleshooting](../help/troubleshooting.md) if the route is offline
