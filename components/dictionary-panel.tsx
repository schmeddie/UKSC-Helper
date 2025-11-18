'use client';

import React, { useState } from 'react';
import { Search, BookOpen } from 'lucide-react';
import { useDictionaryStore } from '@/lib/store';

export function DictionaryPanel() {
  const [searchQuery, setSearchQuery] = useState('');
  const terms = useDictionaryStore((state) => state.terms);

  const filteredTerms = terms.filter((item) => {
    if (!searchQuery) return true;
    return item.term.toLowerCase().includes(searchQuery.toLowerCase());
  }).sort((a, b) => a.term.localeCompare(b.term));

  return (
    <>
      {/* Panel Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-100 shrink-0 bg-white">
        <h2 className="font-serif text-xl font-bold text-oxford tracking-tight">Dictionary</h2>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search legal terms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-oxford focus:border-oxford transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Terms List */}
      <div className="flex-1 overflow-y-auto">
        {filteredTerms.length === 0 && (
          <div className="p-8 text-center">
            <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-400">
              {searchQuery ? 'No terms found' : 'Dictionary is empty'}
            </p>
          </div>
        )}

        {filteredTerms.map((item) => (
          <div
            key={item.term}
            className="p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors"
          >
            <h4 className="font-bold text-sm text-oxford mb-2">{item.term}</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              {item.definition}
            </p>
          </div>
        ))}
      </div>
    </>
  );
}
