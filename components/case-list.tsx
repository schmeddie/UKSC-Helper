'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Calendar, Briefcase } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { getRecentUKSCJudgments } from '@/lib/api-client';
import { JudgmentMetadata } from '@/lib/types';

interface CaseListProps {
  onSelectCase: (caseUri: string) => void;
  selectedUri?: string;
}

export function CaseList({ onSelectCase, selectedUri }: CaseListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: cases, isLoading } = useQuery({
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
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 flex-shrink-0">
        <h2 className="text-lg font-semibold text-slate-900 mb-3">
          UK Supreme Court
        </h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Search cases..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Case List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {isLoading && (
            <div className="p-4 text-center text-sm text-slate-500">
              Loading cases...
            </div>
          )}

          {!isLoading && filteredCases?.length === 0 && (
            <div className="p-4 text-center text-sm text-slate-500">
              No cases found
            </div>
          )}

          {filteredCases?.map((case_) => (
            <CaseItem
              key={case_.uri}
              case_={case_}
              isSelected={case_.uri === selectedUri}
              onClick={() => onSelectCase(case_.uri)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

interface CaseItemProps {
  case_: JudgmentMetadata;
  isSelected: boolean;
  onClick: () => void;
}

function CaseItem({ case_, isSelected, onClick }: CaseItemProps) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left p-3 rounded-lg mb-2 transition-colors
        ${
          isSelected
            ? 'bg-blue-50 border-blue-200 border'
            : 'bg-white hover:bg-slate-50 border border-transparent'
        }
      `}
    >
      <h3 className="font-medium text-sm text-slate-900 mb-2 line-clamp-2">
        {case_.name}
      </h3>

      <div className="space-y-1">
        {case_.cite && (
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Briefcase className="w-3 h-3" />
            <span className="font-mono">{case_.cite}</span>
          </div>
        )}

        {case_.date && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Calendar className="w-3 h-3" />
            <span>{formatDate(case_.date)}</span>
          </div>
        )}
      </div>
    </button>
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
