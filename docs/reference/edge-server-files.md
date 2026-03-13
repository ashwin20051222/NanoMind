# Rust Edge Server Files

This page lists the Rust edge server files one by one.

## Entry and Core

- [main.rs](../../ai-assistant/edge_server/src/main.rs): starts tracing and launches the server.
- [config.rs](../../ai-assistant/edge_server/src/config.rs): loads environment values.
- [server.rs](../../ai-assistant/edge_server/src/server.rs): defines routes and HTTP request handling.
- [websocket.rs](../../ai-assistant/edge_server/src/websocket.rs): upgrades WebSocket requests and handles socket traffic.

## Routing and Runtime

- [llm_router.rs](../../ai-assistant/edge_server/src/llm_router.rs): integration interception, Ollama route, cloud fallback route.
- [cloud_fallback.rs](../../ai-assistant/edge_server/src/cloud_fallback.rs): OpenAI-compatible fallback path.
- [session_manager.rs](../../ai-assistant/edge_server/src/session_manager.rs): session container.

## Integrations

- [integrations/mod.rs](../../ai-assistant/edge_server/src/integrations/mod.rs): integration dispatch.
- [integrations/google.rs](../../ai-assistant/edge_server/src/integrations/google.rs): placeholder Google logic.
- [integrations/meta.rs](../../ai-assistant/edge_server/src/integrations/meta.rs): placeholder Meta logic.

## Current State

- HTTP route implemented
- WebSocket route implemented
- token auth implemented
- local Ollama route implemented
- cloud fallback implemented
- integrations are placeholders, not real provider clients
