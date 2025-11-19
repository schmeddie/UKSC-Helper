import { NextRequest, NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';

interface ContentBlock {
  type: 'h2' | 'h3' | 'p' | 'quote';
  text: string;
}

/**
 * Extract raw text from XML body
 */
function extractRawText(body: any): string {
  const textParts: string[] = [];

  function traverse(node: any): void {
    if (!node || typeof node !== 'object') return;

    if (node['#text'] && typeof node['#text'] === 'string') {
      const text = node['#text'].trim();
      if (text) {
        textParts.push(text);
      }
    }

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
 * Format judgment text with AI
 * Simple synchronous call - text in, blocks out
 */
async function formatWithAI(text: string, apiKey: string): Promise<ContentBlock[]> {
  const systemPrompt = `You are a Legal Document Formatter for UK Supreme Court judgments.

YOUR TASK: Transform raw legal text into clean, structured JSON blocks.

CRITICAL - REMOVE COMPLETELY (do NOT include in output):
1. Table of contents at the start (lists of section titles with no content)
2. Page numbers, headers, footers
3. Metadata blocks (case numbers, dates at top)
4. Any standalone lists of headings before the main text starts

EXAMPLE:
BAD (remove this): "Introduction\\nBackground\\nStatutory provisions\\nConclusion\\n\\n"
GOOD (start here): "1. This appeal concerns the interpretation..."

IDENTIFY THESE BLOCK TYPES:
- h2: Major section headers (LORD REED, INTRODUCTION, JUDGMENT, Part I)
- h3: Subsection headers (The legislative framework, Analysis)
- p: Regular paragraph text
- quote: Indented quotes from legislation or cases

FORMATTING RULES:
1. Convert all judge names to uppercase: "Lord Reed" → "LORD REED"
2. Major sections to uppercase: "Introduction" → "INTRODUCTION"
3. Preserve ALL paragraph text - no summarization
4. Combine sentence fragments into complete paragraphs
5. Remove duplicate text

OUTPUT: JSON array only
[{"type":"h2","text":"INTRODUCTION"},{"type":"p","text":"This appeal concerns..."}]`;

  console.log(`🤖 Calling AI to format ${text.length} chars...`);

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.0-flash-001',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 16000,
    }),
  });

  if (!response.ok) {
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('No content in AI response');
  }

  const parsed = JSON.parse(content);

  // Handle different response formats
  let blocks: ContentBlock[] = [];
  if (Array.isArray(parsed)) {
    blocks = parsed;
  } else if (parsed.content && Array.isArray(parsed.content)) {
    blocks = parsed.content;
  } else if (parsed.blocks && Array.isArray(parsed.blocks)) {
    blocks = parsed.blocks;
  }

  console.log(`✅ AI returned ${blocks.length} blocks`);

  // Log type distribution
  const typeCounts = blocks.reduce((acc, b) => {
    acc[b.type] = (acc[b.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  console.log('Block types:', typeCounts);

  return blocks;
}

/**
 * Simple endpoint: GET judgment → format with AI → return JSON
 * GET /api/judgment/stream?citation=uksc/2019/41
 */
export async function GET(request: NextRequest) {
  const citation = request.nextUrl.searchParams.get('citation');

  if (!citation) {
    return NextResponse.json({ error: 'Citation required' }, { status: 400 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENROUTER_API_KEY not configured' }, { status: 500 });
  }

  console.log(`\n📋 Format request: ${citation}`);

  try {
    // Parse citation
    const parts = citation.split('/');
    if (parts.length !== 3) {
      return NextResponse.json({ error: 'Invalid citation format' }, { status: 400 });
    }

    const [court, year, number] = parts;

    // Fetch XML
    const urlsToTry = [
      `https://caselaw.nationalarchives.gov.uk/${court}/${year}/${number}/data.xml`,
      `https://caselaw.nationalarchives.gov.uk/id/${court}/${year}/${number}/data.xml`,
    ];

    let xmlDoc: any = null;
    for (const url of urlsToTry) {
      try {
        console.log(`Fetching: ${url}`);
        const resp = await fetch(url, {
          headers: {
            'User-Agent': 'Caselaw-Explorer/1.0 (Educational)',
            'Accept': 'application/xml, text/xml, */*',
          },
        });

        if (resp.ok) {
          const rawText = await resp.text();
          const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: '@_',
            textNodeName: '#text',
            ignoreDeclaration: true,
            trimValues: true,
          });
          xmlDoc = parser.parse(rawText);
          console.log('✅ XML fetched');
          break;
        }
      } catch (error) {
        continue;
      }
    }

    if (!xmlDoc) {
      return NextResponse.json({ error: 'Failed to fetch judgment XML' }, { status: 404 });
    }

    // Extract raw text
    const body = xmlDoc?.akomaNtoso?.judgment?.judgmentBody || xmlDoc?.akomaNtoso?.judgment?.mainBody;
    if (!body) {
      return NextResponse.json({ error: 'No judgment body found in XML' }, { status: 404 });
    }

    const rawText = extractRawText(body);
    console.log(`Extracted ${rawText.length} chars`);

    // Format with AI
    const blocks = await formatWithAI(rawText, apiKey);

    console.log(`✅ Formatted successfully\n`);

    return NextResponse.json({ blocks });
  } catch (error) {
    console.error('❌ Format error:', error);
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
