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
    // Try multiple URL patterns to find court-specific feed
    const urlsToTry = court
      ? [
          `https://caselaw.nationalarchives.gov.uk/${court.toLowerCase()}/atom.xml`,
          `https://caselaw.nationalarchives.gov.uk/atom.xml?court=${court.toLowerCase()}`,
          `https://caselaw.nationalarchives.gov.uk/atom.xml`,
        ]
      : [`https://caselaw.nationalarchives.gov.uk/atom.xml`];

    let response: Response | null = null;
    let workingUrl = '';

    for (const url of urlsToTry) {
      console.log('Trying Atom feed URL:', url);
      try {
        const resp = await fetch(url, {
          headers: {
            'User-Agent': 'Caselaw-Explorer/1.0 (Educational)',
            'Accept': 'application/atom+xml, application/xml, text/xml',
          },
        });

        console.log('Response Status:', resp.status, 'Content-Type:', resp.headers.get('content-type'));

        if (resp.ok) {
          response = resp;
          workingUrl = url;
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
      console.error('All Atom feed URLs failed');
      return NextResponse.json(
        {
          error: `Failed to fetch Atom feed from any source`,
          results: [],
          total: 0,
        },
        { status: 500 }
      );
    }

    console.log('Using feed from:', workingUrl);

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

        // Extract URI - handle both patterns:
        // Generic feed: /id/uksc/2025/39
        // Court-specific feed: /uksc/2025/39 (no /id/)
        let uri = '';
        const idMatch = linkHref.match(/\/id\/(.+)/);
        if (idMatch) {
          uri = idMatch[1];
        } else {
          // Try without /id/ prefix (court-specific feeds)
          const directMatch = linkHref.match(/nationalarchives\.gov\.uk\/(.+)/);
          uri = directMatch ? directMatch[1] : '';
        }

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
      const beforeFilter = results.length;
      results = results.filter((item: any) => item.court === courtUpper);
      console.log(`Filtered to court ${courtUpper}: ${results.length} results (from ${beforeFilter} total entries)`);

      // If we got 0 results from a court-specific feed, that's unexpected
      if (results.length === 0 && workingUrl.includes(`/${court.toLowerCase()}/atom.xml`)) {
        console.warn(`⚠️  Court-specific feed returned 0 results - this is unexpected`);
      }

      // If we got 0 results from the generic feed, try to provide helpful info
      if (results.length === 0 && workingUrl.includes('/atom.xml') && !workingUrl.includes(`/${court.toLowerCase()}`)) {
        console.warn(`⚠️  No ${courtUpper} cases found in the ${beforeFilter} most recent entries`);
        console.warn(`   This likely means ${courtUpper} hasn't published cases recently`);
        console.warn(`   Consider using a court-specific feed or expanding the search`);
      }
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
