# Digital Worker

The NanoMind UI frames the main operator experience as a Digital Worker.

## What That Means in This Repo

- The `Chat` workspace is a control stream, not a consumer chat app.
- The active route can be local edge, reconnecting, or cloud fallback.
- Session state is browser-managed.
- The current selected device influences the query target when devices exist.

## Message Lifecycle

1. The operator enters a prompt in the chat composer.
2. The frontend store adds a user message locally.
3. If the edge is online, the request is sent over WebSocket.
4. If the edge is unavailable, the browser may attempt Gemini or local Ollama fallback.
5. AI responses are appended to the runtime stream.

## Key Files

- [components/ChatWindow.tsx](../../components/ChatWindow.tsx)
- [components/MessageBubble.tsx](../../components/MessageBubble.tsx)
- [hooks/useNanoMind.ts](../../hooks/useNanoMind.ts)
- [api/wsClient.ts](../../api/wsClient.ts)

## Important Limitation

The browser expects richer streaming semantics than the current Rust WebSocket server emits, so the digital worker experience is only partially integrated end to end.
