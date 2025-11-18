'use client';

import React from 'react';
import { AlertCircle, XCircle } from 'lucide-react';

interface DebugInfo {
  attemptedUrl?: string;
  statusCode?: number;
  contentType?: string | null;
  rawPreview?: string;
  xmlStructure?: any;
  timestamp?: string;
}

interface DebugPanelProps {
  error?: string | null;
  debugInfo?: DebugInfo | null;
}

export function DebugPanel({ error, debugInfo }: DebugPanelProps) {
  // Don't render if there's no error and no debug info
  if (!error && !debugInfo) {
    return null;
  }

  // Don't render if there's no actual error (success case)
  if (!error) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 max-h-96 overflow-auto bg-red-900 border-t-4 border-red-600 shadow-2xl">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <XCircle className="w-6 h-6 text-red-300 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white mb-1">
              API Error - Debug Information
            </h3>
            <p className="text-red-200 text-sm">
              The National Archives API request failed. See details below:
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-800 border border-red-600 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-300 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-red-100 font-semibold text-sm mb-1">Error Message</h4>
                <p className="text-red-200 text-sm font-mono">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Debug Information Grid */}
        {debugInfo && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            {/* Attempted URL */}
            {debugInfo.attemptedUrl && (
              <div className="bg-red-800 border border-red-600 rounded-lg p-3">
                <h4 className="text-red-100 font-semibold text-xs uppercase mb-2">
                  Attempted URL
                </h4>
                <p className="text-red-200 text-sm font-mono break-all">
                  {debugInfo.attemptedUrl}
                </p>
              </div>
            )}

            {/* Status Code */}
            {debugInfo.statusCode !== undefined && (
              <div className="bg-red-800 border border-red-600 rounded-lg p-3">
                <h4 className="text-red-100 font-semibold text-xs uppercase mb-2">
                  HTTP Status Code
                </h4>
                <p className="text-red-200 text-2xl font-bold font-mono">
                  {debugInfo.statusCode}
                </p>
              </div>
            )}

            {/* Content Type */}
            {debugInfo.contentType && (
              <div className="bg-red-800 border border-red-600 rounded-lg p-3">
                <h4 className="text-red-100 font-semibold text-xs uppercase mb-2">
                  Content-Type
                </h4>
                <p className="text-red-200 text-sm font-mono">
                  {debugInfo.contentType}
                </p>
              </div>
            )}

            {/* Timestamp */}
            {debugInfo.timestamp && (
              <div className="bg-red-800 border border-red-600 rounded-lg p-3">
                <h4 className="text-red-100 font-semibold text-xs uppercase mb-2">
                  Timestamp
                </h4>
                <p className="text-red-200 text-sm font-mono">
                  {new Date(debugInfo.timestamp).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        )}

        {/* XML Structure */}
        {debugInfo?.xmlStructure && (
          <div className="bg-red-800 border border-red-600 rounded-lg p-3 mb-4">
            <h4 className="text-red-100 font-semibold text-xs uppercase mb-2">
              XML Structure Analysis
            </h4>
            <pre className="text-red-200 text-xs font-mono overflow-auto max-h-32 bg-red-900 p-2 rounded">
              {JSON.stringify(debugInfo.xmlStructure, null, 2)}
            </pre>
          </div>
        )}

        {/* Raw Preview */}
        {debugInfo?.rawPreview && (
          <div className="bg-red-800 border border-red-600 rounded-lg p-3">
            <h4 className="text-red-100 font-semibold text-xs uppercase mb-2">
              Raw Response (First 500 chars)
            </h4>
            <pre className="text-red-200 text-xs font-mono overflow-auto max-h-48 bg-red-900 p-2 rounded whitespace-pre-wrap break-words">
              {debugInfo.rawPreview}
            </pre>
          </div>
        )}

        {/* Help Text */}
        <div className="mt-4 pt-4 border-t border-red-700">
          <p className="text-red-200 text-xs">
            <strong>Troubleshooting:</strong> Check the server console logs for more detailed information.
            If the status code is 403, the API may be blocking the request. If the status is 404, the citation may not exist.
          </p>
        </div>
      </div>
    </div>
  );
}
