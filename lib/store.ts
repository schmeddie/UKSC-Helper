import { create } from 'zustand';
import { LegalTerm, LegalTermCategory } from './types';
import { Trie } from './trie';

interface DictionaryState {
  terms: LegalTerm[];
  trie: Trie;
  isLoaded: boolean;
  loadDictionary: (terms: LegalTerm[]) => void;
  findMatches: (text: string) => Array<{
    term: string;
    definition: string;
    category: LegalTermCategory;
    start: number;
    end: number;
  }>;
}

export const useDictionaryStore = create<DictionaryState>((set, get) => ({
  terms: [],
  trie: new Trie(),
  isLoaded: false,

  loadDictionary: (terms: LegalTerm[]) => {
    const trie = new Trie();
    terms.forEach((item) => {
      trie.insert(item.term, item.definition, item.category);
    });

    set({ terms, trie, isLoaded: true });
  },

  findMatches: (text: string) => {
    const { trie } = get();
    return trie.findAllMatches(text);
  },
}));
