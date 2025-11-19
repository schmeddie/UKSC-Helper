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
 * Process a single chunk with streaming and send blocks as they're generated
 */
async function processChunkStreaming(
  chunk: string,
  chunkIndex: number,
  totalChunks: number,
  apiKey: string,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder
): Promise<void> {
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

  console.log(`Processing chunk ${chunkIndex + 1}/${totalChunks}, length: ${chunk.length} chars`);

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
        stream: true, // Enable streaming
      }),
    });

    if (!response.ok) {
      console.error(`Chunk ${chunkIndex + 1} API error:`, response.status);
      return;
    }

    if (!response.body) {
      console.error(`Chunk ${chunkIndex + 1}: No response body`);
      return;
    }

    // Read the streaming response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let accumulatedJson = '';
    let sentBlockCount = 0; // Track how many blocks we've already sent

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;

            if (content) {
              accumulatedJson += content;

              // Try to parse as a complete JSON array or object
              try {
                let parsedContent: any;
                const trimmed = accumulatedJson.trim();

                // Try parsing as array first
                if (trimmed.startsWith('[')) {
                  parsedContent = JSON.parse(trimmed);
                } else if (trimmed.startsWith('{')) {
                  const fullJson = JSON.parse(trimmed);
                  parsedContent = fullJson.content || fullJson;
                }

                // If we successfully parsed and got an array
                if (Array.isArray(parsedContent)) {
                  // Send any new blocks we haven't sent yet
                  for (let i = sentBlockCount; i < parsedContent.length; i++) {
                    const block = parsedContent[i];
                    if (block.type && block.text) {
                      console.log(`Streaming block ${sentBlockCount + 1}: ${block.type} - ${block.text.substring(0, 50)}...`);
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'block', block })}\n\n`));
                      sentBlockCount++;
                    }
                  }
                }
              } catch (parseError) {
                // JSON not complete yet, continue accumulating
              }
            }
          } catch (e) {
            // Invalid JSON in stream, continue
          }
        }
      }
    }

    // Parse any remaining content and send unsent blocks
    if (accumulatedJson) {
      try {
        let parsed: any;
        const trimmed = accumulatedJson.trim();

        if (trimmed.startsWith('[')) {
          parsed = JSON.parse(trimmed);
        } else if (trimmed.startsWith('{')) {
          const fullJson = JSON.parse(trimmed);
          parsed = fullJson.content || fullJson;
        }

        if (Array.isArray(parsed)) {
          for (let i = sentBlockCount; i < parsed.length; i++) {
            const block = parsed[i];
            if (block.type && block.text) {
              console.log(`Final block ${i + 1}: ${block.type} - ${block.text.substring(0, 50)}...`);
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'block', block })}\n\n`));
              sentBlockCount++;
            }
          }
        }

        console.log(`✅ Chunk ${chunkIndex + 1}/${totalChunks} complete: sent ${sentBlockCount} blocks`);
      } catch (e) {
        console.error(`Chunk ${chunkIndex + 1}: Error parsing final JSON:`, e);
        console.error('Accumulated JSON preview:', accumulatedJson.substring(0, 200));
      }
    }
  } catch (error) {
    console.error(`Chunk ${chunkIndex + 1} streaming error:`, error);
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

        // Process chunks sequentially with streaming
        for (let i = 0; i < chunks.length; i++) {
          await processChunkStreaming(chunks[i], i, chunks.length, apiKey, controller, encoder);

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
