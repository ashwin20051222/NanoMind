# Agents Overview

NanoMind does not yet expose a multi-agent backend like OpenClaw. In the current repository, the main agent concept is the browser operator session plus the currently selected route.

## Agent Shape Today

- One browser operator session at a time
- Current device selection
- Current model selection
- Edge or cloud route based on connection state
- Local workflow definitions stored in browser storage

## Main Files

- [components/ControlConsole.tsx](../../components/ControlConsole.tsx)
- [components/ChatWindow.tsx](../../components/ChatWindow.tsx)
- [hooks/useNanoMind.ts](../../hooks/useNanoMind.ts)
- [components/AutomationWorkspace.tsx](../../components/AutomationWorkspace.tsx)

## Related Pages

- [24/7 Digital Worker](./digital-worker.md)
- [Workflows and Automation](./workflows.md)
