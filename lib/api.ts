/**
 * National Archives Find Case Law API Client
 * Uses our server-side API route to bypass CORS restrictions
 * API Route: /api/judgment?citation=court/year/number
 */

const API_BASE_URL = 'https://caselaw.nationalarchives.gov.uk';

export interface DebugInfo {
  attemptedUrl: string;
  statusCode: number;
  contentType: string | null;
  rawPreview: string;
  xmlStructure?: any;
  timestamp: string;
}

export interface Judgment {
  title: string;
  date: string;
  content: string;
  court: string;
  year: string;
  number: string;
  cite: string;
  debug?: DebugInfo;
}

/**
 * Fetch judgment by court, year, and number
 * Example: fetchJudgment('uksc', '2019', '41')
 * Fetches via our server-side proxy: /api/judgment?citation=uksc/2019/41
 * This bypasses CORS restrictions by making the request from the server
 */
export async function fetchJudgment(
  court: string,
  year: string,
  number: string
): Promise<Judgment> {
  const citation = `${court.toLowerCase()}/${year}/${number}`;
  const url = `/api/judgment?citation=${encodeURIComponent(citation)}`;

  try {
    const response = await fetch(url);

    const data = await response.json();

    if (!response.ok) {
      // Create an error object that includes debug info
      const error: any = new Error(data.error || `Failed to fetch judgment: ${response.statusText}`);
      error.debug = data.debug;
      throw error;
    }

    const judgment: Judgment = data;
    return judgment;
  } catch (error) {
    console.error('Error fetching judgment:', error);
    throw error;
  }
}

/**
 * Fetch judgment by URI path (e.g., 'uksc/2019/41')
 */
export async function fetchJudgmentByUri(uri: string): Promise<Judgment> {
  // Remove leading/trailing slashes and parse the URI
  const cleanUri = uri.replace(/^\/+|\/+$/g, '');
  const parts = cleanUri.split('/');

  if (parts.length !== 3) {
    throw new Error(`Invalid URI format: ${uri}. Expected format: court/year/number`);
  }

  const [court, year, number] = parts;
  return fetchJudgment(court, year, number);
}

/**
 * Search for judgments using the JSON API
 */
export interface SearchParams {
  court?: string;
  query?: string;
  page?: number;
  order?: 'date' | '-date';
  from?: string;
  to?: string;
}

export interface JudgmentMetadata {
  uri: string;
  name: string;
  cite: string;
  date: string;
  court: string;
}

export async function searchJudgments(
  params: SearchParams = {}
): Promise<{ results: JudgmentMetadata[]; total: number }> {
  const searchParams = new URLSearchParams();

  if (params.court) searchParams.set('court', params.court);
  if (params.query) searchParams.set('query', params.query);
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.order) searchParams.set('order', params.order);
  if (params.from) searchParams.set('from', params.from);
  if (params.to) searchParams.set('to', params.to);

  const url = `${API_BASE_URL}/structured_search?${searchParams.toString()}`;

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Search failed: ${response.statusText}`);
  }

  const data = await response.json();

  const results = (data.results || []).map((item: any) => ({
    uri: item.uri || '',
    name: item.name || 'Untitled',
    cite: item.neutral_citation || '',
    date: item.date || '',
    court: item.court || '',
  }));

  return {
    results,
    total: data.total || 0,
  };
}

/**
 * Get recent UKSC judgments
 */
export async function getRecentUKSCJudgments(
  limit: number = 50
): Promise<JudgmentMetadata[]> {
  const result = await searchJudgments({
    court: 'uksc',
    order: '-date',
    page: 1,
  });

  return result.results.slice(0, limit);
}
