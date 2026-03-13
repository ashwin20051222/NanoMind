# NanoMind Documentation

This documentation tree is structured to feel closer to the OpenClaw docs layout while staying accurate to the current NanoMind repository.

Until you provide the final GitHub repository URL, all links below are relative repository links. Once uploaded to GitHub, they work as repo file links automatically.

## Sections

### Get Started

- [Overview](./get-started/overview.md)
- [Quick Start](./get-started/quick-start.md)

### Install

- [Install Overview](./install/overview.md)
- [Frontend Control UI](./install/frontend.md)
- [Rust Edge Server](./install/edge-server.md)
- [ESP32 Firmware](./install/firmware.md)

### Channels

- [Channels Overview](./channels/overview.md)
- [Google Workspace](./channels/google-workspace.md)
- [Meta Apps](./channels/meta-apps.md)

### Agents

- [Agents Overview](./agents/overview.md)
- [24/7 Digital Worker](./agents/digital-worker.md)
- [Workflows and Automation](./agents/workflows.md)

### Tools

- [Operator Tools Overview](./tools/overview.md)

### Models

- [Model Routing Overview](./models/overview.md)

### Platforms

- [Platforms Overview](./platforms/overview.md)
- [Browser Control UI](./platforms/browser-control-ui.md)
- [ESP32-S3 Device Client](./platforms/esp32-s3.md)

### Gateway & Ops

- [Gateway Runbook](./gateway-ops/runbook.md)
- [Protocol](./gateway-ops/protocol.md)
- [Security](./gateway-ops/security.md)

### Reference

- [Repository Map](./reference/repository-map.md)
- [Frontend Files](./reference/frontend-files.md)
- [Rust Edge Server Files](./reference/edge-server-files.md)
- [Firmware Files](./reference/firmware-files.md)
- [Environment Variables](./reference/environment-variables.md)
- [API Reference](./reference/api-reference.md)

### Help

- [Troubleshooting](./help/troubleshooting.md)
- [FAQ](./help/faq.md)

## Source of Truth

The most important source files behind this documentation are:

- [README.md](../README.md)
- [app/page.tsx](../app/page.tsx)
- [components/ControlConsole.tsx](../components/ControlConsole.tsx)
- [components/ChatWindow.tsx](../components/ChatWindow.tsx)
- [components/AutomationWorkspace.tsx](../components/AutomationWorkspace.tsx)
- [hooks/useNanoMind.ts](../hooks/useNanoMind.ts)
- [api/wsClient.ts](../api/wsClient.ts)
- [api/httpClient.ts](../api/httpClient.ts)
- [ai-assistant/edge_server/src/main.rs](../ai-assistant/edge_server/src/main.rs)
- [ai-assistant/edge_server/src/server.rs](../ai-assistant/edge_server/src/server.rs)
- [ai-assistant/edge_server/src/websocket.rs](../ai-assistant/edge_server/src/websocket.rs)
- [ai-assistant/edge_server/src/llm_router.rs](../ai-assistant/edge_server/src/llm_router.rs)
- [ai-assistant/firmware/main/main.c](../ai-assistant/firmware/main/main.c)
- [ai-assistant/firmware/main/ai_client.cpp](../ai-assistant/firmware/main/ai_client.cpp)

## Current Reality

NanoMind currently ships:

- a working browser control UI
- a Rust edge server with HTTP and WebSocket routes
- ESP32 firmware for device connectivity
- a local-first model route with cloud fallback
- a browser-side workflow builder with import/export

NanoMind does not yet ship:

- a fully aligned browser-to-edge streaming protocol
- real integration APIs for Google or Meta
- a real pairing backend
- backend workflow execution and scheduling

## Next

Start here:

- [Get Started Overview](./get-started/overview.md)
- [Quick Start](./get-started/quick-start.md)
- [Repository Map](./reference/repository-map.md)
