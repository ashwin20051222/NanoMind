# Browser Control UI

## Purpose

The browser UI is the main operator console for NanoMind.

## Current Structure

- top gateway bar
- grouped left sidebar
- central workspace area
- OpenClaw-style navigation sections

## Main Workspaces

- Chat
- Overview
- Channels
- Instances
- Sessions
- Usage
- Cron Jobs
- Agents
- Skills
- Nodes
- Config
- Debug
- Logs
- Docs

## Main Files

- [app/page.tsx](../../app/page.tsx)
- [app/layout.tsx](../../app/layout.tsx)
- [app/globals.css](../../app/globals.css)
- [components/ControlConsole.tsx](../../components/ControlConsole.tsx)
- [components/ChatWindow.tsx](../../components/ChatWindow.tsx)
- [components/AutomationWorkspace.tsx](../../components/AutomationWorkspace.tsx)
- [hooks/useNanoMind.ts](../../hooks/useNanoMind.ts)

## Important Constraint

The UI does not fake runtime or integration data anymore. If the backend is missing, the UI shows explicit unavailable states.
