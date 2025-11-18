'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, BookOpen, Calendar, Briefcase } from 'lucide-react';
import { fetchJudgmentByUri } from '@/lib/api';
import { TextHighlighter } from './text-highlighter';
import { AIExplainer } from './ai-explainer';
import { DebugPanel } from './DebugPanel';

interface JudgmentReaderProps {
  uri: string;
  onCitationClick?: (uri: string) => void;
}

export function JudgmentReader({ uri, onCitationClick }: JudgmentReaderProps) {
  const { data: judgment, isLoading, error } = useQuery({
    queryKey: ['judgment', uri],
    queryFn: () => fetchJudgmentByUri(uri),
    enabled: !!uri,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading judgment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <>
        <div className="flex items-center justify-center h-full">
          <div className="text-center max-w-md">
            <BookOpen className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Failed to load judgment
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              {error instanceof Error ? error.message : 'Unknown error occurred'}
            </p>
            <p className="text-xs text-slate-500">
              Check the debug panel at the bottom of the page for more details.
            </p>
          </div>
        </div>
        <DebugPanel
          error={error instanceof Error ? error.message : 'Unknown error occurred'}
          debugInfo={(error as any)?.debug || null}
        />
      </>
    );
  }

  if (!judgment) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            Select a case to read
          </h3>
          <p className="text-sm text-slate-600">
            Choose a judgment from the list to view its full text with
            interactive definitions and AI-powered explanations.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-full bg-slate-50">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 p-6">
          <h1 className="text-2xl font-serif font-bold text-slate-900 mb-4">
            {judgment.title}
          </h1>

          <div className="flex flex-wrap gap-4 text-sm text-slate-600">
            {judgment.cite && (
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                <span className="font-mono">{judgment.cite}</span>
              </div>
            )}

            {judgment.date && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(judgment.date)}</span>
              </div>
            )}

            {judgment.court && (
              <div className="flex items-center gap-2">
                <span className="text-slate-400">•</span>
                <span className="uppercase text-xs font-semibold">
                  {judgment.court}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="max-w-4xl mx-auto p-8">
            <TextHighlighter
              content={judgment.content}
              onCitationClick={onCitationClick}
            />
          </div>
        </ScrollArea>

        {/* AI Explainer */}
        <AIExplainer caseName={judgment.title} />
      </div>

      {/* Debug Panel - shows when there's debug info */}
      {judgment.debug && (
        <DebugPanel
          error={null}
          debugInfo={judgment.debug}
        />
      )}
    </>
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
