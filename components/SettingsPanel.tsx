'use client';

import React from 'react';
import { Settings, Shield, Globe, Save, X } from 'lucide-react';

export default function SettingsPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 p-6">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-800">
            <Settings size={24} className="text-slate-700" />
            Settings
          </h2>
          <button onClick={onClose} className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 space-y-8 overflow-y-auto p-6">
          <section>
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500">
              <Globe size={16} /> Integrations
            </h3>
            <div className="space-y-4">
              {[
                ['Meta Apps', 'WhatsApp, Messenger, Instagram'],
                ['Google Workspace', 'Calendar, Gmail, Drive'],
              ].map(([label, description]) => (
                <div key={label} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div>
                    <h4 className="font-medium text-slate-800">{label}</h4>
                    <p className="mt-1 text-xs text-slate-500">{description}</p>
                  </div>
                  <span className="rounded-full bg-slate-200 px-4 py-2 text-sm font-medium text-slate-600">
                    Not implemented
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500">
              <Shield size={16} /> Connection
            </h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Edge Server URL</label>
                <input
                  type="text"
                  defaultValue={process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000/assistant'}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm outline-none"
                  readOnly
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Auth Token</label>
                <input
                  type="text"
                  defaultValue={process.env.NEXT_PUBLIC_AUTH_TOKEN || 'Not configured'}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm outline-none"
                  readOnly
                />
              </div>
            </div>
          </section>
        </div>

        <div className="border-t border-slate-200 bg-slate-50 p-6">
          <button onClick={onClose} className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 font-medium text-white">
            <Save size={18} /> Close
          </button>
        </div>
      </div>
    </div>
  );
}
