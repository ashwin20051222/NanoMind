# Architecture

The AI Assistant system consists of three layers:

1. **Embedded Device Layer (ESP32-S3)**
   - Runs FreeRTOS.
   - Manages WiFi and WebSocket connections.
   - Sends user queries and receives AI responses.
   - Memory footprint optimized (< 200KB RAM).

2. **Edge AI Server Layer (Rust)**
   - Runs on a local laptop/server.
   - Built with Axum and Tokio.
   - Handles WebSocket connections from multiple ESP32 devices.
   - Routes queries to the local LLM.

3. **Cloud AI Fallback Layer**
   - If the local LLM is unreachable, the Rust server routes the query to OpenAI/Anthropic.
