# UKSC Helper - UK Supreme Court Judgment Reader

**Last Updated:** 2025-01-19
**Version:** 1.1.0
**AI Instruction:** This file MUST be updated whenever significant architectural changes are made to the project.

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Directory Structure](#directory-structure)
5. [Key Systems](#key-systems)
6. [Data Flow](#data-flow)
7. [API Endpoints](#api-endpoints)
8. [Components](#components)
9. [Environment Variables](#environment-variables)
10. [Development Guide](#development-guide)

---

## Project Overview

UKSC Helper is a web application for reading and analyzing UK Supreme Court judgments. It fetches judgments from the National Archives, uses AI to format them into a clean structure, and provides features like legal term highlighting, judge identification, and an elegant reading experience.

### Core Features
- **Case Search & Browse**: Search 50 recent UKSC cases
- **AI-Powered Formatting**: LLM structures raw XML into clean, hierarchical format
- **Smart Chunking**: Handles any judgment length with intelligent text splitting
- **Legal Dictionary**: Auto-highlight and define legal terms inline
- **3-Panel Layout**: Collapsible navigation, main reader, case details sidebar
- **Judge Extraction**: Automatically identifies judges from XML metadata
- **Clean Structure**: Removes table of contents and formatting artifacts

---

## Architecture

### High-Level Overview
```
┌─────────────────┐
│  National       │
│  Archives API   │──┐
└─────────────────┘  │
                     │ XML
┌─────────────────┐  │
│  OpenRouter     │  │
│  (Gemini Flash) │  │
└─────────────────┘  │
         │           │
         │ AI        │
         │ Formatting│
         ▼           ▼
┌──────────────────────────┐
│   Next.js API Routes     │
│  - /api/search           │
│  - /api/judgment         │
│  - /api/judgment/stream  │
│  - /api/explain          │
└──────────────────────────┘
         │
         │ JSON/SSE
         ▼
┌──────────────────────────┐
│   React Frontend         │
│  - Case List             │
│  - Judgment Reader       │
│  - Dictionary Panel      │
└──────────────────────────┘
```

### Design Philosophy
- **Server-Side Processing**: All external API calls happen server-side to avoid CORS
- **Progressive Enhancement**: Falls back gracefully if AI formatting fails
- **Simplicity First**: Simple REST endpoints over complex streaming (easier to debug, more reliable)
- **Type Safety**: TypeScript throughout for reliability
- **Smart Chunking**: Handle any judgment length by splitting intelligently at natural boundaries

---

## Tech Stack

### Frontend
- **Framework**: Next.js 13.4.19 (App Router) - Specific version for Node.js 18.16.1 compatibility
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn/UI
- **State Management**:
  - Zustand (dictionary store)
  - React Query (data fetching)
  - React useState/useEffect (local state)

### Backend
- **Runtime**: Node.js 18.16.1
- **API Framework**: Next.js API Routes
- **XML Parsing**: fast-xml-parser
- **LLM**: OpenRouter (Google Gemini 2.0 Flash)

### External APIs
- **National Archives Find Case Law API**
  - Atom Feed: `https://caselaw.nationalarchives.gov.uk/{court}/atom.xml`
  - Judgment XML: `https://caselaw.nationalarchives.gov.uk/{court}/{year}/{number}/data.xml`
- **OpenRouter API**
  - Model: `google/gemini-2.0-flash-001`
  - Streaming endpoint: `https://openrouter.ai/api/v1/chat/completions`

### Fonts
- **Sans**: Inter (UI elements)
- **Serif**: Merriweather, Playfair Display (judgment text)

### Colors
- **Oxford Blue**: `#0f172a` (primary brand color)
- **Gold**: `#d4af37` (accents, borders)
- **Paper**: `#f9fafb` (background)
- **Category Colors**: Gold (Constitutional), Purple (Latin), Blue (Procedural), Red (Tort)

---

## Directory Structure

```
UKSC-Helper/
├── app/
│   ├── api/
│   │   ├── judgment/
│   │   │   ├── route.ts          # Main judgment endpoint (non-streaming)
│   │   │   └── stream/
│   │   │       └── route.ts      # Streaming judgment endpoint (SSE)
│   │   ├── search/
│   │   │   └── route.ts          # Case search endpoint
│   │   └── explain/
│   │       └── route.ts          # AI explanation endpoint
│   ├── globals.css               # Global styles, animations, fonts
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Home page (main app)
│
├── components/
│   ├── navigation-sidebar.tsx    # Collapsible left nav (dark blue)
│   ├── cases-panel.tsx           # Case list with search
│   ├── dictionary-panel.tsx      # Legal term browser
│   ├── settings-panel.tsx        # App settings
│   ├── judgment-reader.tsx       # Main reading pane with streaming
│   ├── case-details-sidebar.tsx  # Right sidebar (judges, metadata)
│   ├── text-highlighter.tsx      # Legal term highlighting logic
│   ├── ai-explainer.tsx          # AI explanation panel
│   └── ui/                       # Shadcn components
│
├── lib/
│   ├── api.ts                    # Client-side API functions
│   ├── store.ts                  # Zustand dictionary store
│   ├── trie.ts                   # Trie data structure for term matching
│   ├── types.ts                  # TypeScript interfaces
│   └── mock-dictionary.ts        # Legal terms database
│
├── tailwind.config.js            # Tailwind configuration
├── tsconfig.json                 # TypeScript configuration
├── package.json                  # Dependencies
└── PROJECT.md                    # This file
```

---

## Key Systems

### 1. Case Search System
**Location**: `app/api/search/route.ts`

**How It Works**:
1. Client requests recent UKSC cases
2. Server fetches Atom feed from `https://caselaw.nationalarchives.gov.uk/uksc/atom.xml`
3. Parses XML feed with `fast-xml-parser`
4. Extracts case metadata (name, citation, date, URI)
5. Returns JSON array of cases

**Data Format**:
```typescript
interface JudgmentMetadata {
  uri: string;          // "uksc/2025/39"
  name: string;         // "R v Smith"
  cite: string;         // "[2025] UKSC 39"
  date: string;         // "2025-01-15"
  court: string;        // "UKSC"
}
```

### 2. Judgment Fetching System
**Location**: `app/api/judgment/route.ts`

**How It Works**:
1. Client requests judgment by citation (e.g., `uksc/2025/39`)
2. Server tries multiple URL patterns:
   - `/{court}/{year}/{number}/data.xml`
   - `/id/{court}/{year}/{number}/data.xml`
3. Parses Akoma Ntoso XML format
4. Extracts:
   - Title (from `FRBRname`)
   - Date (from `FRBRdate`)
   - Judges (from `TLCPerson` tags or fallback regex)
   - Raw text (recursive traversal)
5. Optionally structures with LLM (if `OPENROUTER_API_KEY` set)
6. Returns comprehensive JSON

**Data Format**:
```typescript
interface Judgment {
  title: string;
  date: string;
  content: string;            // Legacy plain text
  structured?: StructuredContent;  // AI-formatted blocks
  court: string;
  year: string;
  number: string;
  cite: string;
  judges?: string[];
  debug?: DebugInfo;
}
```

### 3. AI Formatting System
**Location**: `app/api/judgment/stream/route.ts` (formatWithAI, formatChunk)

**Purpose**: Transform messy XML text into clean, structured, hierarchical format.

**How It Works**:
1. **Text Extraction**: Recursively traverse XML to extract all text nodes
2. **Smart Chunking**: Split into 15k character chunks
   - Splits at paragraph boundaries (`\n\n`)
   - If single paragraph > 15k, splits by sentences
   - Prevents oversized chunks that cause JSON truncation
3. **LLM Processing**: Send each chunk to Gemini Flash with structured prompt
   - Model: `google/gemini-2.0-flash-001`
   - Max tokens: 8000 (prevents truncation)
   - Response format: JSON object
4. **Block Classification**: LLM identifies and labels:
   - `h2`: Major sections (INTRODUCTION, LORD REED, Part I)
   - `h3`: Subsections (The legislative framework, Analysis)
   - `p`: Regular paragraphs
   - `quote`: Quoted legislation or case law
5. **TOC Removal**: First chunk only - removes table of contents
6. **Merging**: Combine all chunk results into single block array

**System Prompt** (key parts):
```
CRITICAL - REMOVE FROM START (first chunk only):
- Table of contents (lists of section titles with no content)
- Page numbers, headers, footers at top
- Metadata blocks

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

OUTPUT: JSON array only, no wrapper object
[{"type":"h2","text":"INTRODUCTION"},{"type":"p","text":"This appeal concerns..."}]
```

**Why AI Formatting?**
- Makes all judgments uniform and consistent
- Identifies document structure automatically
- Creates clear visual hierarchy
- Removes table of contents and artifacts
- Enables better reading experience

### 4. Formatting Endpoint System
**Location**: `app/api/judgment/stream/route.ts`

**Purpose**: Process entire judgment with AI and return formatted blocks as JSON.

**Architecture**: Simple REST endpoint (no streaming complexity)

**How It Works**:
1. Client calls `GET /api/judgment/stream?citation=uksc/2025/39`
2. Server:
   - Fetches XML from National Archives
   - Extracts raw text
   - Splits into chunks (15k chars)
   - Processes each chunk with AI sequentially
   - Combines all blocks
   - Returns `{ blocks: [...] }`
3. Client receives complete formatted judgment and displays

**Request/Response**:
```typescript
// Request
GET /api/judgment/stream?citation=uksc/2025/39

// Response (200 OK)
{
  "blocks": [
    { "type": "h2", "text": "LORD STEPHENS" },
    { "type": "h2", "text": "INTRODUCTION" },
    { "type": "p", "text": "This appeal concerns..." },
    { "type": "h3", "text": "The legislative framework" },
    { "type": "p", "text": "Section 15 of the Act..." }
  ]
}

// Error Response (500)
{
  "error": "AI API error 429: Rate limit exceeded"
}
```

**Client Implementation** (`components/judgment-reader.tsx`):
- Shows "Formatting judgment with AI..." while processing
- Displays formatted blocks when ready
- Falls back to raw text on error
- No streaming complexity - just fetch and display

### 5. Legal Dictionary System
**Location**: `lib/store.ts`, `components/text-highlighter.tsx`

**How It Works**:
1. **Data Structure**: Trie (prefix tree) for efficient pattern matching
2. **Storage**: Zustand store holds dictionary + trie
3. **Matching**: Scan text for legal terms using trie
4. **Highlighting**: Wrap matches in styled spans
5. **Tooltips**: Show definitions on hover

**Data Format**:
```typescript
interface LegalTerm {
  term: string;        // "ratio decidendi"
  definition: string;  // "The principle or reason..."
}
```

### 6. Judge Extraction System
**Location**: `app/api/judgment/route.ts` (extract judges section)

**How It Works**:
1. **Primary**: Parse `<TLCPerson>` tags from XML metadata
   - Extract `showAs` attribute
   - Filter out parties (appellant, respondent)
2. **Fallback**: Regex parse from body text
   - Pattern: `/(?:Before|Justices):\s*([\s\S]*?)(?=\n\n|Judgment)/i`
   - Split by commas, newlines, "and"

**Output**: Array of judge names displayed in right sidebar

---

## Data Flow

### Case Selection Flow
```
User clicks case in sidebar
  ↓
page.tsx: setSelectedUri(uri)
  ↓
JudgmentReader receives uri prop
  ↓
useQuery calls fetchJudgmentByUri(uri)
  ↓
GET /api/judgment?citation=uksc/2025/39
  ↓
Server fetches XML from National Archives
  ↓
Server extracts metadata + judges
  ↓
Server structures with LLM (optional)
  ↓
Returns Judgment JSON
  ↓
JudgmentReader receives data
  ↓
If streaming enabled → connect to /api/judgment/stream
  ↓
Render blocks progressively with fade-in animation
```

### Streaming Flow
```
JudgmentReader detects no pre-structured content
  ↓
Opens EventSource to /api/judgment/stream
  ↓
Server fetches XML and chunks text
  ↓
For each chunk:
  ↓
  Call OpenRouter with streaming
  ↓
  Parse JSON as it streams in
  ↓
  Send block events to client
  ↓
Client adds blocks to state array
  ↓
React renders new blocks with fade-in
  ↓
Repeat until all chunks complete
```

---

## API Endpoints

### GET /api/search
**Purpose**: Fetch recent UKSC cases from Atom feed

**Query Parameters**:
- `court` (optional): Court code (default: "uksc")

**Response**:
```json
{
  "results": [
    {
      "uri": "uksc/2025/39",
      "name": "Case Name",
      "cite": "[2025] UKSC 39",
      "date": "2025-01-15",
      "court": "UKSC"
    }
  ],
  "total": 50
}
```

### GET /api/judgment
**Purpose**: Fetch and format a single judgment

**Query Parameters**:
- `citation` (required): Court/year/number (e.g., "uksc/2025/39")

**Response**:
```json
{
  "title": "Judgment Title",
  "date": "2025-01-15",
  "content": "Plain text fallback...",
  "structured": {
    "meta": {
      "case_name": "...",
      "neutral_citation": "[2025] UKSC 39",
      "judgment_date": "2025-01-15"
    },
    "content": [
      { "type": "h2", "text": "Introduction" },
      { "type": "p", "text": "..." }
    ]
  },
  "court": "UKSC",
  "year": "2025",
  "number": "39",
  "cite": "[2025] UKSC 39",
  "judges": ["Lord Reed", "Lady Hale"],
  "debug": { ... }
}
```

### GET /api/judgment/stream
**Purpose**: Stream formatted judgment in real-time

**Query Parameters**:
- `citation` (required): Court/year/number

**Response**: Server-Sent Events (text/event-stream)

**Example Events**:
```
data: {"type":"meta","totalChunks":3}

data: {"type":"block","block":{"type":"h2","text":"Introduction"}}

data: {"type":"chunk_complete","index":1,"total":3}

data: {"type":"complete"}
```

### POST /api/explain
**Purpose**: AI explanation of legal concepts (not currently used)

---

## Components

### NavigationSidebar
**Purpose**: Collapsible dark blue sidebar with icon navigation

**States**:
- Collapsed: Shows only icons (Cases, Dictionary, Settings)
- Expanded: Shows full panel content

**Props**:
- `selectedOption`: Current panel ('cases' | 'dictionary' | 'settings')
- `onSelectOption`: Callback when user clicks icon
- `children`: Panel content to display when expanded

### CasesPanel
**Purpose**: Case list with search functionality

**Features**:
- Fetches 50 recent UKSC cases
- Search filter by name/citation/date
- Highlights selected case
- Loading states

**Props**:
- `onSelectCase`: Callback with case URI
- `selectedUri`: Currently selected case URI

### JudgmentReader
**Purpose**: Main reading pane with streaming support

**Features**:
- Displays judgment text
- Handles streaming from `/api/judgment/stream`
- Progressive block rendering with fade-in
- Progress bar for chunk processing
- Fallback to plain text if streaming fails

**Props**:
- `uri`: Case URI to load
- `onCitationClick`: Callback when citation is clicked
- `onJudgmentLoad`: Callback with full judgment data

### CaseDetailsSidebar
**Purpose**: Right sidebar showing case metadata

**Displays**:
- Citation, court, date
- List of judges (from XML metadata)
- Cited cases (placeholder for future)

**Props**:
- `judgment`: Current judgment object (nullable)

### TextHighlighter
**Purpose**: Wraps text with legal term highlighting

**How It Works**:
1. Receives text content
2. Uses dictionary store trie to find matches
3. Wraps matches in styled spans
4. Shows tooltips on hover

**Props**:
- `content`: Text to highlight
- `onCitationClick`: Callback for citation clicks

---

## Environment Variables

### Required
```bash
OPENROUTER_API_KEY=sk-or-v1-xxxxx
```

### Optional
None currently

---

## Development Guide

### Setup
```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build
```

### Adding a New Legal Term
1. Edit `lib/mock-dictionary.ts`
2. Add to `mockLegalDictionary` array:
```typescript
{
  term: 'your term',
  definition: 'Definition here'
}
```

### Modifying AI Formatting
1. Edit system prompt in `app/api/judgment/stream/route.ts`
2. Update `processChunkStreaming` function
3. Test with long judgments to ensure completeness

### Changing Fonts or Colors
1. Fonts: Update `app/globals.css` import and `tailwind.config.js`
2. Colors: Update `tailwind.config.js` theme.extend.colors

### Debugging Streaming
1. Check server console for logs: `Processing chunk X/Y`
2. Check browser console for EventSource messages
3. Verify `OPENROUTER_API_KEY` is set
4. Test with short judgment first

---

## Common Issues

### Build Warnings
- **"Can't resolve 'encoding'"**: Safe to ignore (OpenAI dependency issue)
- **"Dynamic server usage"**: Expected for API routes, safe to ignore

### No Text Appearing
1. Check server logs for errors
2. Verify OpenRouter API key is valid
3. Check browser console for detailed error messages
4. Check if formatting endpoint is reachable

### JSON Truncation Errors
1. Reduce chunk size (currently 15k chars)
2. Reduce max_tokens (currently 8000)
3. Check for oversized paragraphs in logs
4. Verify smart chunking is splitting by sentences

### Slow Performance
1. Chunk size is already optimized (15k chars)
2. Processing is sequential (prevents rate limiting)
3. Model is optimized (Gemini Flash is fastest)

---

## Future Improvements

### Planned Features
- [ ] Save structured judgments to database (avoid re-processing)
- [ ] User authentication
- [ ] Bookmarking and annotations
- [ ] Export to PDF with formatting
- [ ] Search within judgment
- [ ] Citation graph visualization
- [ ] Mobile responsive design improvements

### Technical Debt
- [ ] Add proper error boundaries
- [ ] Implement retry logic for failed chunks
- [ ] Add unit tests for critical functions
- [ ] Optimize bundle size
- [ ] Add service worker for offline reading
- [ ] Migrate to Next.js 15 when Node.js updated

---

## Changelog

### Version 1.1.0 (2025-01-19) - Formatting System Overhaul
**Major Changes:**
- 🔄 Rebuilt formatting system from scratch with simplicity in mind
- ❌ Removed complex SSE streaming (too complex, unreliable)
- ✅ Implemented simple REST endpoint for formatting
- ✅ Added smart chunking with paragraph and sentence splitting
- ✅ Reduced chunk size: 25k → 15k chars (prevents truncation)
- ✅ Reduced max tokens: 16k → 8k (prevents incomplete JSON)
- ✅ Enhanced TOC removal in system prompt
- ✅ Added comprehensive error logging (client + server)

**Technical Details:**
- Client now makes single API call and waits for complete response
- Server handles chunking internally (transparent to client)
- Smart chunking detects oversized paragraphs and splits by sentences
- Better error messages show actual failure reasons
- Fixed JSON truncation issues with long judgments

**Files Changed:**
- `app/api/judgment/stream/route.ts`: Complete rewrite (500+ lines changed)
- `components/judgment-reader.tsx`: Simplified state management
- `PROJECT.md`: Updated documentation

### Version 1.0.0 (2025-01-15) - Initial Release
- ✅ Case search and browsing
- ✅ AI-powered formatting with Gemini Flash
- ✅ Legal dictionary with Trie matching
- ✅ 3-panel collapsible layout
- ✅ Judge extraction from XML
- ✅ Comprehensive documentation

---

**AI Instruction**: When you make architectural changes to this project, update the relevant sections in this file. Add entries to the Changelog with dates. Keep this documentation current and accurate.
