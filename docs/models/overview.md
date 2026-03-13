# Model Routing Overview

NanoMind currently has two model-routing layers:

1. Rust edge-server routing
2. browser fallback routing

## Edge Routing

The edge server:

- checks integration handlers first
- tries local Ollama second
- falls back to cloud if local inference fails

Files:

- [ai-assistant/edge_server/src/llm_router.rs](../../ai-assistant/edge_server/src/llm_router.rs)
- [ai-assistant/edge_server/src/cloud_fallback.rs](../../ai-assistant/edge_server/src/cloud_fallback.rs)

## Browser Fallback

The frontend:

- can call Gemini directly if `NEXT_PUBLIC_GEMINI_API_KEY` is set
- can call local Ollama directly from the browser
- reports other browser model options as not implemented

Files:

- [hooks/useNanoMind.ts](../../hooks/useNanoMind.ts)

## Current Limitation

Responsibility is split between the browser and the edge server. That is workable for prototyping, but it is not the cleanest final architecture.
