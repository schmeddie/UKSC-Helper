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
 * Process a single chunk and return blocks
 */
async function processChunk(
  chunk: string,
  chunkIndex: number,
  totalChunks: number,
  apiKey: string
): Promise<ContentBlock[]> {
  const systemPrompt = `You are a sophisticated Legal Editor. Your task is to take a raw UK Supreme Court judgment chunk and reformat it into a clean, structured JSON stream for a web reader.

CRITICAL RULES:
1. NO SUMMARIZATION. You must retain the FULL text of this chunk.
2. Structure the content into a linear list of "blocks".
3. Detect and assign the correct type to each block:
   - "h2": For Judge names (e.g., "LORD REED:") or major section titles.
   - "h3": For sub-headers (e.g., "The Background").
   - "p": For standard paragraphs.
   - "quote": For blockquotes, legislation citations, or excerpts.
4. CLEANUP:
   - Remove "Table of Contents" lists.
   - Remove page numbers or weird XML artifacts.
   - Fix formatting for Judge names (e.g., turn "Lord Reed:" into a clean "h2").
5. This is chunk ${chunkIndex + 1} of ${totalChunks}. Only return the "content" array, not the full structure.
6. Output strictly as a JSON array: [{ "type": "h2"|"h3"|"p"|"quote", "text": "string" }, ...]`;

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
      console.error(`Chunk ${chunkIndex + 1} API error:`, response.status);
      return [];
    }

    const data = await response.json();
    const structuredText = data.choices?.[0]?.message?.content;

    if (!structuredText) {
      return [];
    }

    const parsed = JSON.parse(structuredText);
    let blocks: ContentBlock[] = [];

    if (Array.isArray(parsed)) {
      blocks = parsed;
    } else if (parsed.content && Array.isArray(parsed.content)) {
      blocks = parsed.content;
    }

    return blocks;
  } catch (error) {
    console.error(`Chunk ${chunkIndex + 1} error:`, error);
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
    return new Response('API key not configured', { status: 500 });
  }

  // Create a ReadableStream for streaming response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Parse citation
        const parts = citation.split('/');
        if (parts.length !== 3) {
          controller.enqueue(encoder.encode('data: {"error": "Invalid citation format"}\n\n'));
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
              break;
            }
          } catch (error) {
            continue;
          }
        }

        if (!xmlDoc) {
          controller.enqueue(encoder.encode('data: {"error": "Failed to fetch judgment"}\n\n'));
          controller.close();
          return;
        }

        // Extract raw text
        const body = xmlDoc?.akomaNtoso?.judgment?.judgmentBody || xmlDoc?.akomaNtoso?.judgment?.mainBody;
        if (!body) {
          controller.enqueue(encoder.encode('data: {"error": "No judgment body found"}\n\n'));
          controller.close();
          return;
        }

        const rawText = extractRawText(body);
        const chunks = chunkText(rawText, 30000);

        // Send metadata first
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'meta', totalChunks: chunks.length })}\n\n`));

        // Process chunks sequentially and stream results
        for (let i = 0; i < chunks.length; i++) {
          const blocks = await processChunk(chunks[i], i, chunks.length, apiKey);

          // Stream each block as it's processed
          for (const block of blocks) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'block', block })}\n\n`));
          }

          // Send chunk completion event
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'chunk_complete', index: i + 1, total: chunks.length })}\n\n`));
        }

        // Send completion event
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'complete' })}\n\n`));
        controller.close();
      } catch (error) {
        console.error('Streaming error:', error);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: error instanceof Error ? error.message : 'Unknown error' })}\n\n`));
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
