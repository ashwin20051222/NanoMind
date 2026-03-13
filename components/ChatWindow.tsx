'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useNanoMind } from '../hooks/useNanoMind';
import {
  getEffectiveGeminiApiKey,
  getAvailableModelOptions,
  hasGeminiKeyConfigured,
  resolveModelProfile,
  type ModelProfile,
} from '../lib/runtimeConfig';
import MessageBubble from './MessageBubble';
import {
  Bot,
  RefreshCw,
  Send,
  SquareTerminal,
  StopCircle,
  Wifi,
  WifiOff,
} from 'lucide-react';

function getStatusMeta(
  status: 'local_online' | 'local_offline' | 'cloud_fallback' | 'reconnecting' | 'connecting',
  activeModel: ModelProfile,
  defaultGeminiApiKey: string
) {
  const usingGeminiFallback =
    activeModel.provider === 'gemini' &&
    hasGeminiKeyConfigured(getEffectiveGeminiApiKey(activeModel, defaultGeminiApiKey));
  const requiresGeminiKey =
    activeModel.provider === 'gemini' &&
    !hasGeminiKeyConfigured(getEffectiveGeminiApiKey(activeModel, defaultGeminiApiKey));

  switch (status) {
    case 'local_online':
      return { connection: 'Local runtime', health: 'Connected' };
    case 'cloud_fallback':
      return {
        connection: usingGeminiFallback
          ? `${activeModel.name} browser fallback`
          : requiresGeminiKey
            ? `${activeModel.name} API key required`
            : `${activeModel.name} fallback`,
        health: 'Degraded',
      };
    case 'reconnecting':
      return { connection: 'Reconnecting', health: 'Reconnecting' };
    case 'connecting':
      return { connection: 'Connecting', health: 'Starting' };
    case 'local_offline':
    default:
      return { connection: 'Offline', health: 'Offline' };
  }
}

export default function ChatWindow() {
  const {
    devices,
    knownDevices,
    currentDeviceId,
    setCurrentDevice,
    messages,
    sendMessage,
    isStreaming,
    cancelMessage,
    geminiApiKey,
    savedModelProfiles,
    selectedModel,
    setSelectedModel,
    edgeStatus,
    clearMessages,
  } = useNanoMind();
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const modelOptions = getAvailableModelOptions(savedModelProfiles, geminiApiKey);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const currentDevice =
    devices.find((device) => device.id === currentDeviceId) ||
    knownDevices.find((device) => device.id === currentDeviceId) ||
    devices.find((device) => device.status === 'connected') ||
    knownDevices[0] ||
    null;
  const activeModelProfile = resolveModelProfile(selectedModel, savedModelProfiles, geminiApiKey);
  const hasGeminiKey =
    activeModelProfile.provider !== 'gemini' ||
    hasGeminiKeyConfigured(getEffectiveGeminiApiKey(activeModelProfile, geminiApiKey));
  const statusMeta = getStatusMeta(edgeStatus, activeModelProfile, geminiApiKey);
  const modelLabel =
    edgeStatus === 'local_online' ? 'Edge router / llama3' : activeModelProfile.name;

  const submit = () => {
    if (!input.trim()) return;
    sendMessage(input.trim());
    setInput('');
  };

  return (
    <div className="flex h-full flex-col bg-[var(--app-bg)]">
      <div className="border-b border-[color:var(--border)] bg-[var(--surface)] px-6 py-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-[var(--text)]">Digital Worker</h1>
            <p className="mt-1 text-sm text-[color:var(--muted)]">
              Direct runtime control for the active worker session.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={currentDeviceId || knownDevices[0]?.id || ''}
              onChange={(event) => setCurrentDevice(event.target.value || null)}
              disabled={knownDevices.length === 0}
              className="rounded-xl border border-[color:var(--border)] bg-[var(--surface)] px-4 py-2 text-sm text-[var(--text)] outline-none disabled:cursor-not-allowed disabled:opacity-60"
            >
              {knownDevices.length === 0 ? (
                <option value="">Add a device in Config or connect one to the gateway</option>
              ) : null}
              {knownDevices.map((device) => (
                <option key={device.id} value={device.id}>
                  {`${device.name} (${device.status})`}
                </option>
              ))}
            </select>
            <select
              value={selectedModel}
              onChange={(event) => setSelectedModel(event.target.value)}
              className="rounded-xl border border-[color:var(--border)] bg-[var(--surface)] px-4 py-2 text-sm text-[var(--text)] outline-none"
            >
              {modelOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {activeModelProfile.provider === 'gemini' && !hasGeminiKey ? (
              <span className="rounded-full border border-[color:var(--signal)] bg-[var(--signal-soft)] px-3 py-1.5 text-xs text-[color:var(--signal)]">
                Add Gemini API key in Config
              </span>
            ) : null}
            <button
              onClick={clearMessages}
              disabled={messages.length === 0 || isStreaming}
              className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--border)] bg-[var(--surface)] px-4 py-2 text-sm text-[var(--text)] transition hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RefreshCw size={15} />
              New session
            </button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 px-6 py-5">
        <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[20px] border border-[color:var(--border)] bg-[var(--surface)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--border)] px-5 py-3">
            <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.18em] text-[color:var(--muted)]">
              <span className="inline-flex items-center gap-2">
                {edgeStatus === 'local_online' ? <Wifi size={14} /> : <WifiOff size={14} />}
                {statusMeta.connection}
              </span>
              <span>{modelLabel}</span>
              <span>{currentDevice?.id || 'No device selected'}</span>
            </div>
            <span className="rounded-full border border-[color:var(--border)] bg-[var(--surface-muted)] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-[color:var(--muted)]">
              {isStreaming ? 'Streaming' : statusMeta.health}
            </span>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="min-h-full" />
            ) : (
              <div className="divide-y divide-[color:var(--border)]">
                {messages.map((message) => (
                  <MessageBubble key={message.request_id} message={message} />
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>
      </div>

      <div className="border-t border-[color:var(--border)] bg-[var(--surface)] px-6 py-5">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
          className="flex flex-col gap-3 xl:flex-row xl:items-end"
        >
          <div className="flex-1 rounded-[18px] border border-[color:var(--border)] bg-[var(--surface)] px-4 py-3">
            <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--muted)]">
              Command
            </label>
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask or instruct the worker"
              className="w-full bg-transparent text-sm text-[var(--text)] outline-none placeholder:text-[color:var(--muted)]"
              disabled={isStreaming}
            />
          </div>

          <div className="flex items-center gap-3">
            {isStreaming ? (
              <button
                type="button"
                onClick={() => {
                  const lastMessage = messages[messages.length - 1];
                  if (lastMessage && lastMessage.status === 'streaming') {
                    cancelMessage(lastMessage.request_id);
                  }
                }}
                className="inline-flex h-[50px] items-center gap-2 rounded-xl border border-[color:var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--text)] transition hover:bg-[var(--surface-muted)]"
              >
                <StopCircle size={16} />
                Stop
              </button>
            ) : null}
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className="inline-flex h-[50px] items-center gap-2 rounded-xl bg-[var(--accent)] px-5 text-sm font-medium text-[var(--accent-foreground)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send size={16} />
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
