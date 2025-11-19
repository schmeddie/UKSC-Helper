/**
 * Trie data structure for efficient multi-pattern matching
 * Used to find all dictionary terms in judgment text in a single pass
 */

import { LegalTermCategory } from './types';

class TrieNode {
  children: Map<string, TrieNode> = new Map();
  isEndOfWord: boolean = false;
  definition: string | null = null;
  originalTerm: string | null = null;
  category: LegalTermCategory | null = null;
}

export class Trie {
  private root: TrieNode = new TrieNode();

  /**
   * Insert a term and its definition into the trie
   */
  insert(term: string, definition: string, category: LegalTermCategory): void {
    const normalizedTerm = term.toLowerCase();
    let node = this.root;

    for (const char of normalizedTerm) {
      if (!node.children.has(char)) {
        node.children.set(char, new TrieNode());
      }
      node = node.children.get(char)!;
    }

    node.isEndOfWord = true;
    node.definition = definition;
    node.originalTerm = term;
    node.category = category;
  }

  /**
   * Search for all matches in the given text
   * Returns array of {term, definition, category, start, end} objects
   */
  findAllMatches(text: string): Array<{
    term: string;
    definition: string;
    category: LegalTermCategory;
    start: number;
    end: number;
  }> {
    const matches: Array<{
      term: string;
      definition: string;
      category: LegalTermCategory;
      start: number;
      end: number;
    }> = [];
    const lowerText = text.toLowerCase();

    for (let i = 0; i < lowerText.length; i++) {
      // Skip non-alphabetic characters at start
      if (!this.isWordChar(lowerText[i])) continue;

      let node = this.root;
      let j = i;

      // Try to match as long as possible
      let lastMatch: {
        term: string;
        definition: string;
        category: LegalTermCategory;
        end: number;
      } | null = null;

      while (j < lowerText.length) {
        const char = lowerText[j];

        // If we hit a non-word character, check if we can continue
        if (!this.isWordChar(char)) {
          // Allow spaces and hyphens within terms
          if (char === ' ' || char === '-') {
            if (node.children.has(char)) {
              node = node.children.get(char)!;
              j++;
              continue;
            }
          }
          break;
        }

        if (!node.children.has(char)) break;

        node = node.children.get(char)!;
        j++;

        // Record this match if it's a complete word
        if (node.isEndOfWord) {
          // Check if next character is word boundary
          if (j >= lowerText.length || !this.isWordChar(lowerText[j])) {
            lastMatch = {
              term: node.originalTerm!,
              definition: node.definition!,
              category: node.category!,
              end: j,
            };
          }
        }
      }

      // If we found a match, add it
      if (lastMatch) {
        // Check word boundary at start
        if (i === 0 || !this.isWordChar(lowerText[i - 1])) {
          matches.push({
            term: lastMatch.term,
            definition: lastMatch.definition,
            category: lastMatch.category,
            start: i,
            end: lastMatch.end,
          });
        }
      }
    }

    return matches;
  }

  private isWordChar(char: string): boolean {
    return /[a-z0-9]/i.test(char);
  }
}
