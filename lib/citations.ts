/**
 * UK Court Citation Parser
 * Detects neutral citations like [2023] UKSC 42, [2019] EWCA Civ 12, etc.
 */

export interface ParsedCitation {
  text: string;
  year: string;
  court: string;
  number: string;
  start: number;
  end: number;
  uri?: string;
}

// UK court codes
const COURT_CODES = [
  'UKSC',    // UK Supreme Court
  'UKPC',    // UK Privy Council
  'EWCA',    // England & Wales Court of Appeal
  'EWHC',    // England & Wales High Court
  'EWCOP',   // England & Wales Court of Protection
  'UKUT',    // UK Upper Tribunal
  'UKFTT',   // UK First-tier Tribunal
  'EWFC',    // England & Wales Family Court
];

const EWCA_DIVISIONS = ['Civ', 'Crim'];
const EWHC_DIVISIONS = ['Admin', 'Admlty', 'Ch', 'Comm', 'Fam', 'KB', 'QB', 'Pat', 'TCC'];

/**
 * Build regex pattern for UK neutral citations
 */
function buildCitationPattern(): RegExp {
  const courtPattern = COURT_CODES.join('|');
  const divisionPattern = `(?:\\s+(?:${[...EWCA_DIVISIONS, ...EWHC_DIVISIONS].join('|')}))?`;

  // Pattern: [YYYY] COURT [Division] Number
  return new RegExp(
    `\\[(\\d{4})\\]\\s+(${courtPattern})${divisionPattern}\\s+(\\d+)`,
    'g'
  );
}

/**
 * Find all citations in text
 */
export function findCitations(text: string): ParsedCitation[] {
  const citations: ParsedCitation[] = [];
  const pattern = buildCitationPattern();
  let match;

  while ((match = pattern.exec(text)) !== null) {
    const [fullMatch, year, court] = match;
    const number = match[match.length - 1]; // Last captured group is the number

    citations.push({
      text: fullMatch,
      year,
      court,
      number,
      start: match.index,
      end: match.index + fullMatch.length,
      uri: buildCaseUri(year, court, number),
    });
  }

  return citations;
}

/**
 * Build National Archives URI for a citation
 */
function buildCaseUri(year: string, court: string, number: string): string {
  const courtLower = court.toLowerCase();
  return `https://caselaw.nationalarchives.gov.uk/id/${courtLower}/${year}/${number}`;
}

/**
 * Check if text contains a citation
 */
export function hasCitation(text: string): boolean {
  const pattern = buildCitationPattern();
  return pattern.test(text);
}
