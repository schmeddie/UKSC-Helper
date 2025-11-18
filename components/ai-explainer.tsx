'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface AIExplainerProps {
  caseName: string;
}

export function AIExplainer({ caseName }: AIExplainerProps) {
  const [selectedText, setSelectedText] = useState('');
  const [buttonPosition, setButtonPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSelection = useCallback(() => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();

    if (text && text.length > 10) {
      setSelectedText(text);

      // Get selection position
      const range = selection?.getRangeAt(0);
      const rect = range?.getBoundingClientRect();

      if (rect) {
        setButtonPosition({
          x: rect.left + rect.width / 2,
          y: rect.top - 50, // Position above selection
        });
      }
    } else {
      setButtonPosition(null);
      setSelectedText('');
    }
  }, []);

  useEffect(() => {
    document.addEventListener('mouseup', handleSelection);
    document.addEventListener('touchend', handleSelection);

    return () => {
      document.removeEventListener('mouseup', handleSelection);
      document.removeEventListener('touchend', handleSelection);
    };
  }, [handleSelection]);

  const handleExplain = async () => {
    if (!selectedText) return;

    setIsLoading(true);
    setIsDialogOpen(true);
    setButtonPosition(null);

    try {
      const response = await fetch('/api/explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: selectedText,
          caseName,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get explanation');
      }

      const data = await response.json();
      setExplanation(data.explanation);
    } catch (error) {
      console.error('Error explaining text:', error);
      setExplanation(
        'Sorry, there was an error generating the explanation. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setIsDialogOpen(false);
    setExplanation('');
    window.getSelection()?.removeAllRanges();
  };

  return (
    <>
      {buttonPosition && (
        <div
          className="fixed z-50"
          style={{
            left: `${buttonPosition.x}px`,
            top: `${buttonPosition.y}px`,
            transform: 'translateX(-50%)',
          }}
        >
          <Button
            onClick={handleExplain}
            size="sm"
            className="shadow-lg animate-in fade-in slide-in-from-top-2 duration-200"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Explain with AI
          </Button>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              AI Explanation
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500 italic">
              {caseName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">
                Selected Text
              </h4>
              <p className="text-sm text-slate-700 leading-relaxed">
                {selectedText}
              </p>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="text-xs font-semibold text-blue-700 uppercase mb-2">
                Plain English Explanation
              </h4>
              {isLoading ? (
                <div className="flex items-center gap-2 text-blue-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Generating explanation...</span>
                </div>
              ) : (
                <p className="text-sm text-slate-700 leading-relaxed">
                  {explanation}
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
