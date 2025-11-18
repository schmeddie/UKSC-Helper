# UK Supreme Court Judgment Explorer

A modern, interactive web application for reading UK Supreme Court judgments with AI-powered annotations, instant legal term definitions, and intelligent text explanations.

## Features

### 🎯 Core Features

- **Clean Judgment Reader**: Beautiful, e-reader-style interface with serif typography for optimal readability
- **Active Dictionary Engine**: Automatic highlighting of legal terms with instant popover definitions using efficient Trie-based matching
- **Citation Linking**: Automatic detection and linking of UK neutral citations (e.g., [2023] UKSC 42)
- **AI Text Explanation**: Select any text to get a plain-English explanation powered by GPT-4
- **Real-time Search**: Filter cases by name, citation, or date
- **Responsive Design**: Minimalist, academic aesthetic with lots of whitespace

### 🛠 Technical Stack

- **Frontend**: Next.js 15 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS, Shadcn/UI components
- **Icons**: Lucide React
- **State Management**: Zustand (for dictionary)
- **Data Fetching**: TanStack React Query
- **AI**: OpenAI GPT-4o-mini API
- **Legal Data**: National Archives Find Case Law API
- **XML Parsing**: fast-xml-parser (Akoma Ntoso format)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- OpenAI API key (for AI explanations feature)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd UKSC-Helper
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your OpenAI API key:
```
OPENAI_API_KEY=your_api_key_here
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### Reading Judgments

1. **Browse Cases**: The left sidebar shows recent UK Supreme Court judgments
2. **Search**: Use the search bar to filter by case name, citation, or date
3. **Select a Case**: Click on any case to load its full judgment
4. **Interactive Terms**: Hover over underlined legal terms to see instant definitions
5. **Citations**: Click on case citations to navigate to referenced cases
6. **AI Explanations**: Highlight any text and click "Explain with AI" for a plain-English explanation

### Key Features Explained

#### Legal Dictionary

The app includes 30+ common legal terms with definitions. When you load a judgment, the app automatically:
- Scans the text using a Trie data structure for efficient pattern matching
- Underlines matched terms with a dotted blue line
- Shows popover definitions when you click on terms

#### Citation Detection

Supports all major UK court citation formats:
- UK Supreme Court: `[YYYY] UKSC N`
- Court of Appeal: `[YYYY] EWCA Civ/Crim N`
- High Court: `[YYYY] EWHC N (Division)`
- And more...

#### AI-Powered Explanations

1. Select any paragraph or sentence in the judgment
2. Click the "Explain with AI" button that appears
3. Get a concise, plain-English explanation in under 3 sentences

## Architecture

### Performance Optimizations

1. **Trie-based Text Matching**: Single-pass algorithm finds all dictionary terms in O(n) time
2. **React Query Caching**: Judgments are cached to avoid re-fetching
3. **Zustand State**: Fast client-side dictionary access
4. **Lazy Loading**: Components load only when needed

### Directory Structure

```
UKSC-Helper/
├── app/
│   ├── api/
│   │   └── explain/          # OpenAI API endpoint
│   ├── layout.tsx            # Root layout with providers
│   └── page.tsx              # Main application page
├── components/
│   ├── ui/                   # Shadcn/UI components
│   ├── case-list.tsx         # Sidebar case browser
│   ├── judgment-reader.tsx   # Main reading pane
│   ├── text-highlighter.tsx  # Term highlighting engine
│   └── ai-explainer.tsx      # Text selection + AI
├── lib/
│   ├── api-client.ts         # National Archives API
│   ├── parser.ts             # XML/HTML judgment parser
│   ├── trie.ts               # Trie data structure
│   ├── citations.ts          # Citation detection
│   ├── store.ts              # Zustand dictionary store
│   ├── types.ts              # TypeScript interfaces
│   ├── mock-dictionary.ts    # Sample legal terms
│   └── query-provider.tsx    # React Query setup
└── ...
```

## Customization

### Adding More Legal Terms

Edit `lib/mock-dictionary.ts`:

```typescript
export const mockLegalDictionary: LegalTerm[] = [
  {
    term: 'your term',
    definition: 'Your definition here',
  },
  // ... more terms
];
```

### Changing Courts

Modify the API call in `app/page.tsx` to fetch from different courts:

```typescript
const { data: cases } = useQuery({
  queryKey: ['judgments'],
  queryFn: () => searchJudgments({ court: 'ewca' }), // Court of Appeal
});
```

### Styling

The color palette is defined in `app/globals.css` using CSS variables:
- Background: `--background` (Slate-50)
- Text: `--foreground` (Slate-900)
- Interactive: `--primary` (Blue-600)

## Future Enhancements

- [ ] Supabase integration for persistent dictionary storage
- [ ] User accounts and saved judgments
- [ ] Custom dictionary upload (JSON/CSV)
- [ ] PDF export with annotations
- [ ] Advanced search filters (date range, judges, etc.)
- [ ] Dark mode support
- [ ] Mobile-responsive design improvements

## API Limits & Credits

- **National Archives API**: Free, open access to UK case law
- **OpenAI API**: Paid service - costs ~$0.0001 per explanation

## License

MIT License - see LICENSE file for details

## Acknowledgments

- [The National Archives](https://caselaw.nationalarchives.gov.uk/) for providing free access to UK case law
- [Shadcn/UI](https://ui.shadcn.com/) for beautiful, accessible components
- OpenAI for GPT-4 API access
