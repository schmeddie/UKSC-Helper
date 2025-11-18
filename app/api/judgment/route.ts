import { NextRequest, NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';

interface JudgmentResponse {
  title: string;
  date: string;
  content: string;
  court: string;
  year: string;
  number: string;
  cite: string;
  debug?: DebugInfo;
}

interface DebugInfo {
  attemptedUrl: string;
  statusCode: number;
  contentType: string | null;
  rawPreview: string;
  xmlStructure?: any;
  timestamp: string;
}

/**
 * Server-side proxy for fetching UK judgments from National Archives
 * Bypasses CORS by making the request from the server
 * GET /api/judgment?citation=uksc/2019/41
 */
export async function GET(request: NextRequest) {
  const debugInfo: Partial<DebugInfo> = {
    timestamp: new Date().toISOString(),
  };

  try {
    const searchParams = request.nextUrl.searchParams;
    const citation = searchParams.get('citation');

    console.log('=== JUDGMENT API REQUEST ===');
    console.log('Citation requested:', citation);

    if (!citation) {
      return NextResponse.json(
        {
          error: 'Citation parameter is required. Format: court/year/number',
          debug: { ...debugInfo, attemptedUrl: 'N/A' },
        },
        { status: 400 }
      );
    }

    // Parse citation (e.g., "uksc/2019/41")
    const parts = citation.split('/');
    if (parts.length !== 3) {
      return NextResponse.json(
        {
          error: 'Invalid citation format. Expected: court/year/number',
          debug: { ...debugInfo, attemptedUrl: 'N/A' },
        },
        { status: 400 }
      );
    }

    const [court, year, number] = parts;

    // Try both URL patterns (court-specific feeds use /uksc/year/num, generic feeds use /id/uksc/year/num)
    const urlsToTry = [
      `https://caselaw.nationalarchives.gov.uk/${court}/${year}/${number}/data.xml`,
      `https://caselaw.nationalarchives.gov.uk/id/${court}/${year}/${number}/data.xml`,
    ];

    let response: Response | null = null;
    let xmlUrl = '';

    for (const url of urlsToTry) {
      console.log('Trying URL:', url);
      try {
        const resp = await fetch(url, {
          headers: {
            'User-Agent': 'Caselaw-Explorer/1.0 (Educational)',
            'Accept': 'application/xml, text/xml, */*',
          },
        });

        console.log('Response Status:', resp.status);

        if (resp.ok) {
          response = resp;
          xmlUrl = url;
          console.log('✅ Successfully fetched from:', url);
          break;
        } else {
          console.log('❌ Failed with status:', resp.status);
        }
      } catch (error) {
        console.log('❌ Fetch error for', url, ':', error instanceof Error ? error.message : 'Unknown error');
      }
    }

    if (!response || !response.ok) {
      console.error('All judgment URLs failed');
      return NextResponse.json(
        {
          error: `Failed to fetch judgment from any source`,
          debug: { ...debugInfo, attemptedUrl: urlsToTry.join(', ') } as DebugInfo,
        },
        { status: 404 }
      );
    }

    debugInfo.attemptedUrl = xmlUrl;
    debugInfo.statusCode = response.status;
    debugInfo.contentType = response.headers.get('content-type');

    console.log('Response Status:', response.status);
    console.log('Content-Type:', debugInfo.contentType);

    // Get raw text before parsing
    const rawText = await response.text();
    debugInfo.rawPreview = rawText.substring(0, 500);

    console.log('Response length:', rawText.length, 'bytes');
    console.log('First 500 chars:', debugInfo.rawPreview);

    if (!response.ok) {
      console.error('HTTP Error:', response.status, response.statusText);
      return NextResponse.json(
        {
          error: `Failed to fetch judgment: ${response.status} ${response.statusText}`,
          debug: debugInfo as DebugInfo,
        },
        { status: response.status }
      );
    }

    // Check if response is actually XML
    if (!rawText.trim().startsWith('<?xml') && !rawText.trim().startsWith('<')) {
      console.error('Response is not XML:', rawText.substring(0, 200));
      return NextResponse.json(
        {
          error: 'Response is not valid XML',
          debug: debugInfo as DebugInfo,
        },
        { status: 500 }
      );
    }

    // Parse XML using fast-xml-parser
    console.log('Parsing XML...');
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      ignoreDeclaration: true,
      trimValues: true,
    });

    let xmlDoc;
    try {
      xmlDoc = parser.parse(rawText);
      debugInfo.xmlStructure = {
        hasAkomaNtoso: !!xmlDoc?.akomaNtoso,
        hasJudgment: !!xmlDoc?.akomaNtoso?.judgment,
        hasMeta: !!xmlDoc?.akomaNtoso?.judgment?.meta,
        hasBody: !!(xmlDoc?.akomaNtoso?.judgment?.judgmentBody || xmlDoc?.akomaNtoso?.judgment?.mainBody),
        topLevelKeys: Object.keys(xmlDoc || {}),
      };
      console.log('XML Structure:', JSON.stringify(debugInfo.xmlStructure, null, 2));
    } catch (parseError) {
      console.error('XML Parsing Error:', parseError);
      return NextResponse.json(
        {
          error: `XML parsing failed: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
          debug: debugInfo as DebugInfo,
        },
        { status: 500 }
      );
    }

    // Extract title from FRBRname
    let title = 'Untitled Judgment';
    try {
      const frbr = xmlDoc?.akomaNtoso?.judgment?.meta?.identification?.FRBRWork?.FRBRname;
      if (frbr && frbr['@_value']) {
        title = frbr['@_value'];
        console.log('Extracted title:', title);
      } else {
        console.warn('Could not find FRBRname in expected location');
      }
    } catch (e) {
      console.error('Error extracting title:', e);
    }

    // Extract date from FRBRdate
    let date = '';
    try {
      const dates = xmlDoc?.akomaNtoso?.judgment?.meta?.identification?.FRBRWork?.FRBRdate;
      if (Array.isArray(dates)) {
        const judgmentDate = dates.find((d: any) => d['@_name'] === 'judgment');
        if (judgmentDate && judgmentDate['@_date']) {
          date = judgmentDate['@_date'];
          console.log('Extracted date:', date);
        }
      } else if (dates && dates['@_date']) {
        date = dates['@_date'];
        console.log('Extracted date:', date);
      }
    } catch (e) {
      console.error('Error extracting date:', e);
    }

    // Extract content from <p> tags in judgment body
    let content = '';
    try {
      const body = xmlDoc?.akomaNtoso?.judgment?.judgmentBody || xmlDoc?.akomaNtoso?.judgment?.mainBody;

      if (body) {
        const paragraphs: string[] = [];
        const seen = new Set<string>(); // Track seen text to avoid duplicates

        // Helper function to decode HTML entities
        function decodeHtmlEntities(text: string): string {
          return text
            .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
            .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'")
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&');
        }

        // Helper function to extract all text from a node (concatenating children)
        function extractText(node: any): string {
          if (typeof node === 'string') {
            return node;
          }

          if (typeof node === 'object') {
            let text = '';

            // Get direct text content
            if (node['#text'] && typeof node['#text'] === 'string') {
              text += node['#text'];
            }

            // Process child nodes (like <em>, <strong>, etc.)
            Object.keys(node).forEach((key) => {
              if (key !== '#text' && key !== '@_' && !key.startsWith('@_')) {
                const value = node[key];
                if (Array.isArray(value)) {
                  value.forEach((item) => {
                    text += ' ' + extractText(item);
                  });
                } else {
                  text += ' ' + extractText(value);
                }
              }
            });

            return text;
          }

          return '';
        }

        // Recursive function to find <p> tags only
        function findParagraphs(node: any, depth: number = 0): void {
          if (!node || typeof node !== 'object') return;

          // Check if this node represents a <p> tag
          if (node.p) {
            const pNodes = Array.isArray(node.p) ? node.p : [node.p];

            pNodes.forEach((pNode: any) => {
              const text = extractText(pNode).trim();
              if (text && !seen.has(text)) {
                const decoded = decodeHtmlEntities(text);
                paragraphs.push(decoded);
                seen.add(text);
              }
            });
          }

          // Recursively search other child nodes for nested <p> tags
          Object.keys(node).forEach((key) => {
            if (key !== 'p' && key !== '@_' && !key.startsWith('@_')) {
              const value = node[key];
              if (Array.isArray(value)) {
                value.forEach((item) => findParagraphs(item, depth + 1));
              } else if (typeof value === 'object') {
                findParagraphs(value, depth + 1);
              }
            }
          });
        }

        findParagraphs(body);
        content = paragraphs.join('\n\n');
        console.log('Extracted content length:', content.length, 'characters');
        console.log('Number of paragraphs:', paragraphs.length);
      } else {
        console.warn('Could not find judgment body');
      }
    } catch (e) {
      console.error('Error extracting content:', e);
    }

    // Construct neutral citation
    const cite = `[${year}] ${court.toUpperCase()} ${number}`;

    const result: JudgmentResponse = {
      title,
      date,
      content: content || 'No content available',
      court: court.toUpperCase(),
      year,
      number,
      cite,
      debug: debugInfo as DebugInfo,
    };

    console.log('=== SUCCESS ===');
    console.log('Returning judgment:', cite);
    console.log('================\n');

    return NextResponse.json(result);

  } catch (error) {
    console.error('=== CRITICAL ERROR ===');
    console.error('Error in judgment API:', error);
    console.error('Stack:', error instanceof Error ? error.stack : 'N/A');
    console.error('======================\n');

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
        debug: debugInfo as DebugInfo,
      },
      { status: 500 }
    );
  }
}
