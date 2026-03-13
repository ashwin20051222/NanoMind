'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Bot,
  Braces,
  Cloud,
  Copy,
  Cpu,
  Download,
  FileJson,
  FileUp,
  GitBranch,
  GripVertical,
  Play,
  Plus,
  Save,
  TimerReset,
  Trash2,
  Upload,
  WandSparkles,
  Workflow,
} from 'lucide-react';

type WorkflowStatus = 'Enabled' | 'Paused' | 'Draft';
type WorkflowSource = 'native' | 'n8n' | 'openclaw' | 'json';
type BuilderMode = 'visual' | 'code';
type NodeKind = 'trigger' | 'ai_prompt' | 'device_command' | 'integration_action' | 'condition' | 'delay';
type ImportHint = 'auto' | WorkflowSource;

type WorkflowNode = {
  id: string;
  kind: NodeKind;
  title: string;
  config: string;
  provider?: string;
};

type AutomationWorkflow = {
  id: string;
  name: string;
  description: string;
  status: WorkflowStatus;
  target: string;
  nextRun: string;
  route: string;
  source: WorkflowSource;
  updatedAt: string;
  nodes: WorkflowNode[];
};

const STORAGE_KEY = 'nanomind_automation_workflows_v4';
const LEGACY_STORAGE_KEYS = ['nanomind_automation_workflows_v3'];
const panelClass = 'rounded-[22px] border border-[color:var(--border)] bg-[var(--surface)]';
const mutedPanelClass = 'rounded-[20px] border border-[color:var(--border)] bg-[var(--surface-muted)]';
const fieldClass =
  'w-full rounded-xl border border-[color:var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-sm text-[var(--text)] outline-none transition focus:border-[color:var(--text)] focus:bg-[var(--surface)]';

const NODE_LIBRARY: Array<{
  kind: NodeKind;
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}> = [
  { kind: 'trigger', label: 'Trigger', description: 'Cron, webhook, or manual start', icon: Play },
  { kind: 'ai_prompt', label: 'AI step', description: 'Prompt a local or cloud model', icon: Bot },
  { kind: 'device_command', label: 'Device command', description: 'Send instructions to ESP32 nodes', icon: Cpu },
  { kind: 'integration_action', label: 'Integration', description: 'Call Google, Meta, or external tools', icon: Cloud },
  { kind: 'condition', label: 'Condition', description: 'Branch on message, state, or device health', icon: GitBranch },
  { kind: 'delay', label: 'Delay', description: 'Wait or schedule a follow-up action', icon: TimerReset },
];

const IMPORT_SOURCES: Array<{ key: ImportHint; label: string; description: string }> = [
  { key: 'auto', label: 'Auto-detect', description: 'Detect n8n, OpenClaw-style, or generic JSON' },
  { key: 'n8n', label: 'n8n', description: 'Import exported workflow JSON with nodes and connections' },
  { key: 'openclaw', label: 'OpenClaw-style', description: 'Import workflow or steps arrays from control-style exports' },
  { key: 'json', label: 'Generic JSON', description: 'Import NanoMind or custom workflow definitions' },
];

const INITIAL_WORKFLOWS: AutomationWorkflow[] = [];

function makeId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function makeNode(kind: NodeKind, title?: string, config?: string, provider?: string): WorkflowNode {
  return {
    id: makeId('node'),
    kind,
    title: title || nodeLabel(kind),
    config:
      config ||
      {
        trigger: 'Manual trigger',
        ai_prompt: 'Describe the prompt or task for the model',
        device_command: 'Describe the device action',
        integration_action: 'Describe the external integration call',
        condition: 'Describe the condition to evaluate',
        delay: 'Describe the wait duration or schedule',
      }[kind],
    provider,
  };
}

function nodeLabel(kind: NodeKind) {
  return (
    {
      trigger: 'Trigger',
      ai_prompt: 'AI step',
      device_command: 'Device command',
      integration_action: 'Integration action',
      condition: 'Condition',
      delay: 'Delay',
    }[kind] || 'Step'
  );
}

function sourceLabel(source: WorkflowSource) {
  return (
    {
      native: 'NanoMind',
      n8n: 'n8n',
      openclaw: 'OpenClaw-style',
      json: 'JSON',
    }[source] || source
  );
}

function workflowFingerprint(workflow: AutomationWorkflow) {
  return JSON.stringify({
    name: workflow.name.trim().toLowerCase(),
    description: workflow.description.trim().toLowerCase(),
    target: workflow.target.trim().toLowerCase(),
    route: workflow.route.trim().toLowerCase(),
    source: workflow.source,
    nodes: workflow.nodes.map((node) => ({
      kind: node.kind,
      title: node.title.trim().toLowerCase(),
      config: node.config.trim().toLowerCase(),
      provider: node.provider?.trim().toLowerCase() || '',
    })),
  });
}

function sanitizeWorkflows(input: unknown): AutomationWorkflow[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const fingerprints = new Set<string>();
  const normalized: AutomationWorkflow[] = [];

  for (const candidate of input) {
    const workflow = normalizeWorkflow((candidate || {}) as Partial<AutomationWorkflow>, 'native');
    const fingerprint = workflowFingerprint(workflow);
    if (fingerprints.has(fingerprint)) {
      continue;
    }

    fingerprints.add(fingerprint);
    normalized.push(workflow);
  }

  return normalized;
}

function loadInitialWorkflows() {
  if (typeof window === 'undefined') {
    return INITIAL_WORKFLOWS;
  }

  const keys = [STORAGE_KEY, ...LEGACY_STORAGE_KEYS];
  for (const key of keys) {
    const saved = window.localStorage.getItem(key);
    if (!saved) {
      continue;
    }

    try {
      const parsed = JSON.parse(saved);
      const normalized = sanitizeWorkflows(parsed);
      if (normalized.length > 0) {
        return normalized;
      }
    } catch {
      return INITIAL_WORKFLOWS;
    }
  }

  return INITIAL_WORKFLOWS;
}

function nextWorkflowName(workflows: AutomationWorkflow[], mode: BuilderMode) {
  const base = mode === 'code' ? 'Digital Worker JSON' : 'Digital Worker';
  const existing = new Set(workflows.map((workflow) => workflow.name.trim().toLowerCase()));
  if (!existing.has(base.toLowerCase())) {
    return base;
  }

  let index = 2;
  while (existing.has(`${base} ${index}`.toLowerCase())) {
    index += 1;
  }

  return `${base} ${index}`;
}

function serializeWorkflow(workflow: AutomationWorkflow) {
  return JSON.stringify(
    {
      schemaVersion: 1,
      type: 'nanomind-workflow',
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      status: workflow.status,
      target: workflow.target,
      nextRun: workflow.nextRun,
      route: workflow.route,
      source: workflow.source,
      nodes: workflow.nodes,
    },
    null,
    2
  );
}

function normalizeWorkflow(parsed: Partial<AutomationWorkflow>, fallbackSource: WorkflowSource): AutomationWorkflow {
  const nodes = Array.isArray(parsed.nodes)
    ? parsed.nodes.map((node) => ({
        id: typeof node.id === 'string' ? node.id : makeId('node'),
        kind: (typeof node.kind === 'string' ? node.kind : 'ai_prompt') as NodeKind,
        title: typeof node.title === 'string' ? node.title : nodeLabel((node.kind as NodeKind) || 'ai_prompt'),
        config: typeof node.config === 'string' ? node.config : 'Imported step',
        provider: typeof node.provider === 'string' ? node.provider : undefined,
      }))
    : [makeNode('trigger'), makeNode('ai_prompt')];

  return {
    id: typeof parsed.id === 'string' ? parsed.id : makeId('wf'),
    name: typeof parsed.name === 'string' ? parsed.name : 'Imported workflow',
    description: typeof parsed.description === 'string' ? parsed.description : 'Imported into NanoMind automation.',
    status:
      parsed.status === 'Enabled' || parsed.status === 'Paused' || parsed.status === 'Draft'
        ? parsed.status
        : 'Draft',
    target: typeof parsed.target === 'string' ? parsed.target : 'Imported target',
    nextRun: typeof parsed.nextRun === 'string' ? parsed.nextRun : 'Manual',
    route: typeof parsed.route === 'string' ? parsed.route : 'Imported',
    source: parsed.source || fallbackSource,
    updatedAt: 'Imported just now',
    nodes,
  };
}

function inferNodeKind(typeText: string): NodeKind {
  const normalized = typeText.toLowerCase();
  if (normalized.includes('trigger') || normalized.includes('schedule') || normalized.includes('webhook')) {
    return 'trigger';
  }
  if (normalized.includes('wait') || normalized.includes('delay')) {
    return 'delay';
  }
  if (normalized.includes('if') || normalized.includes('switch') || normalized.includes('branch')) {
    return 'condition';
  }
  if (
    normalized.includes('http') ||
    normalized.includes('google') ||
    normalized.includes('slack') ||
    normalized.includes('messenger') ||
    normalized.includes('whatsapp') ||
    normalized.includes('instagram') ||
    normalized.includes('meta')
  ) {
    return 'integration_action';
  }
  if (normalized.includes('device') || normalized.includes('esp32') || normalized.includes('gpio')) {
    return 'device_command';
  }
  return 'ai_prompt';
}

function parseWorkflowImport(rawText: string, hint: ImportHint): AutomationWorkflow {
  const parsed = JSON.parse(rawText);

  if (parsed && parsed.type === 'nanomind-workflow' && Array.isArray(parsed.nodes)) {
    return normalizeWorkflow(parsed, 'json');
  }

  if ((hint === 'auto' || hint === 'n8n') && parsed && Array.isArray(parsed.nodes)) {
    return normalizeWorkflow(
      {
        name: typeof parsed.name === 'string' ? parsed.name : 'Imported n8n workflow',
        description: 'Imported from n8n JSON export.',
        status: parsed.active ? 'Enabled' : 'Draft',
        target: 'External automation graph',
        nextRun: parsed.active ? 'Configured in imported flow' : 'Manual',
        route: 'Imported n8n',
        source: 'n8n',
        nodes: parsed.nodes.map((node: Record<string, unknown>) => ({
          id: typeof node.id === 'string' ? node.id : makeId('node'),
          kind: inferNodeKind(String(node.type || node.name || '')),
          title: typeof node.name === 'string' ? node.name : nodeLabel(inferNodeKind(String(node.type || ''))),
          config: `Type: ${String(node.type || 'unknown')}`,
          provider: typeof node.type === 'string' ? node.type : undefined,
        })),
      },
      'n8n'
    );
  }

  if (hint === 'openclaw' || hint === 'auto') {
    const stepList = Array.isArray(parsed?.steps)
      ? parsed.steps
      : Array.isArray(parsed?.workflow?.steps)
        ? parsed.workflow.steps
        : Array.isArray(parsed?.actions)
          ? parsed.actions
          : Array.isArray(parsed?.workflow?.actions)
            ? parsed.workflow.actions
            : null;

    if (stepList) {
      return normalizeWorkflow(
        {
          name:
            typeof parsed.name === 'string'
              ? parsed.name
              : typeof parsed?.workflow?.name === 'string'
                ? parsed.workflow.name
                : 'Imported OpenClaw workflow',
          description: 'Imported from an OpenClaw-style workflow definition.',
          status: 'Draft',
          target: 'Operator automation',
          nextRun: 'Manual',
          route: 'Imported OpenClaw-style flow',
          source: 'openclaw',
          nodes: stepList.map((step: Record<string, unknown>) => ({
            id: typeof step.id === 'string' ? step.id : makeId('node'),
            kind: inferNodeKind(String(step.type || step.kind || step.action || step.name || '')),
            title: String(step.name || step.title || step.action || 'Imported step'),
            config: String(step.prompt || step.config || step.description || step.type || 'Imported action'),
            provider:
              typeof step.provider === 'string'
                ? step.provider
                : typeof step.integration === 'string'
                  ? step.integration
                  : undefined,
          })),
        },
        'openclaw'
      );
    }
  }

  if (parsed && (Array.isArray(parsed.steps) || Array.isArray(parsed.actions) || Array.isArray(parsed.workflow?.nodes))) {
    const nodes = (parsed.steps || parsed.actions || parsed.workflow?.nodes || []).map((step: Record<string, unknown>) => ({
      id: typeof step.id === 'string' ? step.id : makeId('node'),
      kind: inferNodeKind(String(step.type || step.kind || step.name || '')),
      title: String(step.name || step.title || 'Imported step'),
      config: String(step.config || step.prompt || step.description || 'Imported step'),
      provider: typeof step.provider === 'string' ? step.provider : undefined,
    }));

    return normalizeWorkflow(
      {
        name: typeof parsed.name === 'string' ? parsed.name : 'Imported JSON workflow',
        description: 'Imported from a generic workflow JSON definition.',
        status: 'Draft',
        target: 'Imported target',
        nextRun: 'Manual',
        route: 'Imported JSON',
        source: 'json',
        nodes,
      },
      'json'
    );
  }

  throw new Error('Unsupported workflow format. Paste NanoMind JSON, n8n export JSON, or an OpenClaw-style steps/actions export.');
}

export default function AutomationWorkspace({ embedded = false }: { embedded?: boolean }) {
  const [workflows, setWorkflows] = useState<AutomationWorkflow[]>(() => loadInitialWorkflows());
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return INITIAL_WORKFLOWS[0]?.id || null;
    const saved = window.localStorage.getItem(`${STORAGE_KEY}:selected`);
    return saved || null;
  });
  const [builderMode, setBuilderMode] = useState<BuilderMode>('visual');
  const [importHint, setImportHint] = useState<ImportHint>('auto');
  const [importText, setImportText] = useState('');
  const [importNotice, setImportNotice] = useState('Import from n8n, OpenClaw-style JSON, or NanoMind JSON.');
  const [codeDraft, setCodeDraft] = useState('');
  const [draggingNodeKind, setDraggingNodeKind] = useState<NodeKind | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const effectiveSelectedWorkflowId =
    selectedWorkflowId && workflows.some((workflow) => workflow.id === selectedWorkflowId)
      ? selectedWorkflowId
      : workflows[0]?.id || null;
  const selectedWorkflow =
    workflows.find((workflow) => workflow.id === effectiveSelectedWorkflowId) || null;
  const enabledCount = workflows.filter((workflow) => workflow.status === 'Enabled').length;
  const importedCount = workflows.filter((workflow) => workflow.source !== 'native').length;

  useEffect(() => {
    const normalized = sanitizeWorkflows(workflows);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    LEGACY_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));
    window.dispatchEvent(new Event('nanomind:workflows-changed'));
  }, [workflows]);

  useEffect(() => {
    if (!effectiveSelectedWorkflowId) return;
    window.localStorage.setItem(`${STORAGE_KEY}:selected`, effectiveSelectedWorkflowId);
  }, [effectiveSelectedWorkflowId]);

  const selectWorkflow = (workflowId: string) => {
    const workflow = workflows.find((entry) => entry.id === workflowId);
    setSelectedWorkflowId(workflowId);
    if (workflow) {
      setCodeDraft(serializeWorkflow(workflow));
    }
  };

  const updateSelectedWorkflow = (updater: (workflow: AutomationWorkflow) => AutomationWorkflow) => {
    if (!effectiveSelectedWorkflowId) return;
    setWorkflows((current) =>
      current.map((workflow) =>
        workflow.id === effectiveSelectedWorkflowId
          ? { ...updater(workflow), updatedAt: 'Saved just now' }
          : workflow
      )
    );
  };

  const createBlankWorkflow = (mode: BuilderMode) => {
    const workflow: AutomationWorkflow = {
      id: makeId('wf'),
      name: nextWorkflowName(workflows, mode),
      description:
        mode === 'code'
          ? 'Define the worker in JSON.'
          : 'Build the worker with visual steps.',
      status: 'Draft',
      target: 'Choose a target',
      nextRun: 'Manual',
      route: 'Local first',
      source: 'native',
      updatedAt: 'Created just now',
      nodes: mode === 'code' ? [makeNode('trigger')] : [],
    };

    setWorkflows((current) => sanitizeWorkflows([workflow, ...current]));
    setSelectedWorkflowId(workflow.id);
    setCodeDraft(serializeWorkflow(workflow));
    setBuilderMode(mode);
    setImportNotice(mode === 'code' ? 'New JSON worker created.' : 'New worker created.');
  };

  const addNode = (kind: NodeKind) => {
    updateSelectedWorkflow((workflow) => ({
      ...workflow,
      nodes: [...workflow.nodes, makeNode(kind)],
    }));
  };

  const moveNode = (index: number, direction: -1 | 1) => {
    updateSelectedWorkflow((workflow) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= workflow.nodes.length) return workflow;
      const nodes = [...workflow.nodes];
      const [item] = nodes.splice(index, 1);
      nodes.splice(nextIndex, 0, item);
      return { ...workflow, nodes };
    });
  };

  const updateNode = (nodeId: string, patch: Partial<WorkflowNode>) => {
    updateSelectedWorkflow((workflow) => ({
      ...workflow,
      nodes: workflow.nodes.map((node) => (node.id === nodeId ? { ...node, ...patch } : node)),
    }));
  };

  const removeNode = (nodeId: string) => {
    updateSelectedWorkflow((workflow) => ({
      ...workflow,
      nodes: workflow.nodes.filter((node) => node.id !== nodeId),
    }));
  };

  const deleteSelectedWorkflow = () => {
    if (!selectedWorkflow) return;
    setWorkflows((current) => current.filter((workflow) => workflow.id !== selectedWorkflow.id));
    setImportNotice(`Removed ${selectedWorkflow.name}.`);
  };

  const applyCodeChanges = () => {
    if (!selectedWorkflow) return;
    try {
      const parsed = parseWorkflowImport(codeDraft, 'json');
      setWorkflows((current) =>
        current.map((workflow) =>
          workflow.id === selectedWorkflow.id
            ? { ...parsed, id: workflow.id, updatedAt: 'Saved just now' }
            : workflow
        )
      );
      setImportNotice('Workflow JSON applied successfully.');
    } catch (error) {
      setImportNotice(error instanceof Error ? error.message : 'Unable to parse workflow JSON.');
    }
  };

  const copySelectedWorkflow = async () => {
    if (!selectedWorkflow) return;
    const payload = serializeWorkflow(selectedWorkflow);
    try {
      await navigator.clipboard.writeText(payload);
      setImportNotice('Workflow JSON copied to clipboard.');
    } catch {
      setImportNotice('Clipboard access failed. You can still copy the JSON from the editor.');
    }
  };

  const exportSelectedWorkflow = () => {
    if (!selectedWorkflow) return;
    const blob = new Blob([serializeWorkflow(selectedWorkflow)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${selectedWorkflow.name.toLowerCase().replace(/\s+/g, '-')}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setImportNotice('Workflow JSON exported.');
  };

  const importWorkflowText = () => {
    try {
      const parsed = parseWorkflowImport(importText, importHint);
      const duplicate = workflows.find(
        (workflow) => workflowFingerprint(workflow) === workflowFingerprint(parsed)
      );
      if (duplicate) {
        setSelectedWorkflowId(duplicate.id);
        setCodeDraft(serializeWorkflow(duplicate));
        setBuilderMode('visual');
        setImportText('');
        setImportNotice(`${duplicate.name} is already in the library.`);
        return;
      }

      setWorkflows((current) => sanitizeWorkflows([parsed, ...current]));
      setSelectedWorkflowId(parsed.id);
      setCodeDraft(serializeWorkflow(parsed));
      setBuilderMode('visual');
      setImportText('');
      setImportNotice(`Imported ${parsed.name} from ${sourceLabel(parsed.source)}.`);
    } catch (error) {
      setImportNotice(error instanceof Error ? error.message : 'Import failed.');
    }
  };

  const handleFileImport = async (file?: File | null) => {
    if (!file) return;
    try {
      const text = await file.text();
      setImportText(text);
      const parsed = parseWorkflowImport(text, importHint);
      const duplicate = workflows.find(
        (workflow) => workflowFingerprint(workflow) === workflowFingerprint(parsed)
      );
      if (duplicate) {
        setSelectedWorkflowId(duplicate.id);
        setCodeDraft(serializeWorkflow(duplicate));
        setBuilderMode('visual');
        setImportNotice(`${duplicate.name} is already in the library.`);
        return;
      }

      setWorkflows((current) => sanitizeWorkflows([parsed, ...current]));
      setSelectedWorkflowId(parsed.id);
      setCodeDraft(serializeWorkflow(parsed));
      setBuilderMode('visual');
      setImportNotice(`Imported ${parsed.name} from ${sourceLabel(parsed.source)}.`);
    } catch (error) {
      setImportNotice(error instanceof Error ? error.message : 'Could not import that file.');
    }
  };

  const renderWorkflowList = () => (
    <div className={`${panelClass} p-4`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[color:var(--muted)]">
            Workflow library
          </p>
          <h3 className="mt-1 text-lg font-semibold text-[var(--text)]">Workers</h3>
        </div>
        <span className="rounded-full border border-[color:var(--border)] bg-[var(--surface-muted)] px-3 py-1 text-xs text-[var(--muted)]">
          {workflows.length} total
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
        <button onClick={() => createBlankWorkflow('visual')} className={`${mutedPanelClass} p-4 text-left transition hover:bg-[var(--surface)]`}>
          <div className="flex items-center gap-3">
            <WandSparkles size={17} />
            <span className="text-sm font-medium text-[var(--text)]">Visual builder</span>
          </div>
          <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
            Build with drag-and-drop blocks.
          </p>
        </button>

        <button onClick={() => createBlankWorkflow('code')} className={`${mutedPanelClass} p-4 text-left transition hover:bg-[var(--surface)]`}>
          <div className="flex items-center gap-3">
            <Braces size={17} />
            <span className="text-sm font-medium text-[var(--text)]">JSON builder</span>
          </div>
          <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
            Build directly from JSON.
          </p>
        </button>

        <button onClick={() => fileInputRef.current?.click()} className={`${mutedPanelClass} p-4 text-left transition hover:bg-[var(--surface)]`}>
          <div className="flex items-center gap-3">
            <Upload size={17} />
            <span className="text-sm font-medium text-[var(--text)]">Import</span>
          </div>
          <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
            Load n8n, OpenClaw-style, or NanoMind JSON.
          </p>
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {workflows.length === 0 ? (
          <div className={`${mutedPanelClass} p-4 text-sm text-[color:var(--muted)]`}>
            No workers yet.
          </div>
        ) : (
          workflows.map((workflow) => {
            return (
              <button
                key={workflow.id}
                onClick={() => selectWorkflow(workflow.id)}
                className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                  workflow.id === effectiveSelectedWorkflowId
                    ? 'border-[color:var(--text)] bg-[var(--surface)]'
                    : 'border-[color:var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-muted)]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--text)]">{workflow.name}</p>
                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-[color:var(--muted)]">
                      {workflow.description}
                    </p>
                  </div>
                  <span className="rounded-full border border-[color:var(--border)] bg-[var(--surface-muted)] px-3 py-1 text-[11px] text-[var(--muted)]">
                    {workflow.status}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.18em] text-[color:var(--muted)]">
                  <span>{sourceLabel(workflow.source)}</span>
                  <span>{workflow.nodes.length} steps</span>
                  <span>{workflow.route}</span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  const renderImportPanel = () => (
    <div className={`${panelClass} p-4`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[color:var(--muted)]">
            External import
          </p>
          <h3 className="mt-1 text-lg font-semibold text-[var(--text)]">Import flow</h3>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => handleFileImport(event.target.files?.[0])}
        />
        <button onClick={() => fileInputRef.current?.click()} className="rounded-xl border border-[color:var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] transition hover:bg-[var(--surface-muted)]">
          <span className="inline-flex items-center gap-2">
            <FileUp size={15} /> File
          </span>
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {IMPORT_SOURCES.map((source) => (
          <button
            key={source.key}
            onClick={() => setImportHint(source.key)}
            className={`rounded-full border px-3 py-1.5 text-sm transition ${
              importHint === source.key
                ? 'border-[var(--text)] bg-[var(--text)] text-[var(--accent-foreground)]'
                : 'border-[color:var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--surface-muted)]'
            }`}
          >
            {source.label}
          </button>
        ))}
      </div>

      <div
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          void handleFileImport(event.dataTransfer.files?.[0]);
        }}
        className="mt-4 rounded-2xl border border-dashed border-[color:var(--border)] bg-[var(--surface-muted)] p-4"
      >
        <div className="flex items-center gap-3">
          <FileJson size={18} className="text-[color:var(--muted)]" />
          <div>
            <p className="text-sm font-medium text-[var(--text)]">Drop JSON here</p>
            <p className="mt-1 text-sm text-[color:var(--muted)]">n8n, OpenClaw-style, and NanoMind formats supported.</p>
          </div>
        </div>
      </div>

      <textarea
        value={importText}
        onChange={(event) => setImportText(event.target.value)}
        placeholder='Paste workflow JSON here'
        className="mt-4 min-h-[180px] w-full rounded-2xl border border-[color:var(--border)] bg-[var(--surface-muted)] px-4 py-3 font-mono text-sm text-[var(--text)] outline-none transition focus:border-[color:var(--text)] focus:bg-[var(--surface)]"
      />

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm leading-6 text-[color:var(--muted)]">{importNotice}</p>
        <button
          onClick={importWorkflowText}
          disabled={!importText.trim()}
          className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Import workflow
        </button>
      </div>
    </div>
  );

  const renderVisualBuilder = () => {
    if (!selectedWorkflow) return null;

    return (
      <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
        <div className={`${panelClass} p-4`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[color:var(--muted)]">
                Block library
              </p>
              <h3 className="mt-1 text-lg font-semibold text-[var(--text)]">Blocks</h3>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {NODE_LIBRARY.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.kind}
                  draggable
                  onDragStart={() => setDraggingNodeKind(item.kind)}
                  onClick={() => addNode(item.kind)}
                  className={`${mutedPanelClass} w-full p-4 text-left transition hover:bg-[var(--surface)]`}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={16} />
                    <span className="text-sm font-medium text-[var(--text)]">{item.label}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{item.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className={`${panelClass} p-4`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[color:var(--muted)]">
                Workflow canvas
              </p>
              <h3 className="mt-1 text-lg font-semibold text-[var(--text)]">{selectedWorkflow.name}</h3>
            </div>
            <button
              onClick={() => addNode('ai_prompt')}
              className="rounded-xl border border-[color:var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] transition hover:bg-[var(--surface-muted)]"
            >
              <span className="inline-flex items-center gap-2">
                <Plus size={15} /> Add step
              </span>
            </button>
          </div>

          <div
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              if (draggingNodeKind) addNode(draggingNodeKind);
              setDraggingNodeKind(null);
            }}
            className="mt-4 rounded-2xl border border-dashed border-[color:var(--border)] bg-[var(--surface-muted)] p-4"
          >
            {selectedWorkflow.nodes.length === 0 ? (
              <div className="flex min-h-[240px] flex-col items-center justify-center text-center">
                <Workflow size={28} className="text-[color:var(--muted)]" />
                <h4 className="mt-4 text-lg font-semibold text-[var(--text)]">Drop blocks here</h4>
                <p className="mt-2 max-w-md text-sm leading-6 text-[color:var(--muted)]">
                  Start with a trigger, then add steps.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedWorkflow.nodes.map((node, index) => (
                  <div key={node.id} className={`${panelClass} p-4`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <GripVertical size={16} className="text-[color:var(--muted)]" />
                        <div>
                          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[color:var(--muted)]">
                            Step {index + 1} · {nodeLabel(node.kind)}
                          </p>
                          <input
                            value={node.title}
                            onChange={(event) => updateNode(node.id, { title: event.target.value })}
                            className="mt-2 rounded-lg bg-transparent text-base font-semibold text-[var(--text)] outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => moveNode(index, -1)}
                          disabled={index === 0}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[color:var(--border)] bg-[var(--surface)] text-[var(--text)] transition hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <ArrowUp size={15} />
                        </button>
                        <button
                          onClick={() => moveNode(index, 1)}
                          disabled={index === selectedWorkflow.nodes.length - 1}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[color:var(--border)] bg-[var(--surface)] text-[var(--text)] transition hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <ArrowDown size={15} />
                        </button>
                        <button
                          onClick={() => removeNode(node.id)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[color:var(--border)] bg-[var(--surface)] text-[var(--text)] transition hover:bg-[var(--surface-muted)]"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
                      <div>
                        <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--muted)]">
                          Provider or route
                        </label>
                        <input
                          value={node.provider || ''}
                          onChange={(event) => updateNode(node.id, { provider: event.target.value })}
                          placeholder="gemini, ollama, google, meta..."
                          className={`${fieldClass} mt-2`}
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--muted)]">
                          Step logic
                        </label>
                        <textarea
                          value={node.config}
                          onChange={(event) => updateNode(node.id, { config: event.target.value })}
                          rows={3}
                          className={`${fieldClass} mt-2 min-h-[92px] resize-y`}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderCodeBuilder = () => (
    <div className={`${panelClass} p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[color:var(--muted)]">
            JSON editor
          </p>
          <h3 className="mt-1 text-lg font-semibold text-[var(--text)]">JSON editor</h3>
        </div>
        <button
          onClick={applyCodeChanges}
          className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] transition hover:opacity-90"
        >
          <span className="inline-flex items-center gap-2">
            <Save size={15} /> Apply JSON
          </span>
        </button>
      </div>

      <textarea
        value={codeDraft}
        onChange={(event) => setCodeDraft(event.target.value)}
        className="mt-4 min-h-[520px] w-full rounded-2xl border border-[color:var(--border)] bg-[var(--surface-muted)] px-4 py-3 font-mono text-sm text-[var(--text)] outline-none transition focus:border-[color:var(--text)] focus:bg-[var(--surface)]"
      />
    </div>
  );

  const body = (
    <div className="grid gap-5 2xl:grid-cols-[360px_minmax(0,1fr)]">
      <div className="space-y-4">
        {renderWorkflowList()}
        {renderImportPanel()}
      </div>

      <div className="space-y-4">
        {selectedWorkflow ? (
          <>
            <div className={`${panelClass} p-5`}>
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="grid min-w-0 flex-1 gap-4 lg:grid-cols-2">
                      <div>
                        <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--muted)]">
                          Workflow name
                        </label>
                        <input
                          value={selectedWorkflow.name}
                          onChange={(event) =>
                            updateSelectedWorkflow((workflow) => ({
                              ...workflow,
                              name: event.target.value,
                            }))
                          }
                          className={`${fieldClass} mt-2`}
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--muted)]">
                          Target
                        </label>
                        <input
                          value={selectedWorkflow.target}
                          onChange={(event) =>
                            updateSelectedWorkflow((workflow) => ({
                              ...workflow,
                              target: event.target.value,
                            }))
                          }
                          className={`${fieldClass} mt-2`}
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--muted)]">
                          Status
                        </label>
                        <select
                          value={selectedWorkflow.status}
                          onChange={(event) =>
                            updateSelectedWorkflow((workflow) => ({
                              ...workflow,
                              status: event.target.value as WorkflowStatus,
                              nextRun: event.target.value === 'Paused' ? 'Paused' : workflow.nextRun,
                            }))
                          }
                          className={`${fieldClass} mt-2`}
                        >
                          <option value="Enabled">Enabled</option>
                          <option value="Paused">Paused</option>
                          <option value="Draft">Draft</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--muted)]">
                          Route
                        </label>
                        <input
                          value={selectedWorkflow.route}
                          onChange={(event) =>
                            updateSelectedWorkflow((workflow) => ({
                              ...workflow,
                              route: event.target.value,
                            }))
                          }
                          className={`${fieldClass} mt-2`}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setBuilderMode('visual')}
                        className={`rounded-xl px-3 py-2 text-sm transition ${
                          builderMode === 'visual'
                            ? 'bg-[var(--accent)] text-[var(--accent-foreground)]'
                            : 'border border-[color:var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-muted)]'
                        }`}
                      >
                        Visual builder
                      </button>
                      <button
                        onClick={() => {
                          setCodeDraft(serializeWorkflow(selectedWorkflow));
                          setBuilderMode('code');
                        }}
                        className={`rounded-xl px-3 py-2 text-sm transition ${
                          builderMode === 'code'
                            ? 'bg-[var(--accent)] text-[var(--accent-foreground)]'
                            : 'border border-[color:var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-muted)]'
                        }`}
                      >
                        JSON editor
                      </button>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--muted)]">
                      Description
                    </label>
                    <textarea
                      value={selectedWorkflow.description}
                      onChange={(event) =>
                        updateSelectedWorkflow((workflow) => ({
                          ...workflow,
                          description: event.target.value,
                        }))
                      }
                      rows={3}
                      className={`${fieldClass} mt-2 min-h-[96px] resize-y`}
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2 text-sm text-[color:var(--muted)]">
                      <span className="rounded-full border border-[color:var(--border)] bg-[var(--surface-muted)] px-3 py-1">
                        {sourceLabel(selectedWorkflow.source)}
                      </span>
                      <span className="rounded-full border border-[color:var(--border)] bg-[var(--surface-muted)] px-3 py-1">
                        {selectedWorkflow.nodes.length} steps
                      </span>
                      <span>Auto-saved locally · {selectedWorkflow.updatedAt}</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={copySelectedWorkflow}
                        className="rounded-xl border border-[color:var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] transition hover:bg-[var(--surface-muted)]"
                      >
                        <span className="inline-flex items-center gap-2">
                          <Copy size={15} /> Copy JSON
                        </span>
                      </button>
                      <button
                        onClick={exportSelectedWorkflow}
                        className="rounded-xl border border-[color:var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] transition hover:bg-[var(--surface-muted)]"
                      >
                        <span className="inline-flex items-center gap-2">
                          <Download size={15} /> Export
                        </span>
                      </button>
                      <button
                        onClick={deleteSelectedWorkflow}
                        className="rounded-xl border border-[color:var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] transition hover:bg-[var(--surface-muted)]"
                      >
                        <span className="inline-flex items-center gap-2">
                          <Trash2 size={15} /> Remove
                        </span>
                      </button>
                    </div>
                  </div>
            </div>

            {builderMode === 'visual' ? renderVisualBuilder() : renderCodeBuilder()}
          </>
        ) : (
          <div className={`${panelClass} flex min-h-[520px] flex-col items-center justify-center p-10 text-center`}>
            <Workflow size={28} className="text-[color:var(--muted)]" />
            <h3 className="mt-4 text-xl font-semibold text-[var(--text)]">No worker selected</h3>
            <p className="mt-2 max-w-lg text-sm leading-6 text-[color:var(--muted)]">
              Create, import, or select a worker.
            </p>
          </div>
        )}
      </div>
    </div>
  );

  if (embedded) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className={`${mutedPanelClass} px-4 py-3`}>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--muted)]">
              Workers
            </p>
            <p className="mt-2 text-2xl font-semibold text-[var(--text)]">{workflows.length}</p>
          </div>
          <div className={`${mutedPanelClass} px-4 py-3`}>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--muted)]">
              Enabled
            </p>
            <p className="mt-2 text-2xl font-semibold text-[var(--text)]">{enabledCount}</p>
          </div>
          <div className={`${mutedPanelClass} px-4 py-3`}>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--muted)]">
              Imports
            </p>
            <p className="mt-2 text-2xl font-semibold text-[var(--text)]">{importedCount}</p>
          </div>
        </div>
        {body}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-[var(--app-bg)]">
      <div className="border-b border-[color:var(--border)] bg-[var(--surface)] px-5 py-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[color:var(--muted)]">
              Automation
            </p>
            <h2 className="mt-1 text-[22px] font-semibold tracking-[-0.03em] text-[var(--text)]">
              Digital Worker Builder
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className={`${mutedPanelClass} px-4 py-3`}>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--muted)]">
                Workers
              </p>
              <p className="mt-2 text-2xl font-semibold text-[var(--text)]">{workflows.length}</p>
            </div>
            <div className={`${mutedPanelClass} px-4 py-3`}>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--muted)]">
                Enabled
              </p>
              <p className="mt-2 text-2xl font-semibold text-[var(--text)]">{enabledCount}</p>
            </div>
            <div className={`${mutedPanelClass} px-4 py-3`}>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--muted)]">
                Imports
              </p>
              <p className="mt-2 text-2xl font-semibold text-[var(--text)]">{importedCount}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">{body}</div>
    </div>
  );
}
