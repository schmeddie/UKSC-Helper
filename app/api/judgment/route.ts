import { NextRequest, NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';

interface ContentBlock {
  type: 'h2' | 'h3' | 'p' | 'quote';
  text: string;
}

interface StructuredContent {
  meta: {
    case_name: string;
    neutral_citation: string;
    judgment_date: string;
  };
  content: ContentBlock[];
}

interface JudgmentResponse {
  title: string;
  date: string;
  content: string;
  structured?: StructuredContent;
  court: string;
  year: string;
  number: string;
  cite: string;
  judges?: string[];
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
 * Extract raw text from XML body (no structure, just plain text)
 */
function extractRawText(body: any): string {
  const textParts: string[] = [];

  function traverse(node: any): void {
    if (!node || typeof node !== 'object') return;

    // If this is a text node, add it
    if (node['#text'] && typeof node['#text'] === 'string') {
      const text = node['#text'].trim();
      if (text) {
        textParts.push(text);
      }
    }

    // Recursively traverse all child nodes
    Object.keys(node).forEach((key) => {
      if (key !== '#text' && !key.startsWith('@_')) {
        const value = node[key];
        if (Array.isArray(value)) {
          value.forEach((item) => traverse(item));
        } else if (typeof value === 'object') {
          traverse(value);
        }
      }
    });
  }

  traverse(body);
  return textParts.join(' ');
}

/**
 * Split text into chunks at natural boundaries (paragraphs)
 * Target chunk size is ~30,000 chars to stay well under LLM limits
 */
function chunkText(text: string, maxChunkSize: number = 30000): string[] {
  if (text.length <= maxChunkSize) {
    return [text];
  }

  const chunks: string[] = [];
  const paragraphs = text.split(/\n\n+/);
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    const testChunk = currentChunk + (currentChunk ? '\n\n' : '') + paragraph;

    if (testChunk.length > maxChunkSize && currentChunk) {
      // Current chunk is full, start a new one
      chunks.push(currentChunk);
      currentChunk = paragraph;
    } else {
      currentChunk = testChunk;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

/**
 * Process a single chunk with streaming support
 */
async function processChunkWithStreaming(
  chunk: string,
  chunkIndex: number,
  totalChunks: number,
  apiKey: string,
  caseName: string,
  citation: string,
  date: string
): Promise<ContentBlock[]> {
  const systemPrompt = `You are a sophisticated Legal Document Formatter for UK Supreme Court judgments. Your job is to transform raw, messy judgment text into a beautifully structured, hierarchical format.

STRUCTURAL IDENTIFICATION:
1. Identify and classify these section types in order of hierarchy:
   - "h2": Major structural sections (e.g., "Introduction", "Background", "The Appeal", "Discussion", "Conclusion", numbered parts like "I. Introduction", "II. The Facts")
   - "h2": Judge names when they introduce their opinion (e.g., "LORD REED:", "LADY HALE:")
   - "h3": Subsections and topic headers (e.g., "The legislative framework", "The first ground of appeal", "Analysis")
   - "p": Regular paragraphs of judgment text
   - "quote": Quoted legislation, case law excerpts, or indented legal text

2. FORMATTING RULES:
   - Preserve ALL text - no summarization
   - Remove table of contents, page numbers, running headers/footers
   - Clean up judge names: "Lord Reed:" → "LORD REED" (h2)
   - Identify structural divisions: "Introduction", "Part I", "The Background", etc. → h2
   - Subsection headers like "The legislative framework" → h3
   - Regular narrative paragraphs → p
   - Indented quotes from statutes or cases → quote

3. RECOGNITION PATTERNS:
   - Lines in ALL CAPS or Title Case followed by content = likely h2
   - Lines ending with colons that introduce sections = likely h3
   - Text introduced by "Lord/Lady [Name]:" = h2 (judgment author)
   - Numbered sections (I., II., 1., 2., etc.) at start of line = h2 or h3
   - Indented or quoted statutory text = quote

4. OUTPUT FORMAT:
   This is chunk ${chunkIndex + 1} of ${totalChunks}.
   Return ONLY a JSON array: [{ "type": "h2"|"h3"|"p"|"quote", "text": "cleaned text" }, ...]

Example:
[
  { "type": "h2", "text": "LORD REED" },
  { "type": "h2", "text": "Introduction" },
  { "type": "p", "text": "This appeal concerns the interpretation of..." },
  { "type": "h3", "text": "The legislative framework" },
  { "type": "p", "text": "Section 1 of the Act provides..." }
]`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://uksc-helper.vercel.app',
        'X-Title': 'UKSC Judgment Reader',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: chunk },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 16000, // Ensure complete response
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Chunk ${chunkIndex + 1} API error:`, response.status, errorText);
      return [];
    }

    const data = await response.json();
    const structuredText = data.choices?.[0]?.message?.content;

    if (!structuredText) {
      console.error(`Chunk ${chunkIndex + 1}: No content in response`);
      return [];
    }

    // Parse the JSON
    let parsed: any;
    try {
      parsed = JSON.parse(structuredText);
    } catch (parseError) {
      console.error(`Chunk ${chunkIndex + 1}: JSON parse error:`, parseError);
      console.error('Response preview:', structuredText.substring(0, 500));
      return [];
    }

    // Handle both array format and object format
    let blocks: ContentBlock[] = [];
    if (Array.isArray(parsed)) {
      blocks = parsed;
    } else if (parsed.content && Array.isArray(parsed.content)) {
      blocks = parsed.content;
    } else {
      console.error(`Chunk ${chunkIndex + 1}: Invalid format`);
      return [];
    }

    console.log(`✅ Chunk ${chunkIndex + 1}/${totalChunks}: ${blocks.length} blocks`);
    return blocks;
  } catch (error) {
    console.error(`Chunk ${chunkIndex + 1} error:`, error);
    return [];
  }
}

/**
 * Call OpenRouter to structure the raw judgment text with chunking and streaming
 */
async function structureJudgmentWithLLM(
  rawText: string,
  caseName: string,
  citation: string,
  date: string
): Promise<StructuredContent | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    console.warn('OPENROUTER_API_KEY not set, skipping LLM structuring');
    return null;
  }

  try {
    console.log('Calling OpenRouter to structure judgment...');
    console.log('Text length:', rawText.length, 'characters');

    // Split into chunks if text is too long
    const chunks = chunkText(rawText, 30000);
    console.log(`Split into ${chunks.length} chunk(s)`);

    // Process all chunks in parallel for speed
    const chunkPromises = chunks.map((chunk, index) =>
      processChunkWithStreaming(chunk, index, chunks.length, apiKey, caseName, citation, date)
    );

    const chunkResults = await Promise.all(chunkPromises);

    // Merge all blocks from all chunks
    const allBlocks: ContentBlock[] = chunkResults.flat();

    if (allBlocks.length === 0) {
      console.error('No blocks generated from any chunk');
      return null;
    }

    console.log('✅ Successfully structured judgment');
    console.log('Total blocks created:', allBlocks.length);

    const structured: StructuredContent = {
      meta: {
        case_name: caseName,
        neutral_citation: citation,
        judgment_date: date,
      },
      content: allBlocks,
    };

    return structured;
  } catch (error) {
    console.error('Error structuring judgment with LLM:', error);
    return null;
  }
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

    // Extract judges from metadata
    let judges: string[] = [];
    try {
      const references = xmlDoc?.akomaNtoso?.judgment?.meta?.references;

      if (references) {
        // Look for TLCPerson tags
        const tlcPersons = references.TLCPerson;

        if (tlcPersons) {
          const persons = Array.isArray(tlcPersons) ? tlcPersons : [tlcPersons];

          // Extract all persons with showAs attribute (these are typically judges)
          // Skip first two names as they are always claimant and defendant
          judges = persons
            .filter((person: any) => person['@_showAs'])
            .map((person: any) => person['@_showAs'])
            .slice(2) // Skip first two entries (claimant and defendant)
            .filter((name: string) => {
              // Additional filtering for non-judge roles
              const lowerName = name.toLowerCase();
              return !lowerName.includes('appellant') &&
                     !lowerName.includes('respondent') &&
                     !lowerName.includes('claimant') &&
                     !lowerName.includes('defendant');
            });

          console.log('Extracted judges from metadata:', judges);
        }
      }
    } catch (e) {
      console.error('Error extracting judges from metadata:', e);
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

    // Fallback: Extract judges from body text if metadata didn't have them
    if (judges.length === 0 && content) {
      try {
        // Look at the first 500 characters for "Before:" or "Justices:" pattern
        const header = content.substring(0, 500);
        const judgePattern = /(?:Before|Justices):\s*([\s\S]*?)(?=\n\n|Judgment|JUDGMENT)/i;
        const match = header.match(judgePattern);

        if (match && match[1]) {
          // Split by common delimiters and clean up
          const judgeText = match[1];
          const judgeNames = judgeText
            .split(/\n|,|and/)
            .map((name) => name.trim())
            .filter((name) => name.length > 0 && /^[A-Z]/.test(name))
            .filter((name) => !name.toLowerCase().includes('judgment'));

          if (judgeNames.length > 0) {
            judges = judgeNames;
            console.log('Extracted judges from body text (fallback):', judges);
          }
        }
      } catch (e) {
        console.error('Error in fallback judge extraction:', e);
      }
    }

    // Construct neutral citation
    const cite = `[${year}] ${court.toUpperCase()} ${number}`;

    // Extract raw text and structure with LLM
    let structured: StructuredContent | null = null;
    try {
      const body = xmlDoc?.akomaNtoso?.judgment?.judgmentBody || xmlDoc?.akomaNtoso?.judgment?.mainBody;
      if (body) {
        const rawText = extractRawText(body);
        console.log('Extracted raw text length:', rawText.length, 'characters');

        // Call LLM to structure the content
        structured = await structureJudgmentWithLLM(rawText, title, cite, date);
      }
    } catch (e) {
      console.error('Error in LLM structuring:', e);
    }

    const result: JudgmentResponse = {
      title,
      date,
      content: content || 'No content available',
      structured: structured || undefined,
      court: court.toUpperCase(),
      year,
      number,
      cite,
      judges: judges.length > 0 ? judges : undefined,
      debug: debugInfo as DebugInfo,
    };

    console.log('=== SUCCESS ===');
    console.log('Returning judgment:', cite);
    console.log('Structured blocks:', structured?.content?.length || 0);
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
