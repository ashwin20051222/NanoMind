# Install Overview

NanoMind installation is split by runtime layer.

## Layers

- Frontend browser control UI
- Rust edge server
- ESP32-S3 firmware

## Host Requirements

- Node.js 24 recommended for the frontend
- Rust toolchain for the edge server
- Ollama for the local model path
- ESP-IDF 5.x for firmware builds

## Local Development Port Split

Use this layout for the least friction:

- Frontend: `127.0.0.1:3000`
- Edge server: `127.0.0.1:3001`
- Ollama: `127.0.0.1:11434`

## Installation Pages

- [Frontend Control UI](./frontend.md)
- [Rust Edge Server](./edge-server.md)
- [ESP32 Firmware](./firmware.md)

## Important Reality

The edge server code defaults to `PORT=3000`, but running it beside the Next.js dev server is easier if you override it to `3001`.

Code references:

- [ai-assistant/edge_server/src/config.rs](../../ai-assistant/edge_server/src/config.rs)
- [README.md](../../README.md)
