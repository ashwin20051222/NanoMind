# Meta Apps

## Current Repository State

Meta Apps is not implemented as a real backend integration.

The UI only reports unavailable state, and the Rust edge server contains placeholder keyword logic for WhatsApp, Messenger, and Instagram.

## Relevant Files

- [api/httpClient.ts](../../api/httpClient.ts)
- [ai-assistant/edge_server/src/integrations/meta.rs](../../ai-assistant/edge_server/src/integrations/meta.rs)
- [components/ControlConsole.tsx](../../components/ControlConsole.tsx)

## Current Behavior

- UI: disabled control state
- HTTP helper: throws `Integrations API not implemented`
- Edge server: may return placeholder Meta-related text if the query hits the integration router

## What a Real Implementation Needs

- Meta OAuth and app configuration
- account and page binding
- WhatsApp / Messenger / Instagram API clients
- permission scopes and route selection
- telemetry and failure reporting
