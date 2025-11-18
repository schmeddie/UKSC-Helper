'use client';

import React from 'react';
import { Settings as SettingsIcon } from 'lucide-react';

export function SettingsPanel() {
  return (
    <>
      {/* Panel Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-100 shrink-0 bg-white">
        <h2 className="font-serif text-xl font-bold text-oxford tracking-tight">Settings</h2>
      </div>

      {/* Settings Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6">
          {/* Appearance */}
          <div>
            <h3 className="text-sm font-bold text-oxford mb-3">Appearance</h3>
            <div className="space-y-2">
              <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <span className="text-sm text-slate-700">Show term highlights</span>
                <input
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4 text-oxford focus:ring-oxford border-slate-300 rounded"
                />
              </label>
              <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <span className="text-sm text-slate-700">Show tooltips on hover</span>
                <input
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4 text-oxford focus:ring-oxford border-slate-300 rounded"
                />
              </label>
            </div>
          </div>

          {/* Reading */}
          <div>
            <h3 className="text-sm font-bold text-oxford mb-3">Reading</h3>
            <div className="space-y-2">
              <div className="p-3 rounded-lg border border-slate-200">
                <label className="block text-sm text-slate-700 mb-2">Font size</label>
                <select className="w-full text-sm border border-slate-200 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-oxford">
                  <option value="sm">Small</option>
                  <option value="md" selected>Medium</option>
                  <option value="lg">Large</option>
                </select>
              </div>
              <div className="p-3 rounded-lg border border-slate-200">
                <label className="block text-sm text-slate-700 mb-2">Line height</label>
                <select className="w-full text-sm border border-slate-200 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-oxford">
                  <option value="normal">Normal</option>
                  <option value="relaxed" selected>Relaxed</option>
                  <option value="loose">Loose</option>
                </select>
              </div>
            </div>
          </div>

          {/* About */}
          <div>
            <h3 className="text-sm font-bold text-oxford mb-3">About</h3>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-xs text-slate-600 leading-relaxed">
                <strong className="text-oxford">Ratio</strong> is a UK Supreme Court judgment reader
                powered by the National Archives Find Case Law API.
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Version 1.0.0
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
