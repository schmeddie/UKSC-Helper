/**
 * Judgment Parser
 * Converts XML/HTML from National Archives to clean, readable text
 */

import { XMLParser } from 'fast-xml-parser';

interface AkomaNtosoSection {
  '#text'?: string;
  p?: any;
  blockquote?: any;
  heading?: any;
}

/**
 * Parse Akoma Ntoso XML judgment
 */
export function parseAkomaNtosoXML(xml: string): string {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    ignoreDeclaration: true,
    trimValues: true,
  });

  try {
    const parsed = parser.parse(xml);

    // Navigate to judgment body
    const judgment = parsed?.akomaNtoso?.judgment;
    if (!judgment) {
      // If not Akoma Ntoso, try to extract any text
      return extractTextFromObject(parsed);
    }

    const body = judgment.judgmentBody || judgment.mainBody;
    if (!body) {
      return extractTextFromObject(judgment);
    }

    return extractTextFromBody(body);
  } catch (error) {
    console.error('XML parsing error:', error);
    // Fallback: strip all tags
    return stripHtmlTags(xml);
  }
}

/**
 * Extract text from judgment body
 */
function extractTextFromBody(body: any): string {
  const parts: string[] = [];

  if (typeof body === 'string') {
    return body;
  }

  if (Array.isArray(body)) {
    body.forEach((item) => {
      parts.push(extractTextFromObject(item));
    });
  } else if (typeof body === 'object') {
    parts.push(extractTextFromObject(body));
  }

  return parts.join('\n\n');
}

/**
 * Recursively extract text from any object
 */
function extractTextFromObject(obj: any): string {
  if (typeof obj === 'string') {
    return obj.trim();
  }

  if (typeof obj !== 'object' || obj === null) {
    return '';
  }

  const parts: string[] = [];

  // Handle common Akoma Ntoso elements
  if (obj.heading) {
    parts.push('## ' + extractTextFromObject(obj.heading));
  }

  if (obj.p) {
    const paragraphs = Array.isArray(obj.p) ? obj.p : [obj.p];
    paragraphs.forEach((p: any) => {
      parts.push(extractTextFromObject(p));
    });
  }

  if (obj.blockquote) {
    parts.push('> ' + extractTextFromObject(obj.blockquote));
  }

  if (obj['#text']) {
    parts.push(obj['#text']);
  }

  // Handle other text nodes
  Object.entries(obj).forEach(([key, value]) => {
    if (key === '#text' || key === 'heading' || key === 'p' || key === 'blockquote') {
      return; // Already handled
    }

    if (key.startsWith('@_')) {
      return; // Skip attributes
    }

    if (Array.isArray(value)) {
      value.forEach((item) => {
        const text = extractTextFromObject(item);
        if (text) parts.push(text);
      });
    } else if (typeof value === 'object') {
      const text = extractTextFromObject(value);
      if (text) parts.push(text);
    } else if (typeof value === 'string') {
      parts.push(value);
    }
  });

  return parts.filter(Boolean).join('\n\n');
}

/**
 * Strip HTML/XML tags as fallback
 */
function stripHtmlTags(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parse HTML judgment (fallback)
 */
export function parseHtmlJudgment(html: string): string {
  // Remove scripts and styles
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // Convert common elements
  text = text.replace(/<h[1-6][^>]*>/gi, '\n\n## ');
  text = text.replace(/<\/h[1-6]>/gi, '\n\n');
  text = text.replace(/<p[^>]*>/gi, '\n\n');
  text = text.replace(/<\/p>/gi, '');
  text = text.replace(/<br[^>]*>/gi, '\n');
  text = text.replace(/<blockquote[^>]*>/gi, '\n\n> ');
  text = text.replace(/<\/blockquote>/gi, '\n\n');

  // Remove all other tags
  text = text.replace(/<[^>]+>/g, '');

  // Clean up whitespace
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.replace(/[ \t]+/g, ' ');

  return text.trim();
}

/**
 * Smart parser - tries XML first, falls back to HTML
 */
export function parseJudgment(content: string): string {
  // Detect format
  const isXml = content.trim().startsWith('<?xml') || content.includes('<akomaNtoso');

  if (isXml) {
    return parseAkomaNtosoXML(content);
  } else {
    return parseHtmlJudgment(content);
  }
}
