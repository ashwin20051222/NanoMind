# Rust Edge Server Install

## Purpose

The edge server is the local routing layer between the browser or device clients and the model providers.

## Prerequisites

- Rust toolchain via `rustup`
- Ollama installed locally
- `llama3` available in Ollama

## Environment

Create `ai-assistant/edge_server/.env`:

```env
PORT=3001
OLLAMA_URL=http://localhost:11434
AUTH_TOKEN=super_secret_token_123
CLOUD_API_KEY=
```

## Run

```bash
cd ai-assistant/edge_server
cargo run --release
```

## Main Responsibilities

- Serve `POST /query`
- Serve `GET /assistant`
- Authenticate requests with the shared token
- Route queries to integration handlers first
- Try local Ollama second
- Fall back to cloud if local fails

## Main Files

- [ai-assistant/edge_server/src/main.rs](../../ai-assistant/edge_server/src/main.rs)
- [ai-assistant/edge_server/src/config.rs](../../ai-assistant/edge_server/src/config.rs)
- [ai-assistant/edge_server/src/server.rs](../../ai-assistant/edge_server/src/server.rs)
- [ai-assistant/edge_server/src/websocket.rs](../../ai-assistant/edge_server/src/websocket.rs)
- [ai-assistant/edge_server/src/llm_router.rs](../../ai-assistant/edge_server/src/llm_router.rs)
- [ai-assistant/edge_server/src/cloud_fallback.rs](../../ai-assistant/edge_server/src/cloud_fallback.rs)
- [ai-assistant/edge_server/src/session_manager.rs](../../ai-assistant/edge_server/src/session_manager.rs)

## Current Limitations

- WebSocket streaming is not yet aligned with the browser client.
- Integration handlers are placeholder logic today.
- There is no server-side workflow scheduler.
