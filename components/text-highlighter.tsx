'use client';

import React, { useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useDictionaryStore } from '@/lib/store';
import { findCitations } from '@/lib/citations';
import { LegalTermCategory } from '@/lib/types';

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
  category?: LegalTermCategory;
  uri?: string;
}

// Map categories to Tailwind color classes (more visible underlines)
const getCategoryClasses = (category: LegalTermCategory): string => {
  const baseClasses = 'underline decoration-2 cursor-help transition-all duration-200';

  switch (category) {
    case 'latin':
      return `${baseClasses} decoration-purple-500 hover:decoration-purple-700 hover:bg-purple-50`;
    case 'procedural':
      return `${baseClasses} decoration-blue-500 hover:decoration-blue-700 hover:bg-blue-50`;
    case 'constitutional':
      return `${baseClasses} decoration-amber-500 hover:decoration-amber-700 hover:bg-amber-50`;
    case 'tort':
      return `${baseClasses} decoration-red-500 hover:decoration-red-700 hover:bg-red-50`;
    case 'contract':
      return `${baseClasses} decoration-green-500 hover:decoration-green-700 hover:bg-green-50`;
    case 'criminal':
      return `${baseClasses} decoration-orange-500 hover:decoration-orange-700 hover:bg-orange-50`;
    case 'evidence':
      return `${baseClasses} decoration-teal-500 hover:decoration-teal-700 hover:bg-teal-50`;
    case 'property':
      return `${baseClasses} decoration-yellow-600 hover:decoration-yellow-800 hover:bg-yellow-50`;
    default:
      return `${baseClasses} decoration-gray-500 hover:decoration-gray-700 hover:bg-gray-50`;
  }
};

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
      category?: LegalTermCategory;
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
        category: match.type === 'term' ? match.category : undefined,
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

        if (segment.type === 'term' && segment.definition && segment.category) {
          return (
            <Popover key={index}>
              <PopoverTrigger asChild>
                <span className={getCategoryClasses(segment.category)}>
                  {segment.text}
                </span>
              </PopoverTrigger>
              <PopoverContent
                className="w-80 z-[100] bg-white border-2 border-slate-300 shadow-2xl p-4 rounded-lg"
                side="top"
                align="start"
                sideOffset={15}
                alignOffset={-40}
                avoidCollisions={true}
                collisionPadding={20}
              >
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-slate-900 capitalize">
                    {segment.text}
                    <span className="ml-2 text-xs font-normal text-slate-500">
                      ({segment.category})
                    </span>
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
