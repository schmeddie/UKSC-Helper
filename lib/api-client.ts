/**
 * National Archives Find Case Law API Client
 * Documentation: https://caselaw.nationalarchives.gov.uk/
 */

import { JudgmentMetadata, JudgmentContent } from './types';
import { parseJudgment } from './parser';

const API_BASE_URL = 'https://caselaw.nationalarchives.gov.uk';

export interface SearchParams {
  court?: string;
  query?: string;
  page?: number;
  order?: 'date' | '-date';
  from?: string;
  to?: string;
}

/**
 * Search for judgments
 */
export async function searchJudgments(params: SearchParams = {}): Promise<{
  results: JudgmentMetadata[];
  total: number;
}> {
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

  return {
    results: (data.results || []).map(mapToMetadata),
    total: data.total || 0,
  };
}

/**
 * Get recent UKSC judgments
 */
export async function getRecentUKSCJudgments(limit: number = 50): Promise<JudgmentMetadata[]> {
  const result = await searchJudgments({
    court: 'uksc',
    order: '-date',
    page: 1,
  });

  return result.results.slice(0, limit);
}

/**
 * Get judgment by URI
 */
export async function getJudgment(uri: string): Promise<JudgmentContent> {
  // Ensure URI is in correct format
  const cleanUri = uri.replace(API_BASE_URL, '').replace(/^\//, '');

  // Fetch metadata
  const metadataUrl = `${API_BASE_URL}/${cleanUri}`;
  const metadataResponse = await fetch(metadataUrl, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!metadataResponse.ok) {
    throw new Error(`Failed to fetch judgment metadata: ${metadataResponse.statusText}`);
  }

  const metadata = await metadataResponse.json();

  // Fetch XML content
  const xmlUrl = `${API_BASE_URL}/${cleanUri}/data.xml`;
  const xmlResponse = await fetch(xmlUrl);

  if (!xmlResponse.ok) {
    throw new Error(`Failed to fetch judgment content: ${xmlResponse.statusText}`);
  }

  const xml = await xmlResponse.text();
  const content = parseJudgment(xml);

  return {
    metadata: mapToMetadata(metadata),
    content,
    xml,
  };
}

/**
 * Get judgment by neutral citation
 */
export async function getJudgmentByCitation(citation: string): Promise<JudgmentContent> {
  // Parse citation to extract parts
  // Example: [2023] UKSC 42
  const match = citation.match(/\[(\d{4})\]\s+(\w+)\s+(\d+)/);

  if (!match) {
    throw new Error(`Invalid citation format: ${citation}`);
  }

  const [, year, court, number] = match;
  const uri = `${court.toLowerCase()}/${year}/${number}`;

  return getJudgment(uri);
}

/**
 * Map API response to JudgmentMetadata
 */
function mapToMetadata(data: any): JudgmentMetadata {
  return {
    uri: data.uri || data.url || '',
    name: data.name || data.title || 'Untitled',
    cite: data.neutral_citation || data.cite || '',
    date: data.date || data.judgment_date || '',
    court: data.court || '',
    neutral_citation: data.neutral_citation,
  };
}
