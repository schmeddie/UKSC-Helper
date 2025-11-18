'use client';

import { useState, useEffect } from 'react';
import { NavigationSidebar } from '@/components/navigation-sidebar';
import { CasesPanel } from '@/components/cases-panel';
import { DictionaryPanel } from '@/components/dictionary-panel';
import { SettingsPanel } from '@/components/settings-panel';
import { JudgmentReader } from '@/components/judgment-reader';
import { CaseDetailsSidebar } from '@/components/case-details-sidebar';
import { useDictionaryStore } from '@/lib/store';
import { mockLegalDictionary } from '@/lib/mock-dictionary';

type NavOption = 'cases' | 'dictionary' | 'settings';

export default function Home() {
  const [selectedOption, setSelectedOption] = useState<NavOption>('cases');
  const [selectedUri, setSelectedUri] = useState<string>('');
  const [currentJudgment, setCurrentJudgment] = useState<any>(null);

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
    // Switch to cases panel when a citation is clicked
    setSelectedOption('cases');
  };

  return (
    <div className="flex h-screen w-full bg-paper overflow-hidden">
      {/* Left Navigation + Panel */}
      <NavigationSidebar
        selectedOption={selectedOption}
        onSelectOption={setSelectedOption}
      >
        {selectedOption === 'cases' && (
          <CasesPanel onSelectCase={setSelectedUri} selectedUri={selectedUri} />
        )}
        {selectedOption === 'dictionary' && <DictionaryPanel />}
        {selectedOption === 'settings' && <SettingsPanel />}
      </NavigationSidebar>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-paper relative">
        <JudgmentReader
          uri={selectedUri}
          onCitationClick={handleCitationClick}
          onJudgmentLoad={setCurrentJudgment}
        />
      </main>

      {/* Right Sidebar - Case Details */}
      <CaseDetailsSidebar judgment={currentJudgment} />
    </div>
  );
}
