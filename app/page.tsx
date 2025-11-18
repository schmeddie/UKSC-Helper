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
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden">
      {/* Left Sidebar */}
      <aside className="w-80 border-r border-slate-200 bg-white flex-shrink-0 overflow-hidden">
        <CaseList onSelectCase={setSelectedUri} selectedUri={selectedUri} />
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-slate-50">
        {selectedUri ? (
          <JudgmentReader uri={selectedUri} onCitationClick={handleCitationClick} />
        ) : (
          <div className="flex items-center justify-center min-h-full p-8">
            <div className="text-center max-w-2xl">
              <h1 className="text-4xl font-bold text-slate-900 mb-4">
                UK Supreme Court Judgment Explorer
              </h1>
              <p className="text-lg text-slate-600 mb-2">
                Select a case from the sidebar to begin reading.
              </p>
              <p className="text-sm text-slate-500">
                Legal terms will be underlined for instant definitions.
                Highlight any text to get an AI-powered explanation.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
