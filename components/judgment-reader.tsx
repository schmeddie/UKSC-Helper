'use client';

import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, BookOpen, Calendar, Briefcase } from 'lucide-react';
import { fetchJudgmentByUri } from '@/lib/api';
import { TextHighlighter } from './text-highlighter';
import { AIExplainer } from './ai-explainer';
import { DebugPanel } from './DebugPanel';

interface ContentBlock {
  type: 'h2' | 'h3' | 'p' | 'quote';
  text: string;
}

interface JudgmentReaderProps {
  uri: string;
  onCitationClick?: (uri: string) => void;
  onJudgmentLoad?: (judgment: any) => void;
}

interface StructuredBlockProps {
  block: ContentBlock;
  onCitationClick?: (uri: string) => void;
}

function StructuredBlock({ block, onCitationClick }: StructuredBlockProps) {
  const baseClasses = 'font-serif leading-relaxed';

  switch (block.type) {
    case 'h2':
      return (
        <h2 className={`${baseClasses} text-2xl font-bold text-slate-900 border-b-2 border-gold pb-3 mb-4`}>
          <TextHighlighter content={block.text} onCitationClick={onCitationClick} />
        </h2>
      );

    case 'h3':
      return (
        <h3 className={`${baseClasses} text-xl font-bold text-slate-800 mt-8 mb-3`}>
          <TextHighlighter content={block.text} onCitationClick={onCitationClick} />
        </h3>
      );

    case 'p':
      return (
        <p className={`${baseClasses} text-lg text-slate-800`}>
          <TextHighlighter content={block.text} onCitationClick={onCitationClick} />
        </p>
      );

    case 'quote':
      return (
        <blockquote className={`${baseClasses} text-lg text-slate-600 italic border-l-4 border-blue-400 pl-6 py-2 my-4`}>
          <TextHighlighter content={block.text} onCitationClick={onCitationClick} />
        </blockquote>
      );

    default:
      return (
        <p className={`${baseClasses} text-lg text-slate-800`}>
          <TextHighlighter content={block.text} onCitationClick={onCitationClick} />
        </p>
      );
  }
}

export function JudgmentReader({ uri, onCitationClick, onJudgmentLoad }: JudgmentReaderProps) {
  const { data: judgment, isLoading, error } = useQuery({
    queryKey: ['judgment', uri],
    queryFn: () => fetchJudgmentByUri(uri),
    enabled: !!uri,
  });

  // Notify parent when judgment loads
  useEffect(() => {
    if (onJudgmentLoad) {
      onJudgmentLoad(judgment || null);
    }
  }, [judgment, onJudgmentLoad]);

  if (!uri) {
    return (
      <>
        {/* Toolbar - Empty State */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-4 min-w-0">
            <div className="hidden md:flex h-8 w-8 items-center justify-center rounded bg-slate-100 text-slate-400">
              <BookOpen className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-600 truncate max-w-md">Select a case to begin reading</h2>
              <p className="text-xs text-slate-400 font-mono">--</p>
            </div>
          </div>
        </header>

        {/* Empty State */}
        <div className="flex-1 overflow-y-auto relative">
          <div className="max-w-3xl mx-auto py-12 px-8 lg:px-12">
            <div className="flex flex-col items-center justify-center h-96 text-slate-400">
              <BookOpen className="h-12 w-12 mb-4 opacity-20" />
              <p>Select a judgment from the sidebar to load.</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (isLoading) {
    return (
      <>
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-8 shrink-0 shadow-sm z-10">
          <Loader2 className="w-4 h-4 animate-spin text-oxford mr-2" />
          <span className="text-sm text-slate-600">Loading judgment...</span>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-oxford border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-600 text-sm">Loading judgment...</p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-8 shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-red-500" />
            <span className="text-sm font-bold text-red-600">Error loading judgment</span>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <BookOpen className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Failed to load judgment
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              {error instanceof Error ? error.message : 'Unknown error occurred'}
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
    return null;
  }

  return (
    <>
      {/* Document Toolbar */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-4 min-w-0">
          <div className="hidden md:flex h-8 w-8 items-center justify-center rounded bg-slate-100 text-slate-500">
            <Briefcase className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-800 truncate max-w-md">{judgment.title}</h2>
            <p className="text-xs text-slate-500 font-mono">{judgment.cite}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          {judgment.date && (
            <>
              <Calendar className="h-3 w-3" />
              <span>{formatDate(judgment.date)}</span>
            </>
          )}
        </div>
      </header>

      {/* Reading Pane */}
      <div className="flex-1 overflow-y-auto relative">
        <div className="max-w-3xl mx-auto py-12 px-8 lg:px-12">
          {judgment.structured ? (
            // Render structured content blocks
            <div className="space-y-6">
              {judgment.structured.content.map((block, idx) => (
                <StructuredBlock
                  key={idx}
                  block={block}
                  onCitationClick={onCitationClick}
                />
              ))}
            </div>
          ) : (
            // Fallback to legacy plain text rendering
            <div className="font-serif text-lg leading-loose text-slate-800 judgment-text">
              <TextHighlighter
                content={judgment.content}
                onCitationClick={onCitationClick}
              />
            </div>
          )}
        </div>
      </div>

      {/* AI Explainer */}
      <AIExplainer caseName={judgment.title} />

      {/* Debug Panel */}
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
