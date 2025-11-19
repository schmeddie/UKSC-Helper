import { NextRequest, NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';
import { getCachedJudgment, setCachedJudgment } from '@/lib/cache';

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
 * Split text into chunks at paragraph boundaries
 * If a paragraph is too large, split it by sentences or characters
 */
function chunkText(text: string, maxChunkSize: number = 15000): string[] {
  if (text.length <= maxChunkSize) {
    return [text];
  }

  const chunks: string[] = [];
  const paragraphs = text.split(/\n\n+/);
  let currentChunk = '';

  for (let paragraph of paragraphs) {
    // If single paragraph is too large, split it by sentences
    if (paragraph.length > maxChunkSize) {
      console.log(`  ⚠️  Large paragraph detected (${paragraph.length} chars), splitting by sentences`);

      // Push current chunk first
      if (currentChunk) {
        chunks.push(currentChunk);
        currentChunk = '';
      }

      // Split large paragraph by sentences
      const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
      for (const sentence of sentences) {
        if (currentChunk.length + sentence.length > maxChunkSize && currentChunk) {
          chunks.push(currentChunk);
          currentChunk = sentence;
        } else {
          currentChunk += sentence;
        }
      }
      continue;
    }

    const testChunk = currentChunk + (currentChunk ? '\n\n' : '') + paragraph;

    if (testChunk.length > maxChunkSize && currentChunk) {
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
 * Format a single chunk with AI
 */
async function formatChunk(chunk: string, chunkIndex: number, totalChunks: number, apiKey: string): Promise<ContentBlock[]> {
  // Only include TOC removal instructions for first chunk
  const tocInstructions = chunkIndex === 0
    ? `CRITICAL - REMOVE FROM START (first chunk only):
1. Table of contents (lists of section titles with no content)
2. Page numbers, headers, footers at top
3. Metadata blocks (case numbers, dates at top)
4. Any standalone lists of headings before main text

EXAMPLE OF WHAT TO REMOVE:
BAD: "Introduction\\nBackground\\nStatutory provisions\\n\\n"
GOOD: Start from "1. This appeal concerns..."

`
    : '';

  const systemPrompt = `You are a Legal Document Formatter for UK Supreme Court judgments.

YOUR TASK: Transform raw legal text into clean, structured JSON blocks.

${tocInstructions}IDENTIFY THESE BLOCK TYPES:
- h2: Major section headers (LORD REED, INTRODUCTION, JUDGMENT, Part I)
- h3: Subsection headers (The legislative framework, Analysis)
- p: Regular paragraph text
- quote: Indented quotes from legislation or cases

FORMATTING RULES:
1. Convert all judge names to uppercase: "Lord Reed" → "LORD REED"
2. Major sections to uppercase: "Introduction" → "INTRODUCTION"
3. Preserve ALL paragraph text - no summarization
4. Combine sentence fragments into complete paragraphs

OUTPUT: JSON array only, no wrapper object
[{"type":"h2","text":"INTRODUCTION"},{"type":"p","text":"This appeal concerns..."}]`;

  console.log(`  🤖 Chunk ${chunkIndex + 1}/${totalChunks}: Calling AI (${chunk.length} chars)...`);

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
        { role: 'user', content: chunk },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 8000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('No content in AI response');
  }

  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    console.error(`  ❌ JSON parse error. Response preview:`, content.substring(0, 200));
    throw e;
  }

  // Handle different response formats
  let blocks: ContentBlock[] = [];
  if (Array.isArray(parsed)) {
    blocks = parsed;
  } else if (parsed.content && Array.isArray(parsed.content)) {
    blocks = parsed.content;
  } else if (parsed.blocks && Array.isArray(parsed.blocks)) {
    blocks = parsed.blocks;
  }

  console.log(`  ✅ Chunk ${chunkIndex + 1}: Received ${blocks.length} blocks`);

  return blocks;
}

/**
 * Format entire judgment with AI (handles chunking internally)
 */
async function formatWithAI(text: string, apiKey: string): Promise<ContentBlock[]> {
  console.log(`🤖 Formatting ${text.length} chars...`);

  // Split into chunks if needed
  const chunks = chunkText(text, 15000);
  console.log(`📦 Split into ${chunks.length} chunk(s)`);

  // Process all chunks
  const allBlocks: ContentBlock[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunkBlocks = await formatChunk(chunks[i], i, chunks.length, apiKey);
    allBlocks.push(...chunkBlocks);
  }

  // Log type distribution
  const typeCounts = allBlocks.reduce((acc, b) => {
    acc[b.type] = (acc[b.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  console.log(`✅ Total: ${allBlocks.length} blocks`, typeCounts);

  return allBlocks;
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
    // Check cache first
    const cachedBlocks = getCachedJudgment(citation);
    if (cachedBlocks) {
      console.log(`✅ Returning cached judgment (${cachedBlocks.length} blocks)\n`);
      return NextResponse.json({ blocks: cachedBlocks, cached: true });
    }

    console.log('❌ Cache MISS, fetching and formatting...');

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

    // Save to cache for future requests
    setCachedJudgment(citation, blocks);

    console.log(`✅ Formatted successfully, returning ${blocks.length} blocks to client\n`);

    const response = { blocks, cached: false };
    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ Format error:', error);
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Returning error response: ${errorMsg}`);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
