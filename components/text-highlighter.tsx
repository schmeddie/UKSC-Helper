'use client';

import React, { useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useDictionaryStore } from '@/lib/store';
import { findCitations } from '@/lib/citations';

interface TextHighlighterProps {
  content: string;
  onCitationClick?: (uri: string) => void;
}

interface Segment {
  type: 'text' | 'term' | 'citation';
  text: string;
  start: number;
  end: number;
  definition?: string;
  uri?: string;
}

export function TextHighlighter({ content, onCitationClick }: TextHighlighterProps) {
  const findMatches = useDictionaryStore((state) => state.findMatches);

  const segments = useMemo(() => {
    const termMatches = findMatches(content);
    const citationMatches = findCitations(content);

    // Combine and sort all matches by start position
    const allMatches: Array<{
      type: 'term' | 'citation';
      start: number;
      end: number;
      definition?: string;
      uri?: string;
    }> = [
      ...termMatches.map((m) => ({ type: 'term' as const, ...m })),
      ...citationMatches.map((c) => ({
        type: 'citation' as const,
        start: c.start,
        end: c.end,
        uri: c.uri,
      })),
    ].sort((a, b) => a.start - b.start);

    // Remove overlapping matches (prefer first match)
    const nonOverlapping = [];
    let lastEnd = 0;

    for (const match of allMatches) {
      if (match.start >= lastEnd) {
        nonOverlapping.push(match);
        lastEnd = match.end;
      }
    }

    // Build segments
    const result: Segment[] = [];
    let position = 0;

    for (const match of nonOverlapping) {
      // Add text before match
      if (position < match.start) {
        result.push({
          type: 'text',
          text: content.substring(position, match.start),
          start: position,
          end: match.start,
        });
      }

      // Add match
      result.push({
        type: match.type,
        text: content.substring(match.start, match.end),
        start: match.start,
        end: match.end,
        definition: match.type === 'term' ? match.definition : undefined,
        uri: match.type === 'citation' ? match.uri : undefined,
      });

      position = match.end;
    }

    // Add remaining text
    if (position < content.length) {
      result.push({
        type: 'text',
        text: content.substring(position),
        start: position,
        end: content.length,
      });
    }

    return result;
  }, [content, findMatches]);

  return (
    <div className="judgment-text whitespace-pre-wrap">
      {segments.map((segment, index) => {
        if (segment.type === 'text') {
          return <span key={index}>{segment.text}</span>;
        }

        if (segment.type === 'term' && segment.definition) {
          return (
            <Popover key={index}>
              <PopoverTrigger asChild>
                <span className="underline decoration-dotted decoration-blue-400 cursor-help hover:decoration-blue-600 transition-colors">
                  {segment.text}
                </span>
              </PopoverTrigger>
              <PopoverContent className="w-80" side="top">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-slate-900">
                    {segment.text}
                  </h4>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {segment.definition}
                  </p>
                </div>
              </PopoverContent>
            </Popover>
          );
        }

        if (segment.type === 'citation' && segment.uri) {
          return (
            <button
              key={index}
              onClick={() => onCitationClick?.(segment.uri!)}
              className="text-blue-600 hover:text-blue-800 underline cursor-pointer font-medium"
            >
              {segment.text}
            </button>
          );
        }

        return <span key={index}>{segment.text}</span>;
      })}
    </div>
  );
}
