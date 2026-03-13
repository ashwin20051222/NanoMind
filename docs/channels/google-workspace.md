# Google Workspace

## Current Repository State

Google Workspace is not implemented as a real integration backend.

The UI only reports unavailable state, and the Rust edge server contains a placeholder keyword handler for queries mentioning Calendar, Gmail, or Drive.

## Relevant Files

- [api/httpClient.ts](../../api/httpClient.ts)
- [ai-assistant/edge_server/src/integrations/google.rs](../../ai-assistant/edge_server/src/integrations/google.rs)
- [components/ControlConsole.tsx](../../components/ControlConsole.tsx)

## Current Behavior

- UI: disabled control state
- HTTP helper: throws `Integrations API not implemented`
- Edge server: may return placeholder Google-related text if a query matches the simple integration router

## What a Real Implementation Needs

- OAuth install and callback flow
- token storage and refresh
- Calendar, Gmail, and Drive client wrappers
- permission scopes model
- audit logs and health reporting
