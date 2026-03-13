# Workflows and Automation

NanoMind includes a workflow builder, but it is currently a local browser feature, not a backend automation system.

## What Works Today

- visual builder
- JSON builder
- import from NanoMind workflow JSON
- import from n8n export JSON
- import from OpenClaw-style `steps` or `actions` JSON
- export workflow JSON
- copy workflow JSON

## What Does Not Work Yet

- server-side workflow execution
- recurring scheduling backend
- device-triggered automation execution
- remote synchronization of workflow definitions

## Storage

Workflow definitions are stored in browser local storage using:

- `nanomind_automation_workflows_v3`

## Main File

- [components/AutomationWorkspace.tsx](../../components/AutomationWorkspace.tsx)

## Related Pages

- [Cron Jobs](../gateway-ops/runbook.md)
- [API Reference](../reference/api-reference.md)
