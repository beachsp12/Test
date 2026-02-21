# GBBREB Offer Assistant

A web application for Greater Boston real estate agents that auto-generates completed Greater Boston Real Estate Board (GBBREB) offer documents from natural language input.

## Features

- **Three input methods:** Chat (multi-turn AI conversation), Voice dictation, or direct form fields
- **AI-powered extraction:** Claude (claude-sonnet-4-6) extracts all offer fields with confidence scores
- **Field review UI:** Color-coded confidence indicators, inline editing, required field validation
- **PDF generation:** Fills and generates offer documents as PDFs
- **Real GBBREB PDF support:** Upload your official blank GBBREB forms → auto-detect fields → map once → reuse forever
- **Template management:** Save offer structures (buyer info stripped) and reuse across transactions
- **Offer history:** Full audit trail with version control for each generated document

## Architecture

```
frontend/    React + TypeScript + Vite + Tailwind CSS
backend/     Node.js + Express + TypeScript
             ├── Claude API (NLP field extraction)
             ├── SQLite (offers, templates, documents, form templates)
             └── pdf-lib (PDF generation and form filling)
```

## Quick Start

### 1. Prerequisites
- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com/)

### 2. Environment
```bash
cp .env.example .env
# Edit .env and set ANTHROPIC_API_KEY=your_key_here
```

### 3. Install dependencies
```bash
cd backend && npm install
cd ../frontend && npm install
```

### 4. Run in development
```bash
# Terminal 1 – Backend (port 3001)
cd backend && npm run dev

# Terminal 2 – Frontend (port 5173)
cd frontend && npm run dev
```

Open http://localhost:5173

## Using Your GBBREB PDFs

1. Navigate to **GBBREB Forms** in the top nav
2. Upload your blank OTP (or P&S, BRA) PDF
3. The app auto-detects all form fields and suggests schema mappings
4. Confirm/adjust the field mappings and click **Save Mappings**
5. From now on, every offer PDF is filled directly into your official GBBREB form
6. Uploaded PDFs persist in the database — upload once, reuse for every offer

## Workflow

```
New Offer → Chat/Voice/Form input → Claude extracts fields
         → Review & edit fields    → Generate Draft PDF
         → Preview in browser      → Generate Final PDF
         → Save / Download         → Route to e-signature
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/extract` | Extract fields from natural language via Claude |
| GET/POST/PUT/DELETE | `/api/offers` | Offer CRUD |
| POST | `/api/documents/generate/:offerId` | Generate PDF |
| GET | `/api/documents/:docId/pdf` | Download PDF |
| POST | `/api/documents/inspect-pdf` | Inspect uploaded PDF form fields |
| GET/POST/DELETE | `/api/templates` | Offer template CRUD |
| GET/POST/DELETE | `/api/form-templates` | GBBREB PDF template management |
| PUT | `/api/form-templates/:type/mappings` | Save field mappings |

## E-Signature Integration (Phase 2)

The final PDF endpoint (`/api/documents/:docId/pdf`) is designed to be piped directly into:
- **DotLoop Partner API** (recommended for GBBREB agents)
- **DocuSign eSignature API**
- **HelloSign/Dropbox Sign API**

## Development Notes

- SQLite database is stored at `backend/data/offers.db`
- PDF data stored as BLOBs in SQLite (swap for S3 in production)
- The `generateOTPPdf()` fallback generates a structured layout when no GBBREB PDF is mapped
- Voice input uses browser Web Speech API (Chrome/Edge only)
