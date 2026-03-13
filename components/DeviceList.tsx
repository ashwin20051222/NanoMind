'use client';

import React from 'react';
import { useNanoMind } from '../hooks/useNanoMind';
import { Cpu, Plus, Wifi, WifiOff } from 'lucide-react';

export default function DeviceList() {
  const { devices, currentDeviceId, setCurrentDevice } = useNanoMind();

  return (
    <div className="w-64 bg-slate-900 text-slate-300 flex flex-col h-full border-r border-slate-800">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Devices</h2>
        <button className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors">
          <Plus size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {devices.length === 0 ? (
          <div className="text-center p-4 text-xs text-slate-500">
            No devices paired. Click + to pair an ESP32.
          </div>
        ) : (
          devices.map(device => (
            <button
              key={device.id}
              onClick={() => setCurrentDevice(device.id)}
              className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 transition-colors ${
                currentDeviceId === device.id 
                  ? 'bg-indigo-600/20 text-indigo-400' 
                  : 'hover:bg-slate-800'
              }`}
            >
              <Cpu size={18} className={currentDeviceId === device.id ? 'text-indigo-400' : 'text-slate-500'} />
              <span className="flex-1 truncate text-sm font-medium">{device.name}</span>
              {device.status === 'connected' ? (
                <Wifi size={14} className="text-emerald-500" />
              ) : (
                <WifiOff size={14} className="text-rose-500" />
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
