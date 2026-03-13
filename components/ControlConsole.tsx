'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import ChatWindow from './ChatWindow';
import AutomationWorkspace from './AutomationWorkspace';
import {
  fetchIntegrations,
  fetchPairingStatus,
  type IntegrationMap,
  type PairingStatus,
} from '../api/httpClient';
import { useNanoMind, type Device, type Message } from '../hooks/useNanoMind';
import {
  DEFAULT_AUTH_TOKEN,
  DEFAULT_GEMINI_API_KEY,
  DEFAULT_OLLAMA_BASE_URL,
  DEFAULT_WS_URL,
  getAllModelProfiles,
  getAvailableModelOptions,
  getEffectiveGeminiApiKey,
  getDefaultBrowserModel,
  hasGeminiKeyConfigured,
  MODEL_LABELS,
  normalizeOllamaBaseUrl,
  resolveModelProfile,
  type ModelProfile,
  type ModelProvider,
  type SavedModelProfile,
} from '../lib/runtimeConfig';
import {
  Activity,
  BarChart3,
  BookOpen,
  Bot,
  Bug,
  ChevronRight,
  Circle,
  Clock3,
  Cpu,
  Download,
  ExternalLink,
  FileText,
  LayoutDashboard,
  Link2,
  Menu,
  MessageSquareText,
  Moon,
  RefreshCw,
  Search,
  Server,
  Shield,
  SlidersHorizontal,
  Sparkles,
  SunMedium,
  TerminalSquare,
  Workflow,
  X,
} from 'lucide-react';

type Theme = 'light' | 'dark';
type Workspace =
  | 'chat'
  | 'overview'
  | 'channels'
  | 'instances'
  | 'sessions'
  | 'usage'
  | 'cron'
  | 'agents'
  | 'skills'
  | 'nodes'
  | 'config'
  | 'debug'
  | 'logs'
  | 'docs';
type ConfigSection = 'system' | 'devices' | 'models' | 'security' | 'logs' | 'automation';
type AgentTab = 'overview' | 'runtime' | 'channels' | 'cron';
type LogFilter = 'all' | 'errors' | 'connections' | 'ai' | 'fallback';
type WorkflowSummary = {
  total: number;
  enabled: number;
  imported: number;
  paused: number;
  draft: number;
};
type CapabilityStatus = 'available' | 'blocked' | 'not_implemented';
type DeviceDraft = {
  id: string;
  name: string;
};
type ModelDraft = {
  name: string;
  provider: ModelProvider;
  modelId: string;
  apiKey: string;
  baseUrl: string;
};

const WORKFLOW_STORAGE_KEY = 'nanomind_automation_workflows_v4';
const SIDEBAR_BREAKPOINT = 768;
const LOG_FILTERS: Array<{ key: LogFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'errors', label: 'Errors' },
  { key: 'connections', label: 'Connections' },
  { key: 'ai', label: 'AI events' },
  { key: 'fallback', label: 'Fallback' },
];
const NAV_GROUPS: Array<{
  label: string;
  items: Array<{
    key: Workspace;
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
  }>;
}> = [
  {
    label: 'Chat',
    items: [{ key: 'chat', label: 'Chat', icon: MessageSquareText }],
  },
  {
    label: 'Control',
    items: [
      { key: 'overview', label: 'Overview', icon: LayoutDashboard },
      { key: 'channels', label: 'Channels', icon: Link2 },
      { key: 'instances', label: 'Instances', icon: Activity },
      { key: 'sessions', label: 'Sessions', icon: FileText },
      { key: 'usage', label: 'Usage', icon: BarChart3 },
      { key: 'cron', label: 'Cron Jobs', icon: Clock3 },
    ],
  },
  {
    label: 'Agent',
    items: [
      { key: 'agents', label: 'Agents', icon: Bot },
      { key: 'skills', label: 'Skills', icon: Sparkles },
      { key: 'nodes', label: 'Nodes', icon: Cpu },
    ],
  },
  {
    label: 'Settings',
    items: [
      { key: 'config', label: 'Config', icon: SlidersHorizontal },
      { key: 'debug', label: 'Debug', icon: Bug },
      { key: 'logs', label: 'Logs', icon: TerminalSquare },
    ],
  },
  {
    label: 'Resources',
    items: [{ key: 'docs', label: 'Docs', icon: BookOpen }],
  },
];
const INTEGRATION_SURFACES = [
  { key: 'google' as const, name: 'Google Workspace', description: 'Calendar, Gmail, Drive' },
  { key: 'meta' as const, name: 'Meta Apps', description: 'WhatsApp, Messenger, Instagram' },
];
const DOC_ITEMS = [
  {
    title: 'Project README',
    path: 'README.md',
    note: 'Canonical project overview and local run guide.',
  },
  {
    title: 'Architecture',
    path: 'ai-assistant/docs/architecture.md',
    note: 'System layout and component relationships.',
  },
  {
    title: 'Protocol',
    path: 'ai-assistant/docs/protocol.md',
    note: 'Realtime protocol notes and payload expectations.',
  },
  {
    title: 'Server Setup',
    path: 'ai-assistant/docs/server_setup.md',
    note: 'Rust edge server setup steps.',
  },
  {
    title: 'Firmware Build',
    path: 'ai-assistant/docs/firmware_build.md',
    note: 'ESP32 firmware build and flash instructions.',
  },
  {
    title: 'Implementation Guide',
    path: 'ai-assistant/docs/implementation_guide.md',
    note: 'Project implementation notes and gaps.',
  },
];

const panelClass = 'rounded-[20px] border border-[color:var(--border)] bg-[var(--surface)]';
const softPanelClass = 'rounded-[16px] border border-[color:var(--border)] bg-[var(--surface-muted)]';
const quietButtonClass =
  'inline-flex items-center gap-2 rounded-xl border border-[color:var(--border)] bg-[var(--surface)] px-4 py-2 text-sm text-[var(--text)] transition hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-40';
const fieldClass =
  'w-full rounded-xl border border-[color:var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text)] outline-none transition focus:border-[color:var(--text)]';

function getEdgePresentation(
  status: 'local_online' | 'local_offline' | 'cloud_fallback' | 'reconnecting' | 'connecting',
  modelProfile: ModelProfile,
  defaultGeminiApiKey: string
) {
  const usingGeminiFallback =
    modelProfile.provider === 'gemini' &&
    hasGeminiKeyConfigured(getEffectiveGeminiApiKey(modelProfile, defaultGeminiApiKey));
  const requiresGeminiKey =
    modelProfile.provider === 'gemini' &&
    !hasGeminiKeyConfigured(getEffectiveGeminiApiKey(modelProfile, defaultGeminiApiKey));

  switch (status) {
    case 'local_online':
      return {
        health: 'Health OK',
        healthTone: 'ok' as const,
        edge: 'Connected',
        localLlm: 'Available',
        cloud: 'Standby',
        connection: 'Local runtime',
        latency: 'Not reported',
      };
    case 'cloud_fallback':
      return {
        health: 'Degraded',
        healthTone: 'warn' as const,
        edge: 'Offline',
        localLlm: usingGeminiFallback ? 'Unavailable' : requiresGeminiKey ? 'Unavailable' : 'Browser fallback',
        cloud: usingGeminiFallback ? 'Active' : requiresGeminiKey ? 'Key required' : 'Unavailable',
        connection: usingGeminiFallback
          ? `${modelProfile.name} browser fallback`
          : requiresGeminiKey
            ? `${modelProfile.name} API key required`
            : `${modelProfile.name} fallback`,
        latency: 'Not reported',
      };
    case 'reconnecting':
      return {
        health: 'Reconnecting',
        healthTone: 'warn' as const,
        edge: 'Reconnecting',
        localLlm: usingGeminiFallback ? 'Unknown' : requiresGeminiKey ? 'Unavailable' : 'Fallback ready',
        cloud: usingGeminiFallback ? 'Standby' : requiresGeminiKey ? 'Key required' : 'Unavailable',
        connection: 'Reconnecting',
        latency: 'Not connected',
      };
    case 'connecting':
      return {
        health: 'Starting',
        healthTone: 'muted' as const,
        edge: 'Connecting',
        localLlm: usingGeminiFallback ? 'Unknown' : requiresGeminiKey ? 'Unavailable' : 'Fallback ready',
        cloud: usingGeminiFallback ? 'Standby' : requiresGeminiKey ? 'Key required' : 'Unavailable',
        connection: 'Connecting',
        latency: 'Not connected',
      };
    case 'local_offline':
    default:
      return {
        health: 'Offline',
        healthTone: 'muted' as const,
        edge: 'Offline',
        localLlm: usingGeminiFallback ? 'Unavailable' : requiresGeminiKey ? 'Unavailable' : 'Fallback ready',
        cloud: usingGeminiFallback ? 'Idle' : requiresGeminiKey ? 'Key required' : 'Unavailable',
        connection: 'Offline',
        latency: 'Not connected',
      };
  }
}

function maskSecret(value: string) {
  if (!value) return 'Not configured';
  if (value.length <= 8) return 'Configured';
  return `${value.slice(0, 4)}••••${value.slice(-4)}`;
}

function formatRelativeTime(timestamp: number, now: number) {
  const delta = Math.max(0, now - timestamp);
  const minutes = Math.floor(delta / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatClock(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function toneClasses(tone: 'ok' | 'warn' | 'muted' | 'signal') {
  switch (tone) {
    case 'ok':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300';
    case 'warn':
      return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300';
    case 'signal':
      return 'border-[color:var(--signal)] bg-[var(--signal-soft)] text-[color:var(--signal)]';
    case 'muted':
    default:
      return 'border-[color:var(--border)] bg-[var(--surface-muted)] text-[color:var(--muted)]';
  }
}

function statusTone(value: string) {
  if (
    value === 'Connected' ||
    value === 'Available' ||
    value === 'Standby' ||
    value === 'Enabled' ||
    value === 'Health OK'
  ) {
    return 'ok' as const;
  }
  if (
    value === 'Degraded' ||
    value === 'Active' ||
    value === 'Reconnecting' ||
    value === 'Cloud fallback' ||
    value === 'Key required' ||
    value === 'Gemini API key required' ||
    value === 'Needs key' ||
    value === 'Not configured'
  ) {
    return 'warn' as const;
  }
  if (
    value === 'Not implemented' ||
    value === 'Unavailable' ||
    value.startsWith('Add ') ||
    value.startsWith('No ')
  ) {
    return 'signal' as const;
  }
  return 'muted' as const;
}

function integrationDisplay(state?: string, connected?: boolean) {
  if (connected) {
    return 'Connected';
  }

  if (state === 'not_configured') {
    return 'Not configured';
  }

  if (state === 'not_connected') {
    return 'Not connected';
  }

  return 'Add gateway data';
}

function WorkspaceHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="border-b border-[color:var(--border)] bg-[var(--surface)] px-6 py-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-[var(--text)]">{title}</h1>
          <p className="mt-1 text-sm text-[color:var(--muted)]">{subtitle}</p>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}

function PanelCard({
  title,
  subtitle,
  actions,
  children,
  className = '',
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`${panelClass} ${className}`}>
      <div className="flex items-start justify-between gap-3 px-5 py-5">
        <div>
          <h3 className="text-[15px] font-semibold text-[var(--text)]">{title}</h3>
          {subtitle ? <p className="mt-1 text-sm text-[color:var(--muted)]">{subtitle}</p> : null}
        </div>
        {actions}
      </div>
      <div className="border-t border-[color:var(--border)] px-5 py-5">{children}</div>
    </div>
  );
}

function MetricTile({
  label,
  value,
  note,
  tone = 'muted',
}: {
  label: string;
  value: string | number;
  note?: string;
  tone?: 'ok' | 'warn' | 'muted' | 'signal';
}) {
  return (
    <div className={`${softPanelClass} px-4 py-4`}>
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--muted)]">
        {label}
      </p>
      <div className="mt-3 flex items-center gap-3">
        <span className="text-[29px] font-semibold tracking-[-0.03em] text-[var(--text)]">{value}</span>
        <span className={`rounded-full border px-2.5 py-1 text-[11px] ${toneClasses(tone)}`}>{note || label}</span>
      </div>
    </div>
  );
}

function FieldCell({
  label,
  value,
  monospace = false,
}: {
  label: string;
  value: string;
  monospace?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--muted)]">{label}</p>
      <div className={`${softPanelClass} mt-2 px-4 py-3 text-sm text-[var(--text)] ${monospace ? 'font-mono' : ''}`}>
        {value}
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  monospace = false,
}: {
  label: string;
  value: string;
  monospace?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 text-sm">
      <span className="text-[color:var(--muted)]">{label}</span>
      <span className={`text-right text-[var(--text)] ${monospace ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

function EmptyPanel({
  icon: Icon,
  title,
  text,
  actions,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  text: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className={`${panelClass} flex min-h-[220px] flex-col items-center justify-center px-6 text-center`}>
      <Icon size={26} className="text-[color:var(--muted)]" />
      <h3 className="mt-4 text-lg font-semibold text-[var(--text)]">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-[color:var(--muted)]">{text}</p>
      {actions ? <div className="mt-5 flex flex-wrap justify-center gap-2">{actions}</div> : null}
    </div>
  );
}

function LogoLockup() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[color:var(--border)] bg-[var(--surface)]">
        <Image src="/nanomind-mark.svg" alt="NanoMind mark" width={30} height={30} className="h-[30px] w-[30px]" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-[15px] font-semibold tracking-[-0.03em] text-[var(--text)]">NanoMind</p>
        <p className="truncate text-[11px] font-medium uppercase tracking-[0.22em] text-[color:var(--muted)]">
          Gateway Dashboard
        </p>
      </div>
    </div>
  );
}

function HealthChip({ label, tone }: { label: string; tone: 'ok' | 'warn' | 'muted' }) {
  return (
    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${toneClasses(tone)}`}>
      <Circle size={8} className="fill-current stroke-current" />
      <span>{label}</span>
    </div>
  );
}

function NavButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition ${
        active
          ? 'border-[color:var(--signal)] bg-[var(--signal-soft)] text-[var(--text)]'
          : 'border-transparent text-[color:var(--muted)] hover:border-[color:var(--border)] hover:bg-[var(--surface)] hover:text-[var(--text)]'
      }`}
    >
      <Icon size={16} />
      <span>{label}</span>
    </button>
  );
}

function workflowSummaryFromStorage(): WorkflowSummary {
  if (typeof window === 'undefined') {
    return { total: 0, enabled: 0, imported: 0, paused: 0, draft: 0 };
  }

  try {
    const raw = window.localStorage.getItem(WORKFLOW_STORAGE_KEY);
    if (!raw) return { total: 0, enabled: 0, imported: 0, paused: 0, draft: 0 };
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return { total: 0, enabled: 0, imported: 0, paused: 0, draft: 0 };
    return {
      total: parsed.length,
      enabled: parsed.filter((entry) => entry?.status === 'Enabled').length,
      imported: parsed.filter((entry) => entry?.source && entry.source !== 'native').length,
      paused: parsed.filter((entry) => entry?.status === 'Paused').length,
      draft: parsed.filter((entry) => entry?.status === 'Draft').length,
    };
  } catch {
    return { total: 0, enabled: 0, imported: 0, paused: 0, draft: 0 };
  }
}

function modelName(edgeStatus: string, selectedModel: ModelProfile) {
  if (edgeStatus === 'local_online') return 'Edge router / llama3';
  return selectedModel.name || MODEL_LABELS[selectedModel.provider] || 'Unconfigured';
}

function instanceRowsFromDevices(devices: Device[], browserLabel: string, browserDetail: string, theme: Theme, connection: string) {
  return [
    {
      id: 'browser-control-ui',
      name: browserLabel,
      detail: browserDetail,
      state: 'Connected',
      tags: ['browser', theme, connection.toLowerCase().replace(/\s+/g, '-')],
    },
    ...devices.map((device) => ({
      id: device.id,
      name: device.name,
      detail: 'ESP32 device',
      state: device.status === 'connected' ? 'Connected' : 'Offline',
      tags: ['esp32', device.status],
    })),
  ];
}

function buildLogs(
  messages: Message[],
  edgeStatus: string,
  connection: string,
  appStartedAt: number,
  modelProfile: ModelProfile,
  defaultGeminiApiKey: string
) {
  const usingGeminiFallback =
    modelProfile.provider === 'gemini' &&
    hasGeminiKeyConfigured(getEffectiveGeminiApiKey(modelProfile, defaultGeminiApiKey));
  const requiresGeminiKey =
    modelProfile.provider === 'gemini' &&
    !hasGeminiKeyConfigured(getEffectiveGeminiApiKey(modelProfile, defaultGeminiApiKey));
  const bootLevel = edgeStatus === 'local_online' ? 'INFO' : edgeStatus === 'cloud_fallback' ? 'WARN' : 'ERROR';
  const baseLogs = [
    {
      timestamp: appStartedAt,
      level: bootLevel,
      group: 'connections' as const,
      source: 'gateway.ws',
      message: `edge status=${edgeStatus} connection=${connection}`,
    },
    {
      timestamp: appStartedAt,
      level: edgeStatus === 'cloud_fallback' ? 'WARN' : 'INFO',
      group: edgeStatus === 'cloud_fallback' ? ('fallback' as const) : ('ai' as const),
      source: 'llm.router',
      message:
        edgeStatus === 'cloud_fallback'
          ? usingGeminiFallback
            ? `${modelProfile.name.toLowerCase()} browser fallback active`
            : requiresGeminiKey
              ? `${modelProfile.name.toLowerCase()} selected but api key is missing`
            : `${modelProfile.name.toLowerCase()} fallback active`
          : 'waiting for runtime events',
    },
  ];

  const messageLogs = messages.map((message) => ({
    timestamp: message.createdAt || appStartedAt,
    level: message.status === 'error' ? 'ERROR' : message.source === 'cloud' ? 'WARN' : 'INFO',
    group:
      message.status === 'error'
        ? ('errors' as const)
        : message.source === 'cloud'
          ? ('fallback' as const)
          : ('ai' as const),
    source: message.from === 'user' ? 'chat.prompt' : 'chat.output',
    message: message.text || 'streaming',
  }));

  return [...baseLogs, ...messageLogs];
}

export default function ControlConsole() {
  const {
    initWsClient,
    edgeStatus,
    devices,
    savedDevices,
    knownDevices,
    currentDeviceId,
    upsertSavedDevice,
    removeSavedDevice,
    setCurrentDevice,
    messages,
    isStreaming,
    wsUrl,
    authToken,
    geminiApiKey,
    savedModelProfiles,
    selectedModel,
    setSelectedModel,
    setGeminiApiKey,
    upsertSavedModelProfile,
    removeSavedModelProfile,
    setConnectionConfig,
    resetConnectionConfig,
    clearMessages,
  } = useNanoMind();

  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'light';
    const saved = window.localStorage.getItem('nanomind-theme');
    return saved === 'dark' ? 'dark' : 'light';
  });
  const [workspace, setWorkspace] = useState<Workspace>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [configSection, setConfigSection] = useState<ConfigSection>('system');
  const [agentTab, setAgentTab] = useState<AgentTab>('overview');
  const [skillFilter, setSkillFilter] = useState('');
  const [usageMode, setUsageMode] = useState<'messages' | 'cloud' | 'errors'>('messages');
  const [logFilter, setLogFilter] = useState<LogFilter>('all');
  const [logSearch, setLogSearch] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const [appStartedAt] = useState(() => Date.now());
  const [sessionId] = useState(() => {
    if (typeof window === 'undefined') return 'browser-session';
    const existing = window.sessionStorage.getItem('nanomind-browser-session');
    if (existing) return existing;
    const nextId =
      typeof window.crypto?.randomUUID === 'function'
        ? window.crypto.randomUUID()
        : `session-${Date.now()}`;
    window.sessionStorage.setItem('nanomind-browser-session', nextId);
    return nextId;
  });
  const [browserDetail] = useState(() => {
    if (typeof window === 'undefined') return 'Browser control client';
    const platform =
      (window.navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData
        ?.platform ||
      window.navigator.platform ||
      'Browser';
    return `${platform} operator client`;
  });
  const [workflowSummary, setWorkflowSummary] = useState<WorkflowSummary>({
    total: 0,
    enabled: 0,
    imported: 0,
    paused: 0,
    draft: 0,
  });
  const [integrations, setIntegrations] = useState<IntegrationMap | null>(null);
  const [integrationNotice, setIntegrationNotice] = useState('Loading integration state...');
  const [pairingState, setPairingState] = useState<PairingStatus | null>(null);
  const [debugNotice, setDebugNotice] = useState('');
  const [logNotice, setLogNotice] = useState('');
  const [configNotice, setConfigNotice] = useState('');
  const [deviceNotice, setDeviceNotice] = useState('');
  const [modelNotice, setModelNotice] = useState('');
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);
  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  const [deviceDraft, setDeviceDraft] = useState<DeviceDraft>({
    id: '',
    name: '',
  });
  const [modelDraft, setModelDraft] = useState<ModelDraft>({
    name: '',
    provider: 'ollama',
    modelId: '',
    apiKey: '',
    baseUrl: DEFAULT_OLLAMA_BASE_URL,
  });
  const [configDraft, setConfigDraft] = useState<{
    wsUrl: string;
    authToken: string;
    geminiApiKey: string;
    selectedModel: string;
    currentDeviceId: string;
  }>(() => ({
    wsUrl: DEFAULT_WS_URL,
    authToken: DEFAULT_AUTH_TOKEN,
    geminiApiKey: DEFAULT_GEMINI_API_KEY,
    selectedModel: getDefaultBrowserModel(),
    currentDeviceId: '',
  }));

  const hasGeminiKey = hasGeminiKeyConfigured(geminiApiKey);
  const modelOptions = getAvailableModelOptions(savedModelProfiles, geminiApiKey);
  const builtInModels = getAllModelProfiles([], geminiApiKey);
  const draftHasGeminiKey = hasGeminiKeyConfigured(configDraft.geminiApiKey);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('nanomind-theme', theme);
  }, [theme]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(min-width: ${SIDEBAR_BREAKPOINT}px)`);
    const syncSidebarMode = (event?: MediaQueryListEvent) => {
      if ((event?.matches ?? mediaQuery.matches) && sidebarOpen) {
        setSidebarOpen(false);
      }
    };

    syncSidebarMode();
    mediaQuery.addEventListener('change', syncSidebarMode);
    return () => mediaQuery.removeEventListener('change', syncSidebarMode);
  }, [sidebarOpen]);

  useEffect(() => {
    if (!sidebarOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen]);

  useEffect(() => {
    initWsClient();
  }, [authToken, initWsClient, wsUrl]);

  useEffect(() => {
    const availableDevices = knownDevices.length > 0 ? knownDevices : devices;

    if (availableDevices.length === 0) {
      if (currentDeviceId) setCurrentDevice(null);
      return;
    }

    if (!currentDeviceId || !availableDevices.some((device) => device.id === currentDeviceId)) {
      const preferred =
        devices.find((device) => device.status === 'connected') || availableDevices[0];
      if (preferred) setCurrentDevice(preferred.id);
    }
  }, [currentDeviceId, devices, knownDevices, setCurrentDevice]);

  useEffect(() => {
    const refresh = () => setWorkflowSummary(workflowSummaryFromStorage());
    refresh();
    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    window.addEventListener('nanomind:workflows-changed', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('nanomind:workflows-changed', refresh);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadBackendState = async () => {
      try {
        const [integrationData, pairingData] = await Promise.all([
          fetchIntegrations(authToken, wsUrl),
          fetchPairingStatus(authToken, wsUrl),
        ]);

        if (cancelled) {
          return;
        }

        setIntegrations(integrationData);
        setPairingState(pairingData);
        setIntegrationNotice('Runtime state loaded from the edge server.');
      } catch (error) {
        if (cancelled) {
          return;
        }

        setIntegrations(null);
        setPairingState(null);
        setIntegrationNotice(
          error instanceof Error
            ? `Edge API unavailable: ${error.message}`
            : 'Edge API unavailable.'
        );
      }
    };

    void loadBackendState();
    return () => {
      cancelled = true;
    };
  }, [authToken, wsUrl]);

  const activeModelProfile = resolveModelProfile(selectedModel, savedModelProfiles, geminiApiKey);
  const statusMeta = getEdgePresentation(edgeStatus, activeModelProfile, geminiApiKey);
  const currentDevice =
    devices.find((device) => device.id === currentDeviceId) ||
    knownDevices.find((device) => device.id === currentDeviceId) ||
    devices.find((device) => device.status === 'connected') ||
    knownDevices[0] ||
    null;
  const liveOnlyDevices = devices.filter(
    (device) => !savedDevices.some((savedDevice) => savedDevice.id === device.id)
  );
  const hasMessages = messages.length > 0;
  const hasDevices = knownDevices.length > 0;
  const hasWorkflows = workflowSummary.total > 0;
  const hasChannelData = Boolean(integrations) || Boolean(pairingState);
  const hasAnyStoredRuntimeData = hasMessages || hasDevices || hasWorkflows || hasChannelData;
  const browserSessionLabel = `Browser session ${sessionId.slice(0, 8)}`;
  const currentDeviceLabel = currentDevice?.name || 'No device selected';
  const preferredKnownDeviceId =
    devices.find((device) => device.status === 'connected')?.id || knownDevices[0]?.id || '';
  const activeModelLabel = modelName(edgeStatus, activeModelProfile);
  const hasRunnableGeminiProfile = getAllModelProfiles(savedModelProfiles, geminiApiKey).some(
    (profile) =>
      profile.provider === 'gemini' &&
      hasGeminiKeyConfigured(getEffectiveGeminiApiKey(profile, geminiApiKey))
  );
  const sessionState = isStreaming ? 'Streaming' : messages.length > 0 ? 'Idle' : 'Standby';
  const promptsCount = messages.filter((message) => message.from === 'user').length;
  const responseCount = messages.filter(
    (message) => message.from === 'ai' && message.status !== 'error'
  ).length;
  const errorCount = messages.filter((message) => message.status === 'error').length;
  const cloudCount = messages.filter((message) => message.source === 'cloud').length;
  const localCount = messages.filter((message) => message.source === 'local').length;
  const latestMessage = messages[messages.length - 1] || null;
  const latestActivityAt = latestMessage?.createdAt || appStartedAt;
  const instanceRows = instanceRowsFromDevices(
    knownDevices,
    browserSessionLabel,
    browserDetail,
    theme,
    statusMeta.connection
  );
  const sessionRows = [
    {
      key: sessionId,
      label: browserSessionLabel,
      kind: 'browser',
      updatedAt: latestActivityAt,
      messages: messages.length,
      route: statusMeta.connection,
      state: sessionState,
    },
  ];
  const capabilityRows = [
    {
      name: 'Workflow JSON builder',
      description: 'Create worker flows directly in NanoMind.',
      status: 'available' as CapabilityStatus,
      detail: 'Local browser feature',
    },
    {
      name: 'n8n import',
      description: 'Import n8n export JSON into the workflow builder.',
      status: 'available' as CapabilityStatus,
      detail: 'Automation workspace',
    },
    {
      name: 'OpenClaw flow import',
      description: 'Import OpenClaw-style steps or actions JSON.',
      status: 'available' as CapabilityStatus,
      detail: 'Automation workspace',
    },
    {
      name: 'Gemini browser fallback',
      description: 'Direct Gemini browser route when edge is unavailable.',
      status: hasRunnableGeminiProfile
        ? ('available' as CapabilityStatus)
        : ('blocked' as CapabilityStatus),
      detail: hasRunnableGeminiProfile ? 'At least one Gemini profile is ready' : 'Add Gemini API key in Config',
    },
    {
      name: 'Local Ollama browser route',
      description: 'Direct laptop Ollama route from the browser.',
      status: 'available' as CapabilityStatus,
      detail: 'Requires local Ollama',
    },
    {
      name: 'Integrations API',
      description: 'Google and Meta service connection management.',
      status: 'not_implemented' as CapabilityStatus,
      detail: 'Frontend reports unavailable state',
    },
    {
      name: 'Pairing API',
      description: 'Device pairing for QR and token approval.',
      status: 'not_implemented' as CapabilityStatus,
      detail: 'No live pairing backend',
    },
  ];
  const filteredCapabilities = capabilityRows.filter((row) =>
    row.name.toLowerCase().includes(skillFilter.toLowerCase())
  );
  const logs = buildLogs(
    messages,
    edgeStatus,
    statusMeta.connection,
    appStartedAt,
    activeModelProfile,
    geminiApiKey
  );
  const visibleLogs = logs.filter((entry) => {
    const filterMatches = logFilter === 'all' ? true : entry.group === logFilter;
    const searchMatches = logSearch.trim()
      ? `${entry.source} ${entry.message} ${entry.level}`
          .toLowerCase()
          .includes(logSearch.trim().toLowerCase())
      : true;
    return filterMatches && searchMatches;
  });
  const runtimeSnapshot = {
    ws_url: wsUrl,
    auth_token: maskSecret(authToken),
    edge_status: edgeStatus,
    route: statusMeta.connection,
    session: sessionState,
    selected_model: selectedModel,
    selected_model_profile: activeModelProfile,
    gemini_key_configured: hasGeminiKey,
    model_label: activeModelLabel,
    current_device: currentDevice,
    saved_devices: savedDevices,
    saved_model_profiles: savedModelProfiles,
    known_devices: knownDevices,
    devices,
    messages: {
      total: messages.length,
      prompts: promptsCount,
      responses: responseCount,
      errors: errorCount,
      cloud: cloudCount,
      local: localCount,
      streaming: isStreaming,
    },
    workflows: workflowSummary,
  };
  const googleDisplay = integrationDisplay(integrations?.google.state, integrations?.google.connected);
  const metaDisplay = integrationDisplay(integrations?.meta.state, integrations?.meta.connected);
  const pairingDisplay = pairingState
    ? pairingState.supported
      ? pairingState.state
      : 'Add pairing backend'
    : 'Add pairing backend';

  const isConfigDirty =
    configDraft.wsUrl.trim() !== wsUrl ||
    configDraft.authToken.trim() !== authToken ||
    configDraft.geminiApiKey.trim() !== geminiApiKey ||
    configDraft.selectedModel !== selectedModel ||
    configDraft.currentDeviceId !== (currentDeviceId || '');

  const refreshPage = () => window.location.reload();
  const navigateToWorkspace = (nextWorkspace: Workspace) => {
    setWorkspace(nextWorkspace);
    setSidebarOpen(false);
  };

  const openConfigEditor = () => {
    setConfigDraft({
      wsUrl,
      authToken,
      geminiApiKey,
      selectedModel,
      currentDeviceId: currentDeviceId || preferredKnownDeviceId,
    });
    setSidebarOpen(false);
    setWorkspace('config');
    setConfigSection('system');
    setDeviceNotice('');
    setModelNotice('');
    setEditingDeviceId(null);
    setEditingModelId(null);
    setDeviceDraft({ id: '', name: '' });
    setModelDraft({
      name: '',
      provider: 'ollama',
      modelId: '',
      apiKey: '',
      baseUrl: DEFAULT_OLLAMA_BASE_URL,
    });
  };

  const resetDeviceDraft = () => {
    setEditingDeviceId(null);
    setDeviceDraft({ id: '', name: '' });
  };

  const startEditingSavedDevice = (device: Device) => {
    setEditingDeviceId(device.id);
    setDeviceDraft({
      id: device.id,
      name: device.name,
    });
    setDeviceNotice(`Editing saved device ${device.name}.`);
  };

  const saveDeviceDraft = () => {
    const nextId = deviceDraft.id.trim();
    const nextName = deviceDraft.name.trim();

    if (!nextId || !nextName) {
      setDeviceNotice('Enter both a device name and a device ID.');
      return;
    }

    if (editingDeviceId && editingDeviceId !== nextId) {
      removeSavedDevice(editingDeviceId);
    }

    upsertSavedDevice({ id: nextId, name: nextName });
    setConfigDraft((current) => ({
      ...current,
      currentDeviceId: current.currentDeviceId || nextId,
    }));
    setDeviceNotice(
      editingDeviceId ? `Saved changes to ${nextName}.` : `Added ${nextName} to browser memory.`
    );
    resetDeviceDraft();
  };

  const deleteSavedDevice = (deviceId: string) => {
    removeSavedDevice(deviceId);
    setConfigDraft((current) => ({
      ...current,
      currentDeviceId: current.currentDeviceId === deviceId ? '' : current.currentDeviceId,
    }));
    if (editingDeviceId === deviceId) {
      resetDeviceDraft();
    }
    setDeviceNotice('Removed saved device from browser memory.');
  };

  const resetModelDraft = () => {
    setEditingModelId(null);
    setModelDraft({
      name: '',
      provider: 'ollama',
      modelId: '',
      apiKey: '',
      baseUrl: DEFAULT_OLLAMA_BASE_URL,
    });
  };

  const startEditingSavedModel = (profile: SavedModelProfile) => {
    setEditingModelId(profile.id);
    setModelDraft({
      name: profile.name,
      provider: profile.provider,
      modelId: profile.modelId,
      apiKey: profile.apiKey || '',
      baseUrl: profile.baseUrl || DEFAULT_OLLAMA_BASE_URL,
    });
    setModelNotice(`Editing ${profile.name}.`);
  };

  const saveModelDraft = () => {
    const name = modelDraft.name.trim();
    const modelId = modelDraft.modelId.trim();

    if (!name || !modelId) {
      setModelNotice('Enter both a model name and a runtime model ID.');
      return;
    }

    const profileId =
      editingModelId ||
      (typeof window !== 'undefined' && typeof window.crypto?.randomUUID === 'function'
        ? window.crypto.randomUUID()
        : `model-${Date.now()}`);

    const nextProfile: SavedModelProfile = {
      id: profileId,
      name,
      provider: modelDraft.provider,
      modelId,
      apiKey: modelDraft.provider === 'gemini' ? modelDraft.apiKey.trim() : '',
      baseUrl:
        modelDraft.provider === 'ollama'
          ? normalizeOllamaBaseUrl(modelDraft.baseUrl)
          : '',
    };

    upsertSavedModelProfile(nextProfile);
    setSelectedModel(profileId);
    setConfigDraft((current) => ({
      ...current,
      selectedModel: profileId,
    }));
    setModelNotice(
      editingModelId ? `Saved changes to ${name}.` : `Added ${name} to browser memory.`
    );
    resetModelDraft();
  };

  const deleteSavedModel = (modelId: string) => {
    const fallbackModel =
      selectedModel === modelId ? getDefaultBrowserModel(geminiApiKey) : selectedModel;

    removeSavedModelProfile(modelId);
    setSelectedModel(fallbackModel);
    setConfigDraft((current) => ({
      ...current,
      selectedModel: current.selectedModel === modelId ? fallbackModel : current.selectedModel,
    }));

    if (editingModelId === modelId) {
      resetModelDraft();
    }

    setModelNotice('Removed saved model from browser memory.');
  };

  const applyConfig = () => {
    setConnectionConfig({
      wsUrl: configDraft.wsUrl,
      authToken: configDraft.authToken,
    });
    setGeminiApiKey(configDraft.geminiApiKey);
    setSelectedModel(configDraft.selectedModel);
    setCurrentDevice(configDraft.currentDeviceId || null);
    setConfigDraft({
      wsUrl: configDraft.wsUrl.trim() || DEFAULT_WS_URL,
      authToken: configDraft.authToken.trim() || DEFAULT_AUTH_TOKEN,
      geminiApiKey: configDraft.geminiApiKey.trim() || DEFAULT_GEMINI_API_KEY,
      selectedModel: configDraft.selectedModel,
      currentDeviceId: configDraft.currentDeviceId,
    });
    setConfigNotice('Local browser config saved. Reconnecting to the selected gateway.');
  };

  const resetConfig = () => {
    resetConnectionConfig();
    setGeminiApiKey(DEFAULT_GEMINI_API_KEY);
    const defaultModel = getDefaultBrowserModel(DEFAULT_GEMINI_API_KEY);
    setSelectedModel(defaultModel);
    setCurrentDevice(preferredKnownDeviceId || null);
    setConfigDraft({
      wsUrl: DEFAULT_WS_URL,
      authToken: DEFAULT_AUTH_TOKEN,
      geminiApiKey: DEFAULT_GEMINI_API_KEY,
      selectedModel: defaultModel,
      currentDeviceId: preferredKnownDeviceId,
    });
    setConfigNotice('Local browser config reset to defaults.');
  };

  const exportVisibleLogs = () => {
    const text = visibleLogs
      .map(
        (entry) =>
          `${new Date(entry.timestamp).toISOString()} ${entry.level} ${entry.source} ${entry.message}`
      )
      .join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'nanomind-visible-logs.txt';
    anchor.click();
    URL.revokeObjectURL(url);
    setLogNotice('Visible logs exported.');
  };

  const copySnapshot = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(runtimeSnapshot, null, 2));
      setDebugNotice('Snapshot copied.');
    } catch {
      setDebugNotice('Clipboard unavailable.');
    }
  };

  const renderOverview = () => (
    <div className="h-full overflow-y-auto">
      <WorkspaceHeader
        title="Overview"
        subtitle="Gateway status, routes, and a fast health read."
        actions={
          <>
            <button onClick={openConfigEditor} className={quietButtonClass}>
              <SlidersHorizontal size={15} />
              Edit config
            </button>
            <button onClick={() => navigateToWorkspace('chat')} className={quietButtonClass}>
              <MessageSquareText size={15} />
              Open chat
            </button>
            <button onClick={refreshPage} className={quietButtonClass}>
              <RefreshCw size={15} />
              Refresh
            </button>
          </>
        }
      />

      <div className="space-y-4 px-6 py-6">
        <div className="grid gap-4 xl:grid-cols-2">
          <PanelCard title="Gateway access" subtitle="Where this dashboard connects.">
            <div className="grid gap-4 md:grid-cols-2">
              <FieldCell label="WebSocket URL" value={wsUrl} monospace />
              <FieldCell label="Gateway token" value={maskSecret(authToken)} monospace />
              <FieldCell label="Session key" value={sessionId} monospace />
              <FieldCell label="Current device" value={currentDeviceLabel} />
            </div>
          </PanelCard>

          <PanelCard title="Snapshot" subtitle="Current runtime handshake.">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <MetricTile label="Status" value={statusMeta.health} note={statusMeta.health} tone={statusMeta.healthTone} />
              <MetricTile label="Uptime" value={formatRelativeTime(appStartedAt, now)} note="browser session" />
              <MetricTile label="Messages" value={messages.length} note="current session" />
              <MetricTile label="Workers" value={workflowSummary.total} note="local builder" />
            </div>
          </PanelCard>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <PanelCard title="Runtime" subtitle="Current route and model state.">
            <div className="divide-y divide-[color:var(--border)]">
              <DetailRow label="Edge" value={statusMeta.edge} />
              <DetailRow label="Local LLM" value={statusMeta.localLlm} />
              <DetailRow label="Cloud" value={statusMeta.cloud} />
              <DetailRow label="Model" value={activeModelLabel} />
            </div>
          </PanelCard>

          <PanelCard title="Session" subtitle="Current operator session.">
            <div className="divide-y divide-[color:var(--border)]">
              <DetailRow label="State" value={sessionState} />
              <DetailRow label="Prompts" value={String(promptsCount)} />
              <DetailRow label="Responses" value={String(responseCount)} />
              <DetailRow label="Errors" value={String(errorCount)} />
            </div>
          </PanelCard>

          <PanelCard title="Coverage" subtitle="What is live in this build.">
            <div className="divide-y divide-[color:var(--border)]">
              <DetailRow label="Google Workspace" value={googleDisplay} />
              <DetailRow label="Meta Apps" value={metaDisplay} />
              <DetailRow label="Pairing" value={pairingDisplay} />
              <DetailRow label="Scheduler" value="Not implemented" />
              <DetailRow label="Workflow builder" value="Available" />
            </div>
          </PanelCard>
        </div>

        {!hasAnyStoredRuntimeData ? (
          <EmptyPanel
            icon={Bot}
            title="No saved runtime data yet"
            text="This dashboard now shows only real browser memory and live gateway responses. Configure the gateway, start a chat, or create a workflow to populate it."
            actions={
              <>
                <button onClick={openConfigEditor} className={quietButtonClass}>
                  <SlidersHorizontal size={15} />
                  Configure gateway
                </button>
                <button onClick={() => navigateToWorkspace('chat')} className={quietButtonClass}>
                  <MessageSquareText size={15} />
                  Start chat
                </button>
                <button onClick={() => navigateToWorkspace('cron')} className={quietButtonClass}>
                  <Workflow size={15} />
                  Add workflow
                </button>
              </>
            }
          />
        ) : null}
      </div>
    </div>
  );

  const renderChannels = () => (
    <div className="h-full overflow-y-auto">
      <WorkspaceHeader title="Channels" subtitle="Google and Meta connection state from the edge server." />
      <div className="space-y-4 px-6 py-6">
        {!integrations ? (
          <EmptyPanel
            icon={Link2}
            title="No channel data yet"
            text="There is no real Google or Meta integration state in browser memory, and the gateway did not return channel data. Add a working gateway or backend integration first."
            actions={
              <>
                <button onClick={openConfigEditor} className={quietButtonClass}>
                  <SlidersHorizontal size={15} />
                  Configure gateway
                </button>
                <button onClick={refreshPage} className={quietButtonClass}>
                  <RefreshCw size={15} />
                  Retry
                </button>
              </>
            }
          />
        ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {INTEGRATION_SURFACES.map((channel) => {
            const state = integrations?.[channel.key];
            const displayState = integrationDisplay(state?.state, state?.connected);
            const buttonLabel = state?.connected ? 'Connected' : 'Connect';
            const buttonDisabled = !state || !state.connectable;

            return (
            <PanelCard
              key={channel.name}
              title={channel.name}
              subtitle={channel.description}
              actions={
                <button
                  disabled={buttonDisabled}
                  onClick={() => setIntegrationNotice(state?.note || 'Connect flow not implemented.')}
                  className={quietButtonClass}
                >
                  {buttonLabel}
                </button>
              }
            >
              <div className="divide-y divide-[color:var(--border)]">
                <DetailRow label="Status" value={displayState} />
                <DetailRow
                  label="Configured"
                  value={state ? (state.configured ? 'Yes' : 'No') : 'Add gateway data'}
                />
                <DetailRow label="Scopes" value={state && state.scopes.length > 0 ? state.scopes.join(', ') : 'None'} />
                <DetailRow label="Note" value={state?.note || 'No gateway note yet'} />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  disabled={buttonDisabled}
                  onClick={() => setIntegrationNotice(state?.note || 'Connect flow not implemented.')}
                  className={quietButtonClass}
                >
                  Connect
                </button>
                <button onClick={refreshPage} className={quietButtonClass}>
                  Reload
                </button>
              </div>
            </PanelCard>
            );
          })}
        </div>
        )}

        <PanelCard title="Channel health" subtitle={integrationNotice}>
          <div className={`${softPanelClass} px-4 py-4 text-sm text-[color:var(--muted)]`}>
            {integrations
              ? 'Connection state reflects the current edge server response.'
              : 'No channel telemetry reported. Add a gateway/backend to load real channel state.'}
          </div>
        </PanelCard>
      </div>
    </div>
  );

  const renderInstances = () => (
    <div className="h-full overflow-y-auto">
      <WorkspaceHeader
        title="Instances"
        subtitle="Connected clients and device presence."
        actions={
          <button onClick={refreshPage} className={quietButtonClass}>
            <RefreshCw size={15} />
            Refresh
          </button>
        }
      />
      <div className="px-6 py-6">
        <PanelCard title="Connected instances" subtitle="Browser control and device clients.">
          <div className="space-y-3">
            {instanceRows.map((instance) => (
              <div key={instance.id} className={`${softPanelClass} px-4 py-4`}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      {instance.id === 'browser-control-ui' ? <Activity size={16} /> : <Cpu size={16} />}
                      <span className="truncate text-sm font-medium text-[var(--text)]">{instance.name}</span>
                    </div>
                    <p className="mt-2 text-sm text-[color:var(--muted)]">{instance.detail}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {instance.tags.map((tag) => (
                        <span
                          key={`${instance.id}-${tag}`}
                          className="rounded-full border border-[color:var(--border)] bg-[var(--surface)] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-[color:var(--muted)]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 text-right text-sm">
                    <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] ${toneClasses(statusTone(instance.state))}`}>
                      {instance.state}
                    </span>
                    <p className="text-[color:var(--muted)]">Last seen {formatRelativeTime(now, now)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </PanelCard>
      </div>
    </div>
  );

  const renderSessions = () => (
    <div className="h-full overflow-y-auto">
      <WorkspaceHeader
        title="Sessions"
        subtitle="Inspect the active browser operator session."
        actions={
          <button
            onClick={clearMessages}
            disabled={messages.length === 0 || isStreaming}
            className={quietButtonClass}
          >
            New session
          </button>
        }
      />

      <div className="space-y-4 px-6 py-6">
        <div className="grid gap-4 lg:grid-cols-3">
          <MetricTile label="Active" value={sessionState} note={sessionState} tone={statusTone(sessionState)} />
          <MetricTile label="Messages" value={messages.length} note="current browser" />
          <MetricTile label="Route" value={statusMeta.connection} note={statusMeta.connection} tone={statusTone(statusMeta.connection)} />
        </div>

        {!hasMessages ? (
          <EmptyPanel
            icon={MessageSquareText}
            title="No session memory yet"
            text="There is no saved conversation in browser memory. Start the first chat message to create a real session history."
            actions={
              <button onClick={() => navigateToWorkspace('chat')} className={quietButtonClass}>
                <MessageSquareText size={15} />
                Open chat
              </button>
            }
          />
        ) : (
        <PanelCard title="Sessions" subtitle="Current browser session only.">
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[0.18em] text-[color:var(--muted)]">
                  <th className="border-b border-[color:var(--border)] px-3 py-3 font-medium">Key</th>
                  <th className="border-b border-[color:var(--border)] px-3 py-3 font-medium">Label</th>
                  <th className="border-b border-[color:var(--border)] px-3 py-3 font-medium">Kind</th>
                  <th className="border-b border-[color:var(--border)] px-3 py-3 font-medium">Updated</th>
                  <th className="border-b border-[color:var(--border)] px-3 py-3 font-medium">Messages</th>
                  <th className="border-b border-[color:var(--border)] px-3 py-3 font-medium">Route</th>
                  <th className="border-b border-[color:var(--border)] px-3 py-3 font-medium">State</th>
                </tr>
              </thead>
              <tbody>
                {sessionRows.map((session) => (
                  <tr key={session.key}>
                    <td className="border-b border-[color:var(--border)] px-3 py-4 font-mono text-[var(--text)]">
                      {session.key}
                    </td>
                    <td className="border-b border-[color:var(--border)] px-3 py-4 text-[var(--text)]">{session.label}</td>
                    <td className="border-b border-[color:var(--border)] px-3 py-4 text-[color:var(--muted)]">{session.kind}</td>
                    <td className="border-b border-[color:var(--border)] px-3 py-4 text-[color:var(--muted)]">
                      {formatRelativeTime(session.updatedAt, now)}
                    </td>
                    <td className="border-b border-[color:var(--border)] px-3 py-4 text-[var(--text)]">{session.messages}</td>
                    <td className="border-b border-[color:var(--border)] px-3 py-4 text-[var(--text)]">{session.route}</td>
                    <td className="border-b border-[color:var(--border)] px-3 py-4">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] ${toneClasses(statusTone(session.state))}`}>
                        {session.state}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PanelCard>
        )}
      </div>
    </div>
  );

  const usageRows = [
    { label: 'Prompts', value: promptsCount },
    { label: 'Responses', value: responseCount },
    { label: 'Cloud', value: cloudCount },
    { label: 'Errors', value: errorCount },
  ];
  const usageMax = Math.max(1, ...usageRows.map((row) => row.value));

  const renderUsage = () => (
    <div className="h-full overflow-y-auto">
      <WorkspaceHeader title="Usage" subtitle="Current browser-session message activity." />
      <div className="space-y-4 px-6 py-6">
        <PanelCard title="Filters" subtitle="Current session only.">
          <div className="flex flex-wrap gap-2">
            {(['messages', 'cloud', 'errors'] as const).map((item) => (
              <button
                key={item}
                onClick={() => setUsageMode(item)}
                className={`rounded-xl px-4 py-2 text-sm transition ${
                  item === usageMode
                    ? 'border border-[color:var(--signal)] bg-[var(--signal-soft)] text-[var(--text)]'
                    : 'border border-[color:var(--border)] bg-[var(--surface)] text-[color:var(--muted)]'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </PanelCard>

        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <PanelCard title="Activity by type" subtitle="Counts from the current browser session.">
            {messages.length === 0 ? (
              <div className={`${softPanelClass} px-4 py-10 text-center text-sm text-[color:var(--muted)]`}>
                <p>No usage data yet.</p>
                <button onClick={() => navigateToWorkspace('chat')} className={`${quietButtonClass} mt-4`}>
                  <MessageSquareText size={15} />
                  Start chat
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {usageRows.map((row) => (
                  <div key={row.label}>
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <span className="text-[color:var(--muted)]">{row.label}</span>
                      <span className="font-medium text-[var(--text)]">{row.value}</span>
                    </div>
                    <div className="mt-2 h-3 overflow-hidden rounded-full bg-[var(--surface-muted)]">
                      <div
                        className="h-full rounded-full bg-[var(--text)]"
                        style={{ width: `${Math.max((row.value / usageMax) * 100, row.value > 0 ? 10 : 0)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </PanelCard>

          <PanelCard title="Sessions" subtitle="Current session summary.">
            <div className="space-y-3">
              <div className={`${softPanelClass} px-4 py-4`}>
                <p className="font-mono text-sm text-[var(--text)]">{sessionId}</p>
                <div className="mt-3 flex items-center justify-between gap-4 text-sm">
                  <span className="text-[color:var(--muted)]">Messages</span>
                  <span className="text-[var(--text)]">{messages.length}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-4 text-sm">
                  <span className="text-[color:var(--muted)]">Errors</span>
                  <span className="text-[var(--text)]">{errorCount}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-4 text-sm">
                  <span className="text-[color:var(--muted)]">View</span>
                  <span className="text-[var(--text)]">{usageMode}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-4 text-sm">
                  <span className="text-[color:var(--muted)]">Updated</span>
                  <span className="text-[var(--text)]">{formatRelativeTime(latestActivityAt, now)}</span>
                </div>
              </div>
            </div>
          </PanelCard>
        </div>
      </div>
    </div>
  );

  const renderCron = () => (
    <div className="h-full overflow-y-auto">
      <WorkspaceHeader title="Cron Jobs" subtitle="Recurring worker definitions and workflow imports." />
      <div className="space-y-4 px-6 py-6">
        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <PanelCard title="Scheduler" subtitle="Backend scheduler status.">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricTile label="Execution" value="Not implemented" note="api missing" tone="signal" />
              <MetricTile label="Workers" value={workflowSummary.total} note="local store" />
              <MetricTile label="Enabled" value={workflowSummary.enabled} note="ready" />
              <MetricTile label="Drafts" value={workflowSummary.draft} note="pending" />
            </div>
          </PanelCard>

          <PanelCard title="Workflow storage" subtitle="Real browser-side worker definitions.">
            <div className="divide-y divide-[color:var(--border)]">
              <DetailRow label="Imported" value={String(workflowSummary.imported)} />
              <DetailRow label="Paused" value={String(workflowSummary.paused)} />
              <DetailRow label="Current route" value={statusMeta.connection} />
              <DetailRow label="Execution backend" value="Not implemented" />
            </div>
          </PanelCard>
        </div>

        <AutomationWorkspace embedded />
      </div>
    </div>
  );

  const agentTabs: AgentTab[] = ['overview', 'runtime', 'channels', 'cron'];

  const renderAgentTab = () => {
    if (agentTab === 'runtime') {
      return (
        <div className="grid gap-4 lg:grid-cols-2">
          <PanelCard title="Runtime route" subtitle="Current operator route.">
            <div className="divide-y divide-[color:var(--border)]">
              <DetailRow label="Connection" value={statusMeta.connection} />
              <DetailRow label="Model" value={activeModelLabel} />
              <DetailRow label="Current device" value={currentDeviceLabel} />
              <DetailRow label="Latency" value={statusMeta.latency} />
            </div>
          </PanelCard>
          <PanelCard title="Session counters" subtitle="Live browser session.">
            <div className="divide-y divide-[color:var(--border)]">
              <DetailRow label="Prompts" value={String(promptsCount)} />
              <DetailRow label="Responses" value={String(responseCount)} />
              <DetailRow label="Cloud replies" value={String(cloudCount)} />
              <DetailRow label="Errors" value={String(errorCount)} />
            </div>
          </PanelCard>
        </div>
      );
    }

    if (agentTab === 'channels') {
      return (
        <PanelCard title="Channel access" subtitle="Agent-visible channel state.">
          <div className="divide-y divide-[color:var(--border)]">
            <DetailRow label="Google Workspace" value={googleDisplay} />
            <DetailRow label="Meta Apps" value={metaDisplay} />
            <DetailRow label="Pairing" value={pairingDisplay} />
            <DetailRow label="Connect flow" value={integrations ? 'Gateway status only' : 'Add gateway data'} />
          </div>
        </PanelCard>
      );
    }

    if (agentTab === 'cron') {
      return (
        <PanelCard title="Recurring work" subtitle="Agent-associated workflow state.">
          <div className="divide-y divide-[color:var(--border)]">
            <DetailRow label="Stored definitions" value={String(workflowSummary.total)} />
            <DetailRow label="Enabled" value={String(workflowSummary.enabled)} />
            <DetailRow label="Imported" value={String(workflowSummary.imported)} />
            <DetailRow label="Scheduler" value="Not implemented" />
          </div>
        </PanelCard>
      );
    }

    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <PanelCard title="Overview" subtitle="Current browser-session identity from local memory.">
          <div className="divide-y divide-[color:var(--border)]">
            <DetailRow label="Identity" value={browserSessionLabel} />
            <DetailRow label="Session key" value={sessionId} monospace />
            <DetailRow label="Default model" value={activeModelLabel} />
            <DetailRow
              label="Fallback"
              value={hasGeminiKey ? 'Gemini or Ollama' : 'Add Gemini key or use Ollama'}
            />
          </div>
        </PanelCard>
        <PanelCard title="Scope" subtitle="Current operator scope.">
          <div className="divide-y divide-[color:var(--border)]">
            <DetailRow label="Device" value={currentDeviceLabel} />
            <DetailRow label="Workflows" value={String(workflowSummary.total)} />
            <DetailRow label="Logs" value={hasMessages ? 'Stored in browser memory' : 'No logs yet'} />
            <DetailRow label="Integrations" value={integrations ? 'Loaded from gateway' : 'Add gateway data'} />
          </div>
        </PanelCard>
      </div>
    );
  };

  const renderAgents = () => (
    <div className="h-full overflow-y-auto">
      <WorkspaceHeader title="Agents" subtitle="Manage the current operator profile and route." />
      <div className="grid gap-4 px-6 py-6 xl:grid-cols-[280px_1fr]">
        <PanelCard
          title="Agents"
          subtitle="Current agent state comes from local browser memory and live runtime data."
          actions={
            <button onClick={refreshPage} className={quietButtonClass}>
              <RefreshCw size={15} />
              Refresh
            </button>
          }
        >
          <button className="flex w-full items-center justify-between rounded-2xl border border-[color:var(--signal)] bg-[var(--signal-soft)] px-4 py-4 text-left">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface)] text-sm font-semibold text-[var(--text)]">
                N
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--text)]">{browserSessionLabel}</p>
                <p className="text-xs text-[color:var(--muted)]">{activeModelLabel}</p>
              </div>
            </div>
            <span className="rounded-full border border-[color:var(--border)] bg-[var(--surface)] px-3 py-1 text-[11px] text-[color:var(--muted)]">
              active
            </span>
          </button>
        </PanelCard>

        <div className="space-y-4">
          <PanelCard title={browserSessionLabel} subtitle="Current browser-managed operator runtime.">
            <div className="flex flex-wrap gap-2">
              {agentTabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setAgentTab(tab)}
                  className={`rounded-full px-4 py-2 text-sm transition ${
                    tab === agentTab
                      ? 'border border-[color:var(--signal)] bg-[var(--signal-soft)] text-[var(--text)]'
                      : 'border border-[color:var(--border)] bg-[var(--surface)] text-[color:var(--muted)]'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </PanelCard>

          {!hasMessages && !hasWorkflows && !hasDevices && !hasChannelData ? (
            <EmptyPanel
              icon={Bot}
              title="No agent memory yet"
              text="No real agent profile has been built from browser memory yet. Start a chat, add a workflow, or connect the gateway to populate this page."
              actions={
                <>
                  <button onClick={() => navigateToWorkspace('chat')} className={quietButtonClass}>
                    <MessageSquareText size={15} />
                    Start chat
                  </button>
                  <button onClick={() => navigateToWorkspace('cron')} className={quietButtonClass}>
                    <Workflow size={15} />
                    Add workflow
                  </button>
                  <button onClick={openConfigEditor} className={quietButtonClass}>
                    <SlidersHorizontal size={15} />
                    Configure gateway
                  </button>
                </>
              }
            />
          ) : (
            renderAgentTab()
          )}
        </div>
      </div>
    </div>
  );

  const renderSkills = () => (
    <div className="h-full overflow-y-auto">
      <WorkspaceHeader title="Skills" subtitle="Capabilities exposed by this build." />
      <div className="space-y-4 px-6 py-6">
        <PanelCard
          title="Capabilities"
          subtitle="Real features only."
          actions={
            <div className="relative w-full max-w-[280px]">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--muted)]" />
              <input
                value={skillFilter}
                onChange={(event) => setSkillFilter(event.target.value)}
                placeholder="Search capabilities"
                className={`${fieldClass} pl-9`}
              />
            </div>
          }
        >
          <div className="space-y-3">
            {filteredCapabilities.map((capability) => (
              <div key={capability.name} className={`${softPanelClass} px-4 py-4`}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text)]">{capability.name}</p>
                    <p className="mt-2 text-sm text-[color:var(--muted)]">{capability.description}</p>
                    <p className="mt-3 text-xs uppercase tracking-[0.16em] text-[color:var(--muted)]">
                      {capability.detail}
                    </p>
                  </div>
                  <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] ${toneClasses(
                    capability.status === 'available'
                      ? 'ok'
                      : capability.status === 'blocked'
                        ? 'warn'
                        : 'signal'
                  )}`}>
                    {capability.status === 'blocked' ? 'Needs key' : capability.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </PanelCard>
      </div>
    </div>
  );

  const nodeRows = [
    {
      id: 'browser-control-ui',
      name: browserSessionLabel,
      type: 'browser',
      route: statusMeta.connection,
      state: 'Connected',
    },
    ...knownDevices.map((device) => ({
      id: device.id,
      name: device.name,
      type: 'esp32',
      route: device.status === 'connected' ? 'Edge route' : 'Previously seen via gateway',
      state: device.status === 'connected' ? 'Connected' : 'Offline',
    })),
  ];

  const renderNodes = () => (
    <div className="h-full overflow-y-auto">
      <WorkspaceHeader title="Nodes" subtitle="Paired devices, browser control, and route exposure." />
      <div className="space-y-4 px-6 py-6">
        <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
          <PanelCard title="Node policy" subtitle="Gateway-side node policy.">
            <div className="divide-y divide-[color:var(--border)]">
              <DetailRow label="Approvals" value="Not implemented" />
              <DetailRow label="Pairing" value={pairingDisplay} />
              <DetailRow label="Default route" value={statusMeta.connection} />
              <DetailRow label="Browser node" value="Connected" />
              <DetailRow label="Device nodes" value={String(knownDevices.length)} />
            </div>
          </PanelCard>

          <PanelCard title="Registered nodes" subtitle="Current visible nodes.">
            <div className="space-y-3">
              {nodeRows.map((node) => (
                <div key={node.id} className={`${softPanelClass} px-4 py-4`}>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        {node.type === 'browser' ? <Activity size={16} /> : <Cpu size={16} />}
                        <span className="truncate text-sm font-medium text-[var(--text)]">{node.name}</span>
                      </div>
                      <p className="mt-2 font-mono text-xs text-[color:var(--muted)]">{node.id}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-[color:var(--border)] bg-[var(--surface)] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-[color:var(--muted)]">
                        {node.type}
                      </span>
                      <span className={`rounded-full border px-3 py-1 text-[11px] ${toneClasses(statusTone(node.state))}`}>
                        {node.state}
                      </span>
                      <span className="rounded-full border border-[color:var(--border)] bg-[var(--surface)] px-3 py-1 text-[11px] text-[color:var(--muted)]">
                        {node.route}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </PanelCard>
        </div>

        {!hasDevices ? (
          <EmptyPanel
            icon={Cpu}
            title="No device nodes yet"
            text="Only the current browser session is visible. Connect the edge server or add an ESP32 device to populate real node data here."
            actions={
              <button onClick={openConfigEditor} className={quietButtonClass}>
                <SlidersHorizontal size={15} />
                Configure gateway
              </button>
            }
          />
        ) : null}
      </div>
    </div>
  );

  const configMenu: Array<{ key: ConfigSection; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = [
    { key: 'system', label: 'System', icon: Server },
    { key: 'devices', label: 'Devices', icon: Cpu },
    { key: 'models', label: 'Models', icon: Bot },
    { key: 'security', label: 'Security', icon: Shield },
    { key: 'logs', label: 'Logs', icon: TerminalSquare },
    { key: 'automation', label: 'Automation', icon: Workflow },
  ];

  const renderConfigEditor = () => {
    switch (configSection) {
      case 'devices':
        return (
          <PanelCard
            title="Device settings"
            subtitle={
              deviceNotice ||
              'Add devices to browser memory or select one reported by the gateway.'
            }
            actions={
              <span
                className={`rounded-full border px-3 py-1 text-[11px] ${
                  knownDevices.length > 0 ? toneClasses('ok') : toneClasses('muted')
                }`}
              >
                {knownDevices.length > 0 ? `${knownDevices.length} device${knownDevices.length === 1 ? '' : 's'}` : 'No devices'}
              </span>
            }
          >
            <div className="grid gap-4">
              <label className="block">
                <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--muted)]">
                  Current device
                </span>
                <select
                  value={configDraft.currentDeviceId}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setCurrentDevice(nextValue || null);
                    setConfigDraft((current) => ({
                      ...current,
                      currentDeviceId: nextValue,
                    }));
                  }}
                  disabled={knownDevices.length === 0}
                  className={fieldClass}
                >
                  <option value="">
                    {knownDevices.length === 0
                      ? 'No saved or live device'
                      : 'Browser route only'}
                  </option>
                  {knownDevices.map((device) => (
                    <option key={device.id} value={device.id}>
                      {`${device.name} (${device.status})`}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,320px)_1fr]">
                <div className={`${softPanelClass} p-4`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-[var(--text)]">
                        {editingDeviceId ? 'Edit saved device' : 'Add saved device'}
                      </p>
                      <p className="mt-1 text-sm text-[color:var(--muted)]">
                        Saved devices stay in this browser and appear in the selector.
                      </p>
                    </div>
                    {editingDeviceId ? (
                      <button onClick={resetDeviceDraft} className={quietButtonClass}>
                        Cancel
                      </button>
                    ) : null}
                  </div>

                  <div className="mt-4 grid gap-3">
                    <label className="block">
                      <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--muted)]">
                        Device name
                      </span>
                      <input
                        value={deviceDraft.name}
                        onChange={(event) =>
                          setDeviceDraft((current) => ({ ...current, name: event.target.value }))
                        }
                        placeholder="Warehouse node"
                        className={fieldClass}
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--muted)]">
                        Device ID
                      </span>
                      <input
                        value={deviceDraft.id}
                        onChange={(event) =>
                          setDeviceDraft((current) => ({ ...current, id: event.target.value }))
                        }
                        placeholder="esp32-gateway-01"
                        className={`${fieldClass} font-mono`}
                      />
                    </label>

                    <button onClick={saveDeviceDraft} className={quietButtonClass}>
                      {editingDeviceId ? 'Save device' : 'Add device'}
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className={`${softPanelClass} px-4 py-4`}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[var(--text)]">Saved devices</p>
                        <p className="mt-1 text-sm text-[color:var(--muted)]">
                          Devices you explicitly added in this browser.
                        </p>
                      </div>
                      <span className="rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-[color:var(--muted)]">
                        {savedDevices.length}
                      </span>
                    </div>

                    {savedDevices.length === 0 ? (
                      <p className="mt-4 text-sm text-[color:var(--muted)]">
                        No saved devices yet. Add one with the form or connect a live gateway device.
                      </p>
                    ) : (
                      <div className="mt-4 space-y-3">
                        {savedDevices.map((device) => {
                          const deviceState =
                            devices.find((liveDevice) => liveDevice.id === device.id)?.status ||
                            'disconnected';

                          return (
                            <div key={device.id} className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface)] px-4 py-4">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-[var(--text)]">{device.name}</p>
                                  <p className="mt-1 font-mono text-xs text-[color:var(--muted)]">{device.id}</p>
                                </div>
                                <span
                                  className={`rounded-full border px-3 py-1 text-[11px] ${toneClasses(
                                    statusTone(deviceState === 'connected' ? 'Connected' : 'Offline')
                                  )}`}
                                >
                                  {deviceState}
                                </span>
                              </div>

                              <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                  onClick={() => {
                                    setCurrentDevice(device.id);
                                    setConfigDraft((current) => ({
                                      ...current,
                                      currentDeviceId: device.id,
                                    }));
                                  }}
                                  className={quietButtonClass}
                                >
                                  Use device
                                </button>
                                <button
                                  onClick={() => startEditingSavedDevice(device)}
                                  className={quietButtonClass}
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => deleteSavedDevice(device.id)}
                                  className={quietButtonClass}
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className={`${softPanelClass} px-4 py-4`}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[var(--text)]">Live gateway devices</p>
                        <p className="mt-1 text-sm text-[color:var(--muted)]">
                          {liveOnlyDevices.length > 0
                            ? `${liveOnlyDevices.length} live device${liveOnlyDevices.length === 1 ? '' : 's'} not yet saved in this browser.`
                            : 'Devices currently reported by the connected gateway.'}
                        </p>
                      </div>
                      <span className="rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-[color:var(--muted)]">
                        {devices.length}
                      </span>
                    </div>

                    <p className="mt-4 text-sm text-[color:var(--muted)]">
                      Pairing backend: {pairingDisplay}
                    </p>

                    {devices.length === 0 ? (
                      <p className="mt-4 text-sm text-[color:var(--muted)]">
                        No live device data from the gateway right now.
                      </p>
                    ) : (
                      <div className="mt-4 space-y-3">
                        {devices.map((device) => (
                          <div key={device.id} className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface)] px-4 py-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-[var(--text)]">{device.name}</p>
                                <p className="mt-1 font-mono text-xs text-[color:var(--muted)]">{device.id}</p>
                              </div>
                              <span
                                className={`rounded-full border px-3 py-1 text-[11px] ${toneClasses(
                                  statusTone(device.status === 'connected' ? 'Connected' : 'Offline')
                                )}`}
                              >
                                {device.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </PanelCard>
        );
      case 'models':
        return (
          <PanelCard
            title="Model settings"
            subtitle={modelNotice || 'Choose the active model and add saved model profiles.'}
            actions={
              <span
                className={`rounded-full border px-3 py-1 text-[11px] ${
                  modelOptions.length > 0 ? toneClasses('ok') : toneClasses('muted')
                }`}
              >
                {modelOptions.length} profile{modelOptions.length === 1 ? '' : 's'}
              </span>
            }
          >
            <div className="grid gap-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--muted)]">
                    Active browser fallback model
                  </span>
                  <select
                    value={selectedModel}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      setSelectedModel(nextValue);
                      setConfigDraft((current) => ({
                        ...current,
                        selectedModel: nextValue,
                      }));
                    }}
                    className={fieldClass}
                  >
                    {modelOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {`${option.label} · ${option.meta}`}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--muted)]">
                    Default Gemini API key
                  </span>
                  <input
                    type="password"
                    value={configDraft.geminiApiKey}
                    onChange={(event) =>
                      setConfigDraft((current) => ({
                        ...current,
                        geminiApiKey: event.target.value,
                      }))
                    }
                    placeholder="Used by the built-in Gemini profile"
                    className={`${fieldClass} font-mono`}
                  />
                </label>
              </div>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,340px)_1fr]">
                <div className={`${softPanelClass} p-4`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-[var(--text)]">
                        {editingModelId ? 'Edit saved model' : 'Add saved model'}
                      </p>
                      <p className="mt-1 text-sm text-[color:var(--muted)]">
                        Add real Gemini or Ollama profiles that this browser can run.
                      </p>
                    </div>
                    {editingModelId ? (
                      <button onClick={resetModelDraft} className={quietButtonClass}>
                        Cancel
                      </button>
                    ) : null}
                  </div>

                  <div className="mt-4 grid gap-3">
                    <label className="block">
                      <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--muted)]">
                        Display name
                      </span>
                      <input
                        value={modelDraft.name}
                        onChange={(event) =>
                          setModelDraft((current) => ({ ...current, name: event.target.value }))
                        }
                        placeholder="Office Ollama 14B"
                        className={fieldClass}
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--muted)]">
                        Provider
                      </span>
                      <select
                        value={modelDraft.provider}
                        onChange={(event) =>
                          setModelDraft((current) => ({
                            ...current,
                            provider: event.target.value as ModelProvider,
                            baseUrl:
                              event.target.value === 'ollama'
                                ? current.baseUrl || DEFAULT_OLLAMA_BASE_URL
                                : '',
                          }))
                        }
                        className={fieldClass}
                      >
                        <option value="ollama">Ollama</option>
                        <option value="gemini">Gemini</option>
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--muted)]">
                        Runtime model ID
                      </span>
                      <input
                        value={modelDraft.modelId}
                        onChange={(event) =>
                          setModelDraft((current) => ({ ...current, modelId: event.target.value }))
                        }
                        placeholder={
                          modelDraft.provider === 'gemini'
                            ? 'gemini-2.5-pro'
                            : 'qwen2.5-coder:1.5b'
                        }
                        className={`${fieldClass} font-mono`}
                      />
                    </label>

                    {modelDraft.provider === 'gemini' ? (
                      <label className="block">
                        <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--muted)]">
                          Profile API key
                        </span>
                        <input
                          type="password"
                          value={modelDraft.apiKey}
                          onChange={(event) =>
                            setModelDraft((current) => ({ ...current, apiKey: event.target.value }))
                          }
                          placeholder="Optional override for this Gemini profile"
                          className={`${fieldClass} font-mono`}
                        />
                      </label>
                    ) : (
                      <label className="block">
                        <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--muted)]">
                          Ollama base URL
                        </span>
                        <input
                          value={modelDraft.baseUrl}
                          onChange={(event) =>
                            setModelDraft((current) => ({ ...current, baseUrl: event.target.value }))
                          }
                          placeholder={DEFAULT_OLLAMA_BASE_URL}
                          className={`${fieldClass} font-mono`}
                        />
                      </label>
                    )}

                    <button onClick={saveModelDraft} className={quietButtonClass}>
                      {editingModelId ? 'Save model' : 'Add model'}
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className={`${softPanelClass} px-4 py-4`}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[var(--text)]">Built-in profiles</p>
                        <p className="mt-1 text-sm text-[color:var(--muted)]">
                          These are always available in the app.
                        </p>
                      </div>
                      <span className="rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-[color:var(--muted)]">
                        {builtInModels.length}
                      </span>
                    </div>

                    <div className="mt-4 space-y-3">
                      {builtInModels.map((profile) => {
                        const geminiReady =
                          profile.provider !== 'gemini' ||
                          hasGeminiKeyConfigured(
                            getEffectiveGeminiApiKey(profile, configDraft.geminiApiKey)
                          );

                        return (
                          <div
                            key={profile.id}
                            className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface)] px-4 py-4"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-[var(--text)]">{profile.name}</p>
                                <p className="mt-1 font-mono text-xs text-[color:var(--muted)]">
                                  {profile.modelId}
                                </p>
                              </div>
                              <span
                                className={`rounded-full border px-3 py-1 text-[11px] ${toneClasses(
                                  statusTone(
                                    profile.provider === 'gemini'
                                      ? geminiReady
                                        ? 'Configured'
                                        : 'Blocked'
                                      : 'Available'
                                  )
                                )}`}
                              >
                                {profile.provider === 'gemini'
                                  ? geminiReady
                                    ? 'ready'
                                    : 'key needed'
                                  : 'ready'}
                              </span>
                            </div>

                            {profile.provider === 'ollama' ? (
                              <p className="mt-3 font-mono text-xs text-[color:var(--muted)]">
                                {normalizeOllamaBaseUrl(profile.baseUrl)}
                              </p>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className={`${softPanelClass} px-4 py-4`}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[var(--text)]">Saved profiles</p>
                        <p className="mt-1 text-sm text-[color:var(--muted)]">
                          Custom profiles stored in this browser.
                        </p>
                      </div>
                      <span className="rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-[color:var(--muted)]">
                        {savedModelProfiles.length}
                      </span>
                    </div>

                    {savedModelProfiles.length === 0 ? (
                      <p className="mt-4 text-sm text-[color:var(--muted)]">
                        No saved models yet. Add one with the form on the left.
                      </p>
                    ) : (
                      <div className="mt-4 space-y-3">
                        {savedModelProfiles.map((profile) => {
                          const geminiReady =
                            profile.provider !== 'gemini' ||
                            hasGeminiKeyConfigured(
                              getEffectiveGeminiApiKey(profile, configDraft.geminiApiKey)
                            );

                          return (
                            <div
                              key={profile.id}
                              className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface)] px-4 py-4"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-[var(--text)]">{profile.name}</p>
                                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[color:var(--muted)]">
                                    {profile.provider}
                                  </p>
                                  <p className="mt-1 font-mono text-xs text-[color:var(--muted)]">
                                    {profile.modelId}
                                  </p>
                                </div>
                                <span
                                  className={`rounded-full border px-3 py-1 text-[11px] ${toneClasses(
                                    statusTone(
                                      profile.provider === 'gemini'
                                        ? geminiReady
                                          ? 'Configured'
                                          : 'Blocked'
                                        : 'Available'
                                    )
                                  )}`}
                                >
                                  {profile.provider === 'gemini'
                                    ? geminiReady
                                      ? 'ready'
                                      : 'key needed'
                                    : 'ready'}
                                </span>
                              </div>

                              {profile.provider === 'ollama' ? (
                                <p className="mt-3 font-mono text-xs text-[color:var(--muted)]">
                                  {normalizeOllamaBaseUrl(profile.baseUrl)}
                                </p>
                              ) : null}

                              <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                  onClick={() => {
                                    setSelectedModel(profile.id);
                                    setConfigDraft((current) => ({
                                      ...current,
                                      selectedModel: profile.id,
                                    }));
                                  }}
                                  className={quietButtonClass}
                                >
                                  Use model
                                </button>
                                <button
                                  onClick={() => startEditingSavedModel(profile)}
                                  className={quietButtonClass}
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => deleteSavedModel(profile.id)}
                                  className={quietButtonClass}
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <label className="block">
                <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--muted)]">
                  Active profile status
                </span>
                <div className={`${softPanelClass} px-4 py-4 text-sm text-[color:var(--muted)]`}>
                  <p className="font-medium text-[var(--text)]">{activeModelProfile.name}</p>
                  <p className="mt-2">
                    {activeModelProfile.provider === 'gemini'
                      ? draftHasGeminiKey ||
                        hasGeminiKeyConfigured(
                          getEffectiveGeminiApiKey(activeModelProfile, configDraft.geminiApiKey)
                        )
                        ? `Gemini profile ready for ${activeModelProfile.modelId}.`
                        : 'Gemini profile selected, but it still needs an API key.'
                      : `Ollama profile will call ${normalizeOllamaBaseUrl(activeModelProfile.baseUrl)} using ${activeModelProfile.modelId}.`}
                  </p>
                </div>
              </label>
            </div>
          </PanelCard>
        );
      case 'security':
        return (
          <PanelCard
            title="Security settings"
            subtitle={configNotice || 'Edit the shared gateway token stored in this browser.'}
            actions={
              <span
                className={`rounded-full border px-3 py-1 text-[11px] ${
                  isConfigDirty ? toneClasses('warn') : toneClasses('ok')
                }`}
              >
                {isConfigDirty ? 'Unsaved changes' : 'Saved'}
              </span>
            }
          >
            <label className="block">
              <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--muted)]">
                Gateway token
              </span>
              <input
                value={configDraft.authToken}
                onChange={(event) =>
                  setConfigDraft((current) => ({ ...current, authToken: event.target.value }))
                }
                placeholder={DEFAULT_AUTH_TOKEN}
                className={`${fieldClass} font-mono`}
              />
            </label>
          </PanelCard>
        );
      case 'logs':
        return (
          <PanelCard
            title="Log controls"
            subtitle="These actions only affect real browser session logs."
          >
            <div className="flex flex-wrap gap-3">
              <button
                onClick={clearMessages}
                disabled={messages.length === 0 || isStreaming}
                className={quietButtonClass}
              >
                Clear session messages
              </button>
              <button onClick={() => navigateToWorkspace('logs')} className={quietButtonClass}>
                Open logs
              </button>
            </div>
          </PanelCard>
        );
      case 'automation':
        return (
          <PanelCard
            title="Automation settings"
            subtitle="Automation data comes from browser memory only."
          >
            <div className="flex flex-wrap gap-3">
              <button onClick={() => navigateToWorkspace('cron')} className={quietButtonClass}>
                Open workflow builder
              </button>
            </div>
          </PanelCard>
        );
      case 'system':
      default:
        return (
          <PanelCard
            title="System settings"
            subtitle={configNotice || 'Edit the gateway endpoint and browser connection settings.'}
            actions={
              <span
                className={`rounded-full border px-3 py-1 text-[11px] ${
                  isConfigDirty ? toneClasses('warn') : toneClasses('ok')
                }`}
              >
                {isConfigDirty ? 'Unsaved changes' : 'Saved'}
              </span>
            }
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--muted)]">
                  WebSocket URL
                </span>
                <input
                  value={configDraft.wsUrl}
                  onChange={(event) =>
                    setConfigDraft((current) => ({ ...current, wsUrl: event.target.value }))
                  }
                  placeholder={DEFAULT_WS_URL}
                  className={`${fieldClass} font-mono`}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--muted)]">
                  Gateway token
                </span>
                <input
                  value={configDraft.authToken}
                  onChange={(event) =>
                    setConfigDraft((current) => ({ ...current, authToken: event.target.value }))
                  }
                  placeholder={DEFAULT_AUTH_TOKEN}
                  className={`${fieldClass} font-mono`}
                />
              </label>

              <div className={`${softPanelClass} px-4 py-4 text-sm text-[color:var(--muted)]`}>
                <div className="divide-y divide-[color:var(--border)]">
                  <DetailRow label="Edge state" value={statusMeta.edge} />
                  <DetailRow label="Health" value={statusMeta.health} />
                  <DetailRow label="Session key" value={sessionId} monospace />
                </div>
              </div>
            </div>
          </PanelCard>
        );
    }
  };

  const renderConfig = () => (
    <div className="h-full overflow-y-auto">
      <WorkspaceHeader
        title="Config"
        subtitle="Local browser settings and device registry."
        actions={
          <>
            <button onClick={resetConfig} className={quietButtonClass}>
              Reset
            </button>
            <button onClick={applyConfig} disabled={!isConfigDirty} className={quietButtonClass}>
              Save
            </button>
          </>
        }
      />
      <div className="grid gap-4 px-6 py-6 xl:grid-cols-[250px_1fr]">
        <PanelCard title="Settings" subtitle="Available configuration groups.">
          <div className="space-y-2">
            {configMenu.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  onClick={() => {
                    setConfigSection(item.key);
                    setSidebarOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition ${
                    configSection === item.key
                      ? 'border-[color:var(--signal)] bg-[var(--signal-soft)] text-[var(--text)]'
                      : 'border-transparent text-[color:var(--muted)] hover:border-[color:var(--border)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)]'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon size={16} />
                    {item.label}
                  </span>
                  <ChevronRight size={15} className="text-[color:var(--muted)]" />
                </button>
              );
            })}
          </div>
        </PanelCard>

        <div>{renderConfigEditor()}</div>
      </div>
    </div>
  );

  const renderDebug = () => (
    <div className="h-full overflow-y-auto">
      <WorkspaceHeader
        title="Debug"
        subtitle="Runtime diagnostics and current browser snapshot."
        actions={
          <button onClick={copySnapshot} className={quietButtonClass}>
            <Download size={15} />
            Copy snapshot
          </button>
        }
      />
      <div className="space-y-4 px-6 py-6">
        <div className="grid gap-4 xl:grid-cols-2">
          <PanelCard title="Connection diagnostics" subtitle="Current runtime values.">
            <div className="divide-y divide-[color:var(--border)]">
              <DetailRow label="WebSocket URL" value={wsUrl} monospace />
              <DetailRow label="Edge state" value={statusMeta.edge} />
              <DetailRow label="Route" value={statusMeta.connection} />
              <DetailRow label="Model" value={activeModelLabel} />
              <DetailRow label="Gemini key" value={hasGeminiKey ? 'Configured in browser' : 'Add API key'} />
            </div>
          </PanelCard>

          <PanelCard title="Storage diagnostics" subtitle="Current browser-held state.">
            <div className="divide-y divide-[color:var(--border)]">
              <DetailRow label="Session key" value={sessionId} monospace />
              <DetailRow label="Messages" value={String(messages.length)} />
              <DetailRow label="Workflows" value={String(workflowSummary.total)} />
              <DetailRow label="Theme" value={theme} />
              <DetailRow label="Browser" value={browserDetail} />
            </div>
          </PanelCard>
        </div>

        <PanelCard title="Runtime snapshot" subtitle={debugNotice || 'Raw state captured from the current browser session.'}>
          <pre className="overflow-x-auto rounded-2xl bg-[var(--surface-muted)] p-4 text-xs leading-6 text-[var(--text)]">
            {JSON.stringify(runtimeSnapshot, null, 2)}
          </pre>
        </PanelCard>
      </div>
    </div>
  );

  const renderLogs = () => (
    <div className="h-full overflow-y-auto">
      <WorkspaceHeader
        title="Logs"
        subtitle="Live browser-visible runtime tail."
        actions={
          <>
            <button onClick={refreshPage} className={quietButtonClass}>
              <RefreshCw size={15} />
              Refresh
            </button>
            <button onClick={exportVisibleLogs} className={quietButtonClass}>
              <Download size={15} />
              Export visible
            </button>
          </>
        }
      />
      <div className="space-y-4 px-6 py-6">
        <PanelCard
          title="Filters"
          subtitle={logNotice || 'Search and narrow visible entries.'}
          actions={
            <div className="relative w-full max-w-[280px]">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--muted)]" />
              <input
                value={logSearch}
                onChange={(event) => setLogSearch(event.target.value)}
                placeholder="Search logs"
                className={`${fieldClass} pl-9`}
              />
            </div>
          }
        >
          <div className="flex flex-wrap gap-2">
            {LOG_FILTERS.map((filter) => (
              <button
                key={filter.key}
                onClick={() => setLogFilter(filter.key)}
                className={`rounded-full px-3 py-1.5 text-sm transition ${
                  logFilter === filter.key
                    ? 'border border-[color:var(--signal)] bg-[var(--signal-soft)] text-[var(--text)]'
                    : 'border border-[color:var(--border)] bg-[var(--surface)] text-[color:var(--muted)]'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </PanelCard>

        <div className="overflow-hidden rounded-[20px] border border-[color:var(--border)] bg-[var(--terminal)] text-[var(--terminal-text)]">
          <div className="grid grid-cols-[92px_72px_160px_1fr] border-b border-white/10 px-5 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-white/45">
            <span>Time</span>
            <span>Level</span>
            <span>Source</span>
            <span>Message</span>
          </div>
          <div className="max-h-[620px] overflow-y-auto font-mono text-sm">
            {visibleLogs.length === 0 ? (
              <div className="px-5 py-10 text-center text-white/50">No visible log entries.</div>
            ) : (
              visibleLogs.map((entry, index) => (
                <div
                  key={`${entry.source}-${entry.timestamp}-${index}`}
                  className="grid grid-cols-[92px_72px_160px_1fr] gap-4 border-b border-white/6 px-5 py-3"
                >
                  <span className="text-white/45">{formatClock(entry.timestamp)}</span>
                  <span
                    className={
                      entry.level === 'ERROR'
                        ? 'text-rose-300'
                        : entry.level === 'WARN'
                          ? 'text-amber-200'
                          : 'text-white'
                    }
                  >
                    {entry.level}
                  </span>
                  <span className="text-white/45">{entry.source}</span>
                  <span className="text-white/90">{entry.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderDocs = () => (
    <div className="h-full overflow-y-auto">
      <WorkspaceHeader title="Docs" subtitle="Repository guides and local project references." />
      <div className="grid gap-4 px-6 py-6 xl:grid-cols-2">
        {DOC_ITEMS.map((item) => (
          <PanelCard
            key={item.path}
            title={item.title}
            subtitle={item.note}
            actions={<ExternalLink size={16} className="text-[color:var(--muted)]" />}
          >
            <div className={`${softPanelClass} px-4 py-4`}>
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--muted)]">
                Path
              </p>
              <p className="mt-2 font-mono text-sm text-[var(--text)]">{item.path}</p>
            </div>
          </PanelCard>
        ))}
      </div>
    </div>
  );

  const renderWorkspace = () => {
    switch (workspace) {
      case 'chat':
        return <ChatWindow />;
      case 'overview':
        return renderOverview();
      case 'channels':
        return renderChannels();
      case 'instances':
        return renderInstances();
      case 'sessions':
        return renderSessions();
      case 'usage':
        return renderUsage();
      case 'cron':
        return renderCron();
      case 'agents':
        return renderAgents();
      case 'skills':
        return renderSkills();
      case 'nodes':
        return renderNodes();
      case 'config':
        return renderConfig();
      case 'debug':
        return renderDebug();
      case 'logs':
        return renderLogs();
      case 'docs':
        return renderDocs();
      default:
        return renderOverview();
    }
  };

  return (
    <div className="h-screen w-full overflow-hidden bg-[var(--app-bg)] text-[var(--text)]">
      {sidebarOpen ? (
        <button
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-20 bg-black/20 md:hidden"
        />
      ) : null}

      <header className="flex h-[56px] items-center justify-between border-b border-[color:var(--border)] bg-[var(--surface)] px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={() => setSidebarOpen((value) => !value)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[color:var(--border)] bg-[var(--surface)] text-[var(--text)] md:hidden"
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <LogoLockup />
        </div>

        <div className="flex items-center gap-2">
          <HealthChip label={statusMeta.health} tone={statusMeta.healthTone} />
          <button
            onClick={() => setTheme((value) => (value === 'light' ? 'dark' : 'light'))}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[color:var(--border)] bg-[var(--surface)] text-[var(--text)] transition hover:bg-[var(--surface-muted)]"
          >
            {theme === 'light' ? <Moon size={17} /> : <SunMedium size={17} />}
          </button>
          <button
            onClick={openConfigEditor}
            className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--border)] bg-[var(--surface)] px-4 py-2 text-sm text-[var(--text)] transition hover:bg-[var(--surface-muted)]"
          >
            <SlidersHorizontal size={16} />
            Config
          </button>
        </div>
      </header>

      <div className="flex h-[calc(100vh-56px)] overflow-hidden">
        <aside
          className={`fixed inset-y-[56px] left-0 z-30 w-[min(280px,calc(100vw-24px))] max-w-[280px] overflow-hidden border-r border-[color:var(--border)] bg-[var(--sidebar)] shadow-2xl transition-transform duration-200 md:static md:w-[220px] md:max-w-none md:translate-x-0 md:shadow-none ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="h-full overflow-y-auto px-3 py-5">
            {NAV_GROUPS.map((group) => (
              <div key={group.label} className="mb-6">
                <div className="mb-3 flex items-center justify-between px-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--muted)]">
                    {group.label}
                  </p>
                </div>
                <div className="space-y-1.5">
                  {group.items.map((item) => (
                    <NavButton
                      key={item.key}
                      icon={item.icon}
                      label={item.label}
                      active={workspace === item.key}
                      onClick={() => {
                        if (item.key === 'config') {
                          openConfigEditor();
                        } else {
                          navigateToWorkspace(item.key);
                        }
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <main className="min-w-0 flex-1 overflow-hidden bg-[var(--app-bg)]">{renderWorkspace()}</main>
      </div>
    </div>
  );
}
