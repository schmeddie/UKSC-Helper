import { NextRequest, NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';

/**
 * Server-side proxy for searching UK judgments
 * Uses the Atom feed since the /structured_search endpoint returns HTML
 * GET /api/search?court=uksc&order=-date&page=1
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    console.log('=== SEARCH API REQUEST ===');
    console.log('Search params:', Object.fromEntries(searchParams.entries()));

    const court = searchParams.get('court') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const order = searchParams.get('order') || '-date';

    // Use the Atom feed which is documented and returns XML
    // We'll filter by court on our side
    const url = `https://caselaw.nationalarchives.gov.uk/atom.xml`;
    console.log('Fetching Atom feed:', url);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Caselaw-Explorer/1.0 (Educational)',
        'Accept': 'application/atom+xml, application/xml, text/xml',
      },
    });

    console.log('Response Status:', response.status);
    console.log('Content-Type:', response.headers.get('content-type'));

    if (!response.ok) {
      const text = await response.text();
      console.error('Atom feed Error:', response.status, text.substring(0, 200));

      return NextResponse.json(
        {
          error: `Failed to fetch Atom feed: ${response.status} ${response.statusText}`,
          results: [],
          total: 0,
        },
        { status: response.status }
      );
    }

    // Parse Atom XML
    const xmlText = await response.text();
    console.log('Atom XML length:', xmlText.length, 'bytes');

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      ignoreDeclaration: true,
      trimValues: true,
    });

    const feed = parser.parse(xmlText);
    const entries = feed?.feed?.entry || [];
    const entriesArray = Array.isArray(entries) ? entries : [entries];

    console.log('Total entries in feed:', entriesArray.length);

    // Debug: Log first entry structure
    if (entriesArray.length > 0) {
      console.log('First entry structure:', JSON.stringify(entriesArray[0], null, 2).substring(0, 500));
    }

    // Convert Atom entries to our format
    let results = entriesArray
      .map((entry: any) => {
        // Extract URI from link (e.g., https://caselaw.nationalarchives.gov.uk/id/uksc/2024/1)
        // Link can be an object with @_href attribute, or an array of link objects
        let linkHref = '';
        if (typeof entry.link === 'string') {
          linkHref = entry.link;
        } else if (entry.link?.['@_href']) {
          linkHref = entry.link['@_href'];
        } else if (Array.isArray(entry.link)) {
          // Find the link with type="text/html" or the first one
          const htmlLink = entry.link.find((l: any) => l['@_type'] === 'text/html' || l['@_rel'] === 'alternate');
          linkHref = htmlLink?.['@_href'] || entry.link[0]?.['@_href'] || '';
        }

        const uriMatch = linkHref.match(/\/id\/(.+)/);
        const uri = uriMatch ? uriMatch[1] : '';

        // Extract court from URI (e.g., uksc from uksc/2024/1)
        const courtMatch = uri.match(/^([^\/]+)\//);
        const entryCourt = courtMatch ? courtMatch[1].toUpperCase() : '';

        // Extract neutral citation from content or construct from URI
        const content = entry.content?.['#text'] || entry.content || '';
        const citeMatch = content.match(/\[(\d{4})\]\s+([A-Z]+)\s+(\d+)/);
        let cite = '';
        if (citeMatch) {
          cite = `[${citeMatch[1]}] ${citeMatch[2]} ${citeMatch[3]}`;
        } else if (uri) {
          const parts = uri.split('/');
          if (parts.length === 3) {
            cite = `[${parts[1]}] ${parts[0].toUpperCase()} ${parts[2]}`;
          }
        }

        return {
          uri,
          name: entry.title?.['#text'] || entry.title || 'Untitled',
          cite,
          date: entry.updated?.['#text'] || entry.updated || '',
          court: entryCourt,
        };
      })
      .filter((item: any) => item.uri); // Only include items with valid URIs

    // Filter by court if specified
    if (court) {
      const courtUpper = court.toUpperCase();
      results = results.filter((item: any) => item.court === courtUpper);
      console.log('Filtered to court', courtUpper + ':', results.length, 'results');
    }

    // Sort by date if requested (Atom feed is already in reverse chronological order)
    if (order === 'date') {
      results.reverse();
    }

    console.log('=== SEARCH SUCCESS ===');
    console.log('Returning', results.length, 'results\n');

    return NextResponse.json({
      results,
      total: results.length,
    });

  } catch (error) {
    console.error('=== SEARCH ERROR ===');
    console.error('Error in search API:', error);
    console.error('Stack:', error instanceof Error ? error.stack : 'N/A');
    console.error('====================\n');

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
        results: [],
        total: 0,
      },
      { status: 500 }
    );
  }
}
