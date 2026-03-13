# Channels Overview

NanoMind exposes channel and integration surfaces in the UI, but the current repository only partially implements them.

## What Exists Today

- Browser UI surfaces for connected services
- Explicit `Not implemented` or `Not connected` states
- Edge-server placeholder handlers for Google and Meta keyword routes

## What Does Not Exist Yet

- OAuth connection flows
- token refresh lifecycle
- channel health APIs
- permission management backends
- message transport over real Google or Meta APIs

## Current Source Files

- [api/httpClient.ts](../../api/httpClient.ts)
- [ai-assistant/edge_server/src/integrations/mod.rs](../../ai-assistant/edge_server/src/integrations/mod.rs)
- [ai-assistant/edge_server/src/integrations/google.rs](../../ai-assistant/edge_server/src/integrations/google.rs)
- [ai-assistant/edge_server/src/integrations/meta.rs](../../ai-assistant/edge_server/src/integrations/meta.rs)
- [components/ControlConsole.tsx](../../components/ControlConsole.tsx)

## Pages

- [Google Workspace](./google-workspace.md)
- [Meta Apps](./meta-apps.md)
