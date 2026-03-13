# Frontend Files

This page lists the current frontend files one by one.

## App Router

- [app/page.tsx](../../app/page.tsx): mounts the main control console.
- [app/layout.tsx](../../app/layout.tsx): metadata, manifest, icons, and root layout.
- [app/globals.css](../../app/globals.css): theme tokens and global styles.
- [app/icon.svg](../../app/icon.svg): app icon.

## Components

- [components/ControlConsole.tsx](../../components/ControlConsole.tsx): OpenClaw-style shell and workspaces.
- [components/ChatWindow.tsx](../../components/ChatWindow.tsx): chat workspace.
- [components/AutomationWorkspace.tsx](../../components/AutomationWorkspace.tsx): workflow builder and importer.
- [components/MessageBubble.tsx](../../components/MessageBubble.tsx): runtime stream row renderer.
- [components/SettingsPanel.tsx](../../components/SettingsPanel.tsx): settings surface.
- [components/DeviceList.tsx](../../components/DeviceList.tsx): legacy device list component.
- [components/PWARegister.tsx](../../components/PWARegister.tsx): service-worker registration helper.

## Hooks

- [hooks/useNanoMind.ts](../../hooks/useNanoMind.ts): runtime store, model fallback logic, device selection, message state.
- [hooks/use-mobile.ts](../../hooks/use-mobile.ts): mobile helper.

## Browser Transport

- [api/wsClient.ts](../../api/wsClient.ts): browser WebSocket client with reconnect handling.
- [api/httpClient.ts](../../api/httpClient.ts): integration and pairing API placeholders.

## Public Assets

- [public/manifest.json](../../public/manifest.json)
- [public/nanomind-logo.svg](../../public/nanomind-logo.svg)
- [public/nanomind-mark.svg](../../public/nanomind-mark.svg)
- [public/sw.js](../../public/sw.js)
