import { NextRequest, NextResponse } from 'next/server';

/**
 * Server-side proxy for searching UK judgments
 * Bypasses CORS by making the request from the server
 * GET /api/search?court=uksc&order=-date&page=1
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    console.log('=== SEARCH API REQUEST ===');
    console.log('Search params:', Object.fromEntries(searchParams.entries()));

    // Build query string for National Archives API
    const apiParams = new URLSearchParams();

    if (searchParams.get('court')) apiParams.set('court', searchParams.get('court')!);
    if (searchParams.get('query')) apiParams.set('query', searchParams.get('query')!);
    if (searchParams.get('page')) apiParams.set('page', searchParams.get('page')!);
    if (searchParams.get('order')) apiParams.set('order', searchParams.get('order')!);
    if (searchParams.get('from')) apiParams.set('from', searchParams.get('from')!);
    if (searchParams.get('to')) apiParams.set('to', searchParams.get('to')!);

    const url = `https://caselaw.nationalarchives.gov.uk/structured_search?${apiParams.toString()}`;
    console.log('Fetching URL:', url);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Caselaw-Explorer/1.0 (Educational)',
        'Accept': 'application/json',
      },
    });

    console.log('Response Status:', response.status);
    console.log('Content-Type:', response.headers.get('content-type'));

    if (!response.ok) {
      const text = await response.text();
      console.error('Search API Error:', response.status, text.substring(0, 200));

      return NextResponse.json(
        {
          error: `Search failed: ${response.status} ${response.statusText}`,
          debug: {
            attemptedUrl: url,
            statusCode: response.status,
            rawPreview: text.substring(0, 500),
          }
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Results found:', data.results?.length || 0);
    console.log('Total:', data.total || 0);

    const results = (data.results || []).map((item: any) => ({
      uri: item.uri || '',
      name: item.name || 'Untitled',
      cite: item.neutral_citation || '',
      date: item.date || '',
      court: item.court || '',
    }));

    console.log('=== SEARCH SUCCESS ===');
    console.log('Returning', results.length, 'results\n');

    return NextResponse.json({
      results,
      total: data.total || 0,
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
