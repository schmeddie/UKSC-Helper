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
        <h2 className={`${baseClasses} text-3xl font-bold text-oxford mt-12 mb-6 pb-3 border-b-4 border-gold uppercase tracking-wide`}>
          <TextHighlighter content={block.text} onCitationClick={onCitationClick} />
        </h2>
      );

    case 'h3':
      return (
        <h3 className={`${baseClasses} text-xl font-bold text-slate-800 mt-8 mb-4`}>
          <TextHighlighter content={block.text} onCitationClick={onCitationClick} />
        </h3>
      );

    case 'p':
      return (
        <p className={`${baseClasses} text-lg text-slate-800 mb-4`}>
          <TextHighlighter content={block.text} onCitationClick={onCitationClick} />
        </p>
      );

    case 'quote':
      return (
        <blockquote className={`${baseClasses} text-lg text-slate-600 italic border-l-4 border-blue-400 pl-6 py-3 my-6 bg-slate-50 rounded-r`}>
          <TextHighlighter content={block.text} onCitationClick={onCitationClick} />
        </blockquote>
      );

    default:
      return (
        <p className={`${baseClasses} text-lg text-slate-800 mb-4`}>
          <TextHighlighter content={block.text} onCitationClick={onCitationClick} />
        </p>
      );
  }
}

export function JudgmentReader({ uri, onCitationClick, onJudgmentLoad }: JudgmentReaderProps) {
  const [streamingBlocks, setStreamingBlocks] = React.useState<ContentBlock[]>([]);
  const [isStreaming, setIsStreaming] = React.useState(false);
  const [streamError, setStreamError] = React.useState<string | null>(null);
  const [streamProgress, setStreamProgress] = React.useState({ current: 0, total: 0 });

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

  // Start streaming when we have a URI and judgment metadata is loaded
  useEffect(() => {
    if (!uri || !judgment || judgment.structured) return;

    const citation = uri.replace(/^\/+|\/+$/g, '');
    setIsStreaming(true);
    setStreamingBlocks([]);
    setStreamError(null);

    const eventSource = new EventSource(`/api/judgment/stream?citation=${encodeURIComponent(citation)}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'meta') {
          console.log(`📊 Stream meta: ${data.totalChunks} chunks`);
          setStreamProgress({ current: 0, total: data.totalChunks });
        } else if (data.type === 'block') {
          console.log(`📝 Received block: [${data.block.type}] ${data.block.text.substring(0, 60)}...`);
          setStreamingBlocks((prev) => [...prev, data.block]);
        } else if (data.type === 'chunk_complete') {
          console.log(`✓ Chunk ${data.index}/${data.total} complete`);
          setStreamProgress({ current: data.index, total: data.total });
        } else if (data.type === 'complete') {
          console.log('✓ Stream complete');
          setIsStreaming(false);
          eventSource.close();
        } else if (data.type === 'error') {
          console.error('❌ Stream error:', data.message);
          setStreamError(data.message);
          setIsStreaming(false);
          eventSource.close();
        }
      } catch (err) {
        console.error('Error parsing stream data:', err);
      }
    };

    eventSource.onerror = () => {
      setStreamError('Connection lost');
      setIsStreaming(false);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [uri, judgment]);

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
          {/* Streaming Progress */}
          {isStreaming && streamProgress.total > 0 && (
            <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-blue-700 font-medium">
                  Structuring judgment... ({streamingBlocks.length} blocks received)
                </span>
                <span className="text-xs text-blue-600">
                  Chunk {streamProgress.current} of {streamProgress.total}
                </span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(streamProgress.current / streamProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Stream Error */}
          {streamError && (
            <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">Streaming error: {streamError}</p>
            </div>
          )}

          {/* Debug Info */}
          {(streamingBlocks.length > 0 || isStreaming) && (
            <div className="mb-4 p-3 bg-slate-100 border border-slate-300 rounded text-xs font-mono">
              <div>Streaming: {isStreaming ? 'YES' : 'NO'}</div>
              <div>Blocks received: {streamingBlocks.length}</div>
              <div>Rendering: {streamingBlocks.length > 0 ? 'STRUCTURED BLOCKS' : 'WAITING...'}</div>
            </div>
          )}

          {/* Render streaming blocks with fade-in animation */}
          {streamingBlocks.length > 0 ? (
            <div className="space-y-6">
              {streamingBlocks.map((block, idx) => (
                <div
                  key={idx}
                  className="animate-fade-in"
                  style={{
                    animationDelay: `${Math.min(idx * 50, 1000)}ms`,
                    animationFillMode: 'backwards',
                  }}
                >
                  <StructuredBlock
                    block={block}
                    onCitationClick={onCitationClick}
                  />
                </div>
              ))}
            </div>
          ) : judgment.structured ? (
            // Render pre-structured content blocks
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
