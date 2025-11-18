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
}

/**
 * Server-side proxy for fetching UK judgments from National Archives
 * Bypasses CORS by making the request from the server
 * GET /api/judgment?citation=uksc/2019/41
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const citation = searchParams.get('citation');

    if (!citation) {
      return NextResponse.json(
        { error: 'Citation parameter is required. Format: court/year/number' },
        { status: 400 }
      );
    }

    // Parse citation (e.g., "uksc/2019/41")
    const parts = citation.split('/');
    if (parts.length !== 3) {
      return NextResponse.json(
        { error: 'Invalid citation format. Expected: court/year/number' },
        { status: 400 }
      );
    }

    const [court, year, number] = parts;

    // Fetch XML from National Archives (server-side, no CORS issues)
    const xmlUrl = `https://caselaw.nationalarchives.gov.uk/id/${court}/${year}/${number}/data.xml`;

    const response = await fetch(xmlUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; UKSC-Helper/1.0)',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch judgment: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    const xmlText = await response.text();

    // Parse XML using fast-xml-parser
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      ignoreDeclaration: true,
      trimValues: true,
    });

    const xmlDoc = parser.parse(xmlText);

    // Extract title from FRBRname
    let title = 'Untitled Judgment';
    try {
      const frbr = xmlDoc?.akomaNtoso?.judgment?.meta?.identification?.FRBRWork?.FRBRname;
      if (frbr && frbr['@_value']) {
        title = frbr['@_value'];
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
        }
      } else if (dates && dates['@_date']) {
        date = dates['@_date'];
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
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error in judgment API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
