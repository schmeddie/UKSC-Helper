import { NextRequest } from 'next/server';
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
 * Split text into chunks at paragraph boundaries
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
 * Call OpenRouter to structure a chunk (non-streaming for reliability)
 */
async function structureChunk(
  chunk: string,
  chunkIndex: number,
  totalChunks: number,
  apiKey: string
): Promise<ContentBlock[]> {
  const systemPrompt = `You are a Legal Document Formatter for UK Supreme Court judgments. Transform raw text into structured JSON.

IDENTIFY THESE TYPES:
- "h2": Major sections (Introduction, Background, LORD REED, Part I, II, etc.)
- "h3": Subsections (The legislative framework, Analysis, etc.)
- "p": Regular paragraphs
- "quote": Quoted legislation or case excerpts

RULES:
1. Preserve ALL text - no summarization
2. Remove table of contents, page numbers, headers/footers
3. Clean judge names: "Lord Reed:" → "LORD REED" (h2)
4. Identify sections: "Introduction", "Part I" → h2
5. Subsection headers → h3

OUTPUT: JSON array only
[{ "type": "h2"|"h3"|"p"|"quote", "text": "..." }, ...]`;

  console.log(`[Chunk ${chunkIndex + 1}/${totalChunks}] Calling OpenRouter (${chunk.length} chars)...`);

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
        max_tokens: 16000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Chunk ${chunkIndex + 1}] API error ${response.status}: ${errorText}`);
      return [];
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error(`[Chunk ${chunkIndex + 1}] No content in response`);
      return [];
    }

    // Parse the JSON response
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      console.error(`[Chunk ${chunkIndex + 1}] JSON parse error:`, parseError);
      console.error('Response preview:', content.substring(0, 500));
      return [];
    }

    // Handle both array and object formats
    let blocks: ContentBlock[] = [];
    if (Array.isArray(parsed)) {
      blocks = parsed;
    } else if (parsed.content && Array.isArray(parsed.content)) {
      blocks = parsed.content;
    } else if (parsed.blocks && Array.isArray(parsed.blocks)) {
      blocks = parsed.blocks;
    }

    console.log(`[Chunk ${chunkIndex + 1}] ✅ Received ${blocks.length} blocks`);
    return blocks;
  } catch (error) {
    console.error(`[Chunk ${chunkIndex + 1}] Error:`, error);
    return [];
  }
}

/**
 * Streaming endpoint for judgment structuring
 * GET /api/judgment/stream?citation=uksc/2019/41
 */
export async function GET(request: NextRequest) {
  const citation = request.nextUrl.searchParams.get('citation');

  if (!citation) {
    return new Response('Citation required', { status: 400 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return new Response('OPENROUTER_API_KEY not configured', { status: 500 });
  }

  console.log(`\n=== STREAMING REQUEST: ${citation} ===`);

  // Create a ReadableStream for streaming response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Parse citation
        const parts = citation.split('/');
        if (parts.length !== 3) {
          controller.enqueue(encoder.encode('data: {"type":"error","message":"Invalid citation format"}\n\n'));
          controller.close();
          return;
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
            console.log(`Trying: ${url}`);
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
              console.log('✅ XML fetched and parsed');
              break;
            }
          } catch (error) {
            console.error(`Failed to fetch ${url}:`, error);
            continue;
          }
        }

        if (!xmlDoc) {
          controller.enqueue(encoder.encode('data: {"type":"error","message":"Failed to fetch judgment XML"}\n\n'));
          controller.close();
          return;
        }

        // Extract raw text
        const body = xmlDoc?.akomaNtoso?.judgment?.judgmentBody || xmlDoc?.akomaNtoso?.judgment?.mainBody;
        if (!body) {
          controller.enqueue(encoder.encode('data: {"type":"error","message":"No judgment body found in XML"}\n\n'));
          controller.close();
          return;
        }

        const rawText = extractRawText(body);
        console.log(`Extracted ${rawText.length} characters of raw text`);

        const chunks = chunkText(rawText, 30000);
        console.log(`Split into ${chunks.length} chunks`);

        // Send metadata
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'meta', totalChunks: chunks.length })}\n\n`));

        // Process each chunk sequentially and stream blocks as they come
        for (let i = 0; i < chunks.length; i++) {
          console.log(`\n--- Processing chunk ${i + 1}/${chunks.length} ---`);
          const blocks = await structureChunk(chunks[i], i, chunks.length, apiKey);

          // Stream each block to client
          for (const block of blocks) {
            if (block.type && block.text) {
              const eventData = JSON.stringify({ type: 'block', block });
              controller.enqueue(encoder.encode(`data: ${eventData}\n\n`));
              console.log(`Sent block: ${block.type} - ${block.text.substring(0, 50)}...`);
            }
          }

          // Send chunk completion
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'chunk_complete', index: i + 1, total: chunks.length })}\n\n`));
          console.log(`Chunk ${i + 1}/${chunks.length} complete`);
        }

        // Send completion
        controller.enqueue(encoder.encode('data: {"type":"complete"}\n\n'));
        console.log('=== STREAMING COMPLETE ===\n');
        controller.close();
      } catch (error) {
        console.error('Streaming error:', error);
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: errorMsg })}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
