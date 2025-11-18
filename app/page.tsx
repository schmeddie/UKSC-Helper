'use client';

import { useState, useEffect } from 'react';
import { CaseList } from '@/components/case-list';
import { JudgmentReader } from '@/components/judgment-reader';
import { useDictionaryStore } from '@/lib/store';
import { mockLegalDictionary } from '@/lib/mock-dictionary';

export default function Home() {
  const [selectedUri, setSelectedUri] = useState<string>('');
  const loadDictionary = useDictionaryStore((state) => state.loadDictionary);
  const isLoaded = useDictionaryStore((state) => state.isLoaded);

  // Load dictionary on mount
  useEffect(() => {
    if (!isLoaded) {
      loadDictionary(mockLegalDictionary);
    }
  }, [isLoaded, loadDictionary]);

  const handleCitationClick = (uri: string) => {
    // Extract the path from the full URL if needed
    const path = uri.replace('https://caselaw.nationalarchives.gov.uk/id/', '');
    setSelectedUri(path);
  };

  return (
    <div className="flex h-screen w-full bg-paper overflow-hidden">
      {/* Left Sidebar */}
      <aside className="w-80 bg-white border-r border-slate-200 flex flex-col shrink-0 z-20">
        <CaseList onSelectCase={setSelectedUri} selectedUri={selectedUri} />
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-paper relative">
        <JudgmentReader uri={selectedUri} onCitationClick={handleCitationClick} />
      </main>
    </div>
  );
}
