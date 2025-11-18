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

    // Construct URL
    const xmlUrl = `https://caselaw.nationalarchives.gov.uk/id/${court}/${year}/${number}/data.xml`;
    debugInfo.attemptedUrl = xmlUrl;

    console.log('Fetching URL:', xmlUrl);

    // Fetch XML from National Archives (server-side, no CORS issues)
    const response = await fetch(xmlUrl, {
      headers: {
        'User-Agent': 'Caselaw-Explorer/1.0 (Educational)',
        'Accept': 'application/xml, text/xml, */*',
      },
    });

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

        // Recursive function to extract text from all <p> tags
        function extractParagraphs(node: any): void {
          if (!node) return;

          if (typeof node === 'string') {
            const trimmed = node.trim();
            if (trimmed) paragraphs.push(trimmed);
            return;
          }

          if (typeof node === 'object') {
            // If this is a <p> tag
            if (node['#text']) {
              const trimmed = node['#text'].trim();
              if (trimmed) paragraphs.push(trimmed);
            }

            // Recursively process child nodes
            Object.keys(node).forEach((key) => {
              if (key !== '@_' && !key.startsWith('@_')) {
                const value = node[key];
                if (Array.isArray(value)) {
                  value.forEach(extractParagraphs);
                } else {
                  extractParagraphs(value);
                }
              }
            });
          }
        }

        extractParagraphs(body);
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
