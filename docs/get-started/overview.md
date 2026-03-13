# Get Started Overview

NanoMind is a local-first AI operating stack made of three runtime layers:

1. A browser control UI built with Next.js and React.
2. A Rust edge server built with Axum and Tokio.
3. An ESP32-S3 device client built on ESP-IDF and FreeRTOS.

## Intended Flow

```text
Browser UI or ESP32
        |
        v
 Rust edge server
        |
        +--> local Ollama model
        |
        +--> cloud fallback
```

## What Is in This Repository

- Frontend app at [app/](../../app)
- Frontend components at [components/](../../components)
- Frontend state and transport helpers at [hooks/](../../hooks) and [api/](../../api)
- Edge server at [ai-assistant/edge_server](../../ai-assistant/edge_server)
- Firmware at [ai-assistant/firmware](../../ai-assistant/firmware)
- Existing project notes at [ai-assistant/docs](../../ai-assistant/docs)

## Recommended Reading Order

1. [Quick Start](./quick-start.md)
2. [Install Overview](../install/overview.md)
3. [Gateway Runbook](../gateway-ops/runbook.md)
4. [Repository Map](../reference/repository-map.md)

## Key Current Constraints

- The browser UI and Rust WebSocket protocol are only partially aligned.
- The UI uses real runtime data only and no longer seeds demo data.
- Workflow definitions exist in browser storage today, not in a server scheduler.
- Integrations and pairing are surfaced in the UI, but their APIs are not implemented.

## Main Source Files

- [app/page.tsx](../../app/page.tsx)
- [components/ControlConsole.tsx](../../components/ControlConsole.tsx)
- [components/ChatWindow.tsx](../../components/ChatWindow.tsx)
- [hooks/useNanoMind.ts](../../hooks/useNanoMind.ts)
- [ai-assistant/edge_server/src/main.rs](../../ai-assistant/edge_server/src/main.rs)
- [ai-assistant/firmware/main/main.c](../../ai-assistant/firmware/main/main.c)
