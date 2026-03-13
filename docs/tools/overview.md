# Operator Tools Overview

NanoMind does not currently expose a first-class tool inventory like OpenClaw. The current repository instead ships operator-facing surfaces and helper features.

## Operator Tools Available Today

- Chat workspace
- Runtime logs viewer
- Debug snapshot viewer
- Workflow builder and importer
- Device inventory
- Configuration viewer

## Main Files

- [components/ControlConsole.tsx](../../components/ControlConsole.tsx)
- [components/ChatWindow.tsx](../../components/ChatWindow.tsx)
- [components/AutomationWorkspace.tsx](../../components/AutomationWorkspace.tsx)
- [api/wsClient.ts](../../api/wsClient.ts)
- [api/httpClient.ts](../../api/httpClient.ts)

## Important Distinction

This repository does not yet define a robust model-tool contract for function calling or tool inventories. The current “tools” are UI and transport features rather than a mature agent tool registry.
