'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { getRecentUKSCJudgments, JudgmentMetadata } from '@/lib/api';

interface CasesPanelProps {
  onSelectCase: (caseUri: string) => void;
  selectedUri?: string;
}

export function CasesPanel({ onSelectCase, selectedUri }: CasesPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: cases, isLoading, error } = useQuery({
    queryKey: ['uksc-judgments'],
    queryFn: () => getRecentUKSCJudgments(50),
  });

  const filteredCases = cases?.filter((c) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(query) ||
      c.cite.toLowerCase().includes(query) ||
      c.date.toLowerCase().includes(query)
    );
  });

  return (
    <>
      {/* Panel Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-100 shrink-0 bg-white">
        <h2 className="font-serif text-xl font-bold text-oxford tracking-tight">Cases</h2>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search cases, years..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-oxford focus:border-oxford transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Case List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
        {isLoading && (
          <div className="p-8 text-center">
            <div className="w-5 h-5 border-2 border-oxford border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs text-slate-500">Loading cases...</p>
          </div>
        )}

        {error && (
          <div className="p-4 mx-4 mt-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-sm text-red-700 font-medium mb-1">
              Failed to load cases
            </div>
            <div className="text-xs text-red-600">
              {error instanceof Error ? error.message : 'Unknown error'}
            </div>
          </div>
        )}

        {!isLoading && !error && filteredCases?.length === 0 && (
          <div className="p-8 text-center text-sm text-slate-400">
            No cases found
          </div>
        )}

        {!error && filteredCases?.map((case_) => (
          <CaseItem
            key={case_.uri}
            case_={case_}
            isSelected={case_.uri === selectedUri}
            onClick={() => onSelectCase(case_.uri)}
          />
        ))}
      </div>
    </>
  );
}

interface CaseItemProps {
  case_: JudgmentMetadata;
  isSelected: boolean;
  onClick: () => void;
}

function CaseItem({ case_, isSelected, onClick }: CaseItemProps) {
  const year = case_.date ? new Date(case_.date).getFullYear() : '--';

  return (
    <div
      onClick={onClick}
      className={`
        p-4 cursor-pointer border-l-4 transition-all group
        ${
          isSelected
            ? 'bg-slate-50 border-oxford'
            : 'border-transparent hover:bg-slate-50 hover:border-slate-300'
        }
      `}
    >
      <div className="flex justify-between items-start mb-1">
        <h4 className={`text-sm font-bold line-clamp-2 pr-2 ${isSelected ? 'text-oxford' : 'text-slate-700 group-hover:text-oxford'}`}>
          {case_.name}
        </h4>
        <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${isSelected ? 'bg-white border border-slate-200' : 'text-slate-400 bg-slate-100 group-hover:bg-white group-hover:border group-hover:border-slate-200'}`}>
          {year}
        </span>
      </div>

      {case_.cite && (
        <p className="text-xs text-slate-500 font-mono mb-2">
          {case_.cite}
        </p>
      )}

      {case_.date && (
        <p className="text-xs text-slate-400">
          {formatDate(case_.date)}
        </p>
      )}
    </div>
  );
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}
