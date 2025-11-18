/**
 * National Archives Find Case Law API Client
 * Uses the XML endpoint to fetch Akoma Ntoso formatted judgments
 * Base URL: https://caselaw.nationalarchives.gov.uk/xml
 */

const XML_BASE_URL = 'https://caselaw.nationalarchives.gov.uk/xml';
const API_BASE_URL = 'https://caselaw.nationalarchives.gov.uk';

export interface Judgment {
  title: string;
  date: string;
  content: string;
  court: string;
  year: string;
  number: string;
  cite: string;
}

/**
 * Parse Akoma Ntoso XML to extract judgment data
 * Extracts: <FRBRname>, <FRBRdate>, and <p> tags
 */
export function parseJudgmentXML(xmlString: string): Judgment {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

  // Check for parsing errors
  const parserError = xmlDoc.querySelector('parsererror');
  if (parserError) {
    throw new Error('Failed to parse XML: ' + parserError.textContent);
  }

  // Extract case title from <FRBRname>
  const nameElement = xmlDoc.querySelector('FRBRname');
  const title = nameElement?.getAttribute('value') || 'Untitled Judgment';

  // Extract judgment date from <FRBRdate>
  const dateElement = xmlDoc.querySelector('FRBRdate[name="judgment"]');
  const date = dateElement?.getAttribute('date') || '';

  // Extract court and citation info from <FRBRWork>
  const workElement = xmlDoc.querySelector('FRBRWork FRBRthis');
  const workUri = workElement?.getAttribute('value') || '';

  // Parse URI like /uksc/2019/41 to extract court, year, number
  const uriMatch = workUri.match(/\/([a-z]+)\/(\d{4})\/(\d+)/i);
  const court = uriMatch?.[1]?.toUpperCase() || '';
  const year = uriMatch?.[2] || '';
  const number = uriMatch?.[3] || '';

  // Construct neutral citation
  const cite = court && year && number ? `[${year}] ${court} ${number}` : '';

  // Extract content from all <p> tags in the judgment body
  const paragraphs = xmlDoc.querySelectorAll('judgmentBody p, mainBody p');
  const contentParts: string[] = [];

  paragraphs.forEach((p) => {
    const text = p.textContent?.trim();
    if (text) {
      contentParts.push(text);
    }
  });

  // If no paragraphs found, try to extract any text content
  if (contentParts.length === 0) {
    const body = xmlDoc.querySelector('judgmentBody, mainBody');
    if (body) {
      const text = body.textContent?.trim();
      if (text) {
        // Split into paragraphs on double line breaks
        contentParts.push(...text.split(/\n\n+/).filter(Boolean));
      }
    }
  }

  const content = contentParts.join('\n\n');

  return {
    title,
    date,
    content: content || 'No content available',
    court,
    year,
    number,
    cite,
  };
}

/**
 * Fetch judgment by court, year, and number
 * Example: fetchJudgment('uksc', '2019', '41')
 * Fetches from: https://caselaw.nationalarchives.gov.uk/xml/uksc/2019/41/data.xml
 */
export async function fetchJudgment(
  court: string,
  year: string,
  number: string
): Promise<Judgment> {
  const courtLower = court.toLowerCase();
  const url = `${XML_BASE_URL}/${courtLower}/${year}/${number}/data.xml`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch judgment: ${response.status} ${response.statusText}`
      );
    }

    const xmlString = await response.text();
    const judgment = parseJudgmentXML(xmlString);

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
