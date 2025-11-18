export interface LegalTerm {
  term: string;
  definition: string;
}

export interface JudgmentMetadata {
  uri: string;
  name: string;
  cite: string;
  date: string;
  court: string;
  neutral_citation?: string;
}

export interface JudgmentContent {
  metadata: JudgmentMetadata;
  content: string;
  xml?: string;
}

export interface Citation {
  text: string;
  uri?: string;
  start: number;
  end: number;
}

export interface HighlightedTerm {
  term: string;
  definition: string;
  start: number;
  end: number;
}
