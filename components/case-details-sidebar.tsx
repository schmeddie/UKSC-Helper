'use client';

import React from 'react';
import { Users, Scale, Calendar, FileText } from 'lucide-react';

interface CaseDetailsSidebarProps {
  judgment?: {
    title: string;
    cite: string;
    court: string;
    date: string;
    justices?: string[];
    citations?: string[];
  } | null;
}

export function CaseDetailsSidebar({ judgment }: CaseDetailsSidebarProps) {
  if (!judgment) {
    return (
      <aside className="w-80 bg-white border-l border-slate-200 flex flex-col shrink-0 z-10">
        <div className="h-16 flex items-center px-6 border-b border-slate-100 shrink-0">
          <FileText className="h-5 w-5 text-oxford mr-2" />
          <h2 className="font-serif text-lg font-bold text-oxford tracking-tight">Details</h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <p className="text-sm text-slate-400 text-center">
            Select a case to view details
          </p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-80 bg-white border-l border-slate-200 flex flex-col shrink-0 z-10">
      {/* Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-100 shrink-0">
        <FileText className="h-5 w-5 text-oxford mr-2" />
        <h2 className="font-serif text-lg font-bold text-oxford tracking-tight">Details</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Case Info */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Scale className="h-4 w-4 text-oxford" />
            <h3 className="text-sm font-bold text-oxford">Case Information</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-xs text-slate-500 block mb-1">Citation</span>
              <span className="text-slate-700 font-mono text-xs">{judgment.cite}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block mb-1">Court</span>
              <span className="text-slate-700">{judgment.court}</span>
            </div>
            {judgment.date && (
              <div>
                <span className="text-xs text-slate-500 block mb-1">Date</span>
                <span className="text-slate-700">{formatDate(judgment.date)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Justices */}
        {judgment.justices && judgment.justices.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-oxford" />
              <h3 className="text-sm font-bold text-oxford">Justices</h3>
            </div>
            <div className="space-y-2">
              {judgment.justices.map((justice, idx) => (
                <div
                  key={idx}
                  className="text-xs text-slate-700 p-2 rounded bg-slate-50 border border-slate-100"
                >
                  {justice}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cited Cases */}
        {judgment.citations && judgment.citations.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4 text-oxford" />
              <h3 className="text-sm font-bold text-oxford">Cited Cases</h3>
            </div>
            <div className="space-y-2">
              {judgment.citations.map((citation, idx) => (
                <div
                  key={idx}
                  className="text-xs text-slate-700 p-2 rounded bg-slate-50 border border-slate-100 hover:bg-slate-100 cursor-pointer transition-colors"
                >
                  {citation}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}
