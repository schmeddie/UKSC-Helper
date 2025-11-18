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
    <div className="flex h-screen overflow-hidden">
      {/* Left Sidebar - Case List */}
      <div className="w-80 flex-shrink-0">
        <CaseList onSelectCase={setSelectedUri} selectedUri={selectedUri} />
      </div>

      {/* Main Content - Judgment Reader */}
      <div className="flex-1 overflow-hidden">
        {selectedUri ? (
          <JudgmentReader uri={selectedUri} onCitationClick={handleCitationClick} />
        ) : (
          <div className="flex items-center justify-center h-full bg-slate-50">
            <div className="text-center max-w-md px-4">
              <h1 className="text-3xl font-serif font-bold text-slate-900 mb-4">
                UK Supreme Court Judgment Explorer
              </h1>
              <p className="text-slate-600 mb-2">
                Select a case from the sidebar to begin reading.
              </p>
              <p className="text-sm text-slate-500">
                Legal terms will be underlined for instant definitions.
                Highlight any text to get an AI-powered explanation.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
