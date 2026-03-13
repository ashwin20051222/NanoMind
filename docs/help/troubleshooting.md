# Troubleshooting

## The UI Loads but Stays Offline

Check:

- the Rust edge server is running
- `NEXT_PUBLIC_WS_URL` points to the correct port
- `NEXT_PUBLIC_AUTH_TOKEN` matches `AUTH_TOKEN`

Read:

- [Frontend Install](../install/frontend.md)
- [Edge Server Install](../install/edge-server.md)
- [Protocol](../gateway-ops/protocol.md)

## Frontend and Edge Both Try to Use Port 3000

Use:

- frontend on `3000`
- edge server on `3001`

Read:

- [Install Overview](../install/overview.md)

## Gemini Fallback Fails

Check:

- `NEXT_PUBLIC_GEMINI_API_KEY`

Relevant code:

- [hooks/useNanoMind.ts](../../hooks/useNanoMind.ts)

## Local Ollama Fails

Check:

- Ollama is running
- `llama3` is available
- `OLLAMA_URL` is correct

Relevant code:

- [ai-assistant/edge_server/src/llm_router.rs](../../ai-assistant/edge_server/src/llm_router.rs)
- [ai-assistant/edge_server/src/cloud_fallback.rs](../../ai-assistant/edge_server/src/cloud_fallback.rs)

## Integrations or Pairing Show Not Implemented

That is expected in the current repository state.

Read:

- [Channels Overview](../channels/overview.md)

## Workflows Exist but Do Not Run Automatically

That is expected.

The builder is local-only and there is no backend scheduler yet.

Read:

- [Workflows and Automation](../agents/workflows.md)
