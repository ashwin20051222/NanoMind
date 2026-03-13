# Frontend Control UI Install

## Purpose

The frontend is the operator-facing control UI for NanoMind.

## Prerequisites

- Node.js 24 recommended
- npm available

## Install

```bash
npm install
```

## Environment

Create `.env.local` at the repository root:

```env
NEXT_PUBLIC_WS_URL=ws://localhost:3001/assistant
NEXT_PUBLIC_AUTH_TOKEN=super_secret_token_123
NEXT_PUBLIC_GEMINI_API_KEY=
```

## Run

```bash
npm run dev
```

Open `http://127.0.0.1:3000`.

## What This UI Includes

- OpenClaw-style grouped control shell
- Chat workspace
- Overview, Channels, Instances, Sessions, Usage, and Cron Jobs
- Agents, Skills, Nodes, Config, Debug, Logs, and Docs pages
- Theme switcher
- Workflow builder embedded under Cron Jobs

## Main Files

- [app/page.tsx](../../app/page.tsx)
- [app/layout.tsx](../../app/layout.tsx)
- [app/globals.css](../../app/globals.css)
- [components/ControlConsole.tsx](../../components/ControlConsole.tsx)
- [components/ChatWindow.tsx](../../components/ChatWindow.tsx)
- [components/AutomationWorkspace.tsx](../../components/AutomationWorkspace.tsx)
- [components/MessageBubble.tsx](../../components/MessageBubble.tsx)
- [hooks/useNanoMind.ts](../../hooks/useNanoMind.ts)
- [api/wsClient.ts](../../api/wsClient.ts)
- [api/httpClient.ts](../../api/httpClient.ts)

## Current Limitations

- WebSocket payload expectations are richer than the Rust server currently returns.
- Gemini browser fallback requires `NEXT_PUBLIC_GEMINI_API_KEY`.
- Integrations and pairing backends are not implemented.
