import React from 'react';
import { Message } from '../hooks/useNanoMind';

export default function MessageBubble({ message }: { message: Message }) {
  const isUser = message.from === 'user';
  const eventLabel = isUser
    ? 'PROMPT'
    : message.status === 'error'
      ? 'ERROR'
      : message.source === 'cloud'
        ? 'CLOUD'
        : 'MODEL';

  const metaLabel = isUser
    ? 'Operator input'
    : message.status === 'error'
      ? 'Runtime failure'
      : message.source === 'cloud'
        ? `Cloud fallback${message.model ? ` · ${message.model}` : ''}`
        : 'Local runtime';

  return (
    <div className="grid grid-cols-[110px_1fr] gap-4 px-5 py-4">
      <div className="space-y-2 pt-1">
        <span className="inline-flex rounded-full border border-[color:var(--border)] bg-[var(--surface-muted)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--muted)]">
          {eventLabel}
        </span>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--muted)]">
          {message.status}
        </p>
      </div>

      <div className="min-w-0">
        <div className="whitespace-pre-wrap text-sm leading-7 text-[var(--text)]">
          {message.text}
          {message.status === 'streaming' && (
            <span className="ml-1 inline-block h-4 w-2 animate-pulse rounded-sm bg-[var(--text)]/40 align-middle" />
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--muted)]">
          <span>{metaLabel}</span>
          <span className="text-[color:var(--muted-soft)]">
            {message.source ? `Source ${message.source}` : 'Source operator'}
          </span>
        </div>
      </div>
    </div>
  );
}
