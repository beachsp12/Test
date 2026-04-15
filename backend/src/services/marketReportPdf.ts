import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from 'pdf-lib';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface MarketStats {
  activeListings?: number;
  newListings?: number;
  closedSales?: number;
  avgDaysOnMarket?: number;
  medianSalePrice?: number;
  avgSalePrice?: number;
  listToSaleRatio?: number;   // decimal, e.g. 0.98
  monthsOfSupply?: number;
  medianSalePriceYoY?: number; // percent change, e.g. 5.2
  avgSalePriceYoY?: number;
}

export interface PriceRangeRow {
  range: string;
  count: number;
  pctOfTotal?: number;
}

export interface MarketReportFields {
  marketArea: string;
  reportPeriod: string;
  propertyType?: string;
  stats: MarketStats;
  priceRanges?: PriceRangeRow[];
  narrative?: string;
  agentName?: string;
  agentTitle?: string;
  agentPhone?: string;
  agentEmail?: string;
  agentLicense?: string;
  officeName?: string;
  officeAddress?: string;
}

// ─── Brand Constants ───────────────────────────────────────────────────────────

const EV_BLACK  = rgb(0.067, 0.067, 0.067);
const EV_GOLD   = rgb(0.714, 0.573, 0.196);
const EV_WHITE  = rgb(1, 1, 1);
const EV_DARK   = rgb(0.133, 0.133, 0.133);
const EV_GRAY   = rgb(0.467, 0.467, 0.467);
const EV_LIGHT  = rgb(0.965, 0.961, 0.953);

const PAGE_W    = 612;
const PAGE_H    = 792;
const MARGIN    = 48;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FOOTER_H  = 100;
const HEADER_H  = 82;

// ─── Format Helpers ────────────────────────────────────────────────────────────

function fmt$(val: number): string {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
  if (val >= 1_000)     return `$${Math.round(val / 1_000)}K`;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(val);
}

function fmtPct(val: number): string {
  return `${val > 0 ? '+' : ''}${val.toFixed(1)}%`;
}

// ─── PDF Builder ───────────────────────────────────────────────────────────────

class EVMarketReportBuilder {
  private doc!: PDFDocument;
  private page!: PDFPage;
  private regular!: PDFFont;
  private bold!: PDFFont;
  private y = 0;

  async init() {
    this.doc    = await PDFDocument.create();
    this.regular = await this.doc.embedFont(StandardFonts.Helvetica);
    this.bold    = await this.doc.embedFont(StandardFonts.HelveticaBold);
    this.addPage();
  }

  private addPage() {
    this.page = this.doc.addPage([PAGE_W, PAGE_H]);
    this.y    = PAGE_H - HEADER_H - 4 - 24;
  }

  // ── Header ────────────────────────────────────────────────────────────────────

  private drawHeader(f: MarketReportFields) {
    this.page.drawRectangle({ x: 0, y: PAGE_H - HEADER_H, width: PAGE_W, height: HEADER_H, color: EV_BLACK });

    this.page.drawText('ENGEL & VÖLKERS', {
      x: MARGIN, y: PAGE_H - 36,
      size: 19, font: this.bold, color: EV_WHITE,
    });
    this.page.drawText('Real Estate', {
      x: MARGIN, y: PAGE_H - 53,
      size: 8.5, font: this.regular, color: rgb(0.65, 0.65, 0.65),
    });

    const area  = f.marketArea.toUpperCase();
    const areaW = this.bold.widthOfTextAtSize(area, 11);
    this.page.drawText(area, {
      x: PAGE_W - MARGIN - areaW, y: PAGE_H - 34,
      size: 11, font: this.bold, color: EV_WHITE,
    });

    const periodW = this.regular.widthOfTextAtSize(f.reportPeriod, 8.5);
    this.page.drawText(f.reportPeriod, {
      x: PAGE_W - MARGIN - periodW, y: PAGE_H - 49,
      size: 8.5, font: this.regular, color: rgb(0.65, 0.65, 0.65),
    });

    if (f.propertyType) {
      const ptW = this.regular.widthOfTextAtSize(f.propertyType, 7.5);
      this.page.drawText(f.propertyType, {
        x: PAGE_W - MARGIN - ptW, y: PAGE_H - 62,
        size: 7.5, font: this.regular, color: rgb(0.55, 0.55, 0.55),
      });
    }

    // Gold bar
    this.page.drawRectangle({ x: 0, y: PAGE_H - HEADER_H - 4, width: PAGE_W, height: 4, color: EV_GOLD });
  }

  // ── Section title ─────────────────────────────────────────────────────────────

  private drawSectionTitle(title: string) {
    this.y -= 10;
    this.page.drawText(title, {
      x: MARGIN, y: this.y,
      size: 8, font: this.bold, color: EV_GRAY,
    });
    this.y -= 5;
    this.page.drawLine({
      start: { x: MARGIN, y: this.y },
      end: { x: PAGE_W - MARGIN, y: this.y },
      thickness: 0.75, color: EV_GOLD,
    });
    this.y -= 16;
  }

  // ── Single stat box ───────────────────────────────────────────────────────────

  private drawStatBox(
    bx: number, by: number, bw: number, bh: number,
    label: string, value: string, yoy?: number,
  ) {
    this.page.drawRectangle({ x: bx, y: by - bh, width: bw, height: bh, color: EV_LIGHT });
    this.page.drawRectangle({ x: bx, y: by - bh, width: 3,  height: bh, color: EV_GOLD  });

    const valSize = value.length > 8 ? 17 : 21;
    this.page.drawText(value, {
      x: bx + 12, y: by - 26,
      size: valSize, font: this.bold, color: EV_DARK,
    });

    if (yoy !== undefined) {
      const yoyTxt   = fmtPct(yoy);
      const yoyColor = yoy > 0 ? rgb(0.12, 0.52, 0.25) : yoy < 0 ? rgb(0.72, 0.16, 0.16) : EV_GRAY;
      this.page.drawText(yoyTxt, { x: bx + 12, y: by - 42, size: 7.5, font: this.bold,    color: yoyColor });
      const ytw = this.bold.widthOfTextAtSize(yoyTxt, 7.5);
      this.page.drawText(' YoY', { x: bx + 12 + ytw, y: by - 42, size: 7, font: this.regular, color: EV_GRAY });
    }

    this.page.drawText(label.toUpperCase(), {
      x: bx + 12, y: by - bh + 10,
      size: 6.5, font: this.bold, color: EV_GRAY,
    });
  }

  // ── Stats grid (3 columns) ────────────────────────────────────────────────────

  private drawStatsGrid(f: MarketReportFields) {
    const s    = f.stats;
    const cols = 3;
    const gap  = 8;
    const bw   = (CONTENT_W - gap * (cols - 1)) / cols;
    const bh   = 68;

    type StatItem = { label: string; value: string; yoy?: number };
    const items: StatItem[] = [];

    if (s.medianSalePrice != null)
      items.push({ label: 'Median Sale Price',  value: fmt$(s.medianSalePrice), yoy: s.medianSalePriceYoY });
    if (s.avgSalePrice != null)
      items.push({ label: 'Avg Sale Price',     value: fmt$(s.avgSalePrice),    yoy: s.avgSalePriceYoY });
    if (s.closedSales != null)
      items.push({ label: 'Closed Sales',       value: String(s.closedSales) });
    if (s.activeListings != null)
      items.push({ label: 'Active Listings',    value: String(s.activeListings) });
    if (s.newListings != null)
      items.push({ label: 'New Listings',       value: String(s.newListings) });
    if (s.avgDaysOnMarket != null)
      items.push({ label: 'Avg Days on Market', value: String(s.avgDaysOnMarket) });
    if (s.monthsOfSupply != null)
      items.push({ label: 'Months of Supply',   value: s.monthsOfSupply.toFixed(1) });
    if (s.listToSaleRatio != null)
      items.push({ label: 'List-to-Sale Ratio', value: `${(s.listToSaleRatio * 100).toFixed(1)}%` });

    const maxItems = Math.min(items.length, 6);
    const rows     = Math.ceil(maxItems / cols);

    for (let i = 0; i < maxItems; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const bx  = MARGIN + col * (bw + gap);
      const by  = this.y - row * (bh + gap);
      this.drawStatBox(bx, by, bw, bh, items[i].label, items[i].value, items[i].yoy);
    }

    this.y -= rows * (bh + gap) + 12;
  }

  // ── Narrative ─────────────────────────────────────────────────────────────────

  private drawNarrative(text: string) {
    this.drawSectionTitle('MARKET COMMENTARY');
    const lineH = 14;
    const words = text.split(/\s+/);
    let line    = '';

    for (const word of words) {
      if (this.y < FOOTER_H + 20) break;
      const test = line ? `${line} ${word}` : word;
      if (this.regular.widthOfTextAtSize(test, 8.5) > CONTENT_W && line) {
        this.page.drawText(line, { x: MARGIN, y: this.y, size: 8.5, font: this.regular, color: EV_DARK });
        line   = word;
        this.y -= lineH;
      } else {
        line = test;
      }
    }
    if (line && this.y >= FOOTER_H + 20) {
      this.page.drawText(line, { x: MARGIN, y: this.y, size: 8.5, font: this.regular, color: EV_DARK });
      this.y -= lineH;
    }
    this.y -= 16;
  }

  // ── Price range table ──────────────────────────────────────────────────────────

  private drawPriceRanges(rows: PriceRangeRow[]) {
    if (this.y < FOOTER_H + 60) return;
    this.drawSectionTitle('ACTIVITY BY PRICE RANGE');

    const rowH  = 19;
    const col1W = CONTENT_W * 0.52;
    const col2W = CONTENT_W * 0.24;

    // Header row
    this.page.drawRectangle({ x: MARGIN, y: this.y - rowH, width: CONTENT_W, height: rowH, color: EV_BLACK });
    this.page.drawText('PRICE RANGE',  { x: MARGIN + 8,           y: this.y - 12, size: 7, font: this.bold,    color: EV_WHITE });
    this.page.drawText('CLOSED SALES', { x: MARGIN + col1W + 8,   y: this.y - 12, size: 7, font: this.bold,    color: EV_WHITE });
    this.page.drawText('% OF TOTAL',   { x: MARGIN + col1W + col2W + 8, y: this.y - 12, size: 7, font: this.bold, color: EV_WHITE });
    this.y -= rowH;

    rows.forEach((row, idx) => {
      if (this.y < FOOTER_H + 20) return;
      this.page.drawRectangle({
        x: MARGIN, y: this.y - rowH, width: CONTENT_W, height: rowH,
        color: idx % 2 === 0 ? EV_LIGHT : EV_WHITE,
      });
      this.page.drawText(row.range,         { x: MARGIN + 8,           y: this.y - 12, size: 8, font: this.regular, color: EV_DARK });
      this.page.drawText(String(row.count), { x: MARGIN + col1W + 8,   y: this.y - 12, size: 8, font: this.bold,    color: EV_DARK });
      if (row.pctOfTotal != null) {
        this.page.drawText(`${row.pctOfTotal.toFixed(1)}%`, { x: MARGIN + col1W + col2W + 8, y: this.y - 12, size: 8, font: this.regular, color: EV_GRAY });
      }
      this.y -= rowH;
    });
    this.y -= 16;
  }

  // ── Footer ─────────────────────────────────────────────────────────────────────

  private drawFooter(f: MarketReportFields) {
    // Gold separator
    this.page.drawRectangle({ x: 0, y: FOOTER_H - 2, width: PAGE_W, height: 2.5, color: EV_GOLD });

    const ay = FOOTER_H - 16;

    if (f.agentName) {
      this.page.drawText(f.agentName, { x: MARGIN, y: ay, size: 9, font: this.bold, color: EV_DARK });
    }

    const contact: string[] = [];
    if (f.agentTitle)   contact.push(f.agentTitle);
    if (f.agentPhone)   contact.push(f.agentPhone);
    if (f.agentEmail)   contact.push(f.agentEmail);
    if (f.agentLicense) contact.push(`Lic. ${f.agentLicense}`);
    if (contact.length) {
      this.page.drawText(contact.join('  |  '), { x: MARGIN, y: ay - 13, size: 7, font: this.regular, color: EV_GRAY });
    }

    if (f.officeName) {
      this.page.drawText(f.officeName, { x: MARGIN, y: ay - 26, size: 7, font: this.regular, color: EV_GRAY });
    }
    if (f.officeAddress) {
      this.page.drawText(f.officeAddress, { x: MARGIN, y: ay - 38, size: 6.5, font: this.regular, color: rgb(0.6, 0.6, 0.6) });
    }

    // E&V branding right
    const brand = 'ENGEL & VÖLKERS';
    const bw    = this.bold.widthOfTextAtSize(brand, 11);
    this.page.drawText(brand, { x: PAGE_W - MARGIN - bw, y: ay, size: 11, font: this.bold, color: EV_BLACK });
    const sub  = 'Real Estate Professional';
    const sw   = this.regular.widthOfTextAtSize(sub, 7);
    this.page.drawText(sub, { x: PAGE_W - MARGIN - sw, y: ay - 13, size: 7, font: this.regular, color: EV_GRAY });

    // Bottom black bar
    this.page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: 18, color: EV_BLACK });
    this.page.drawText(
      '© Engel & Völkers. Information deemed reliable but not guaranteed. Equal Housing Opportunity.',
      { x: MARGIN, y: 6, size: 5.5, font: this.regular, color: rgb(0.6, 0.6, 0.6) },
    );
  }

  // ── Build ──────────────────────────────────────────────────────────────────────

  async build(fields: MarketReportFields): Promise<Uint8Array> {
    await this.init();
    this.drawHeader(fields);
    this.drawSectionTitle('MARKET OVERVIEW');
    this.drawStatsGrid(fields);
    if (fields.narrative)                 this.drawNarrative(fields.narrative);
    if (fields.priceRanges?.length)       this.drawPriceRanges(fields.priceRanges);
    this.drawFooter(fields);
    return this.doc.save();
  }
}

// ─── Public API ────────────────────────────────────────────────────────────────

export async function generateMarketReportPdf(fields: MarketReportFields): Promise<Buffer> {
  const bytes = await new EVMarketReportBuilder().build(fields);
  return Buffer.from(bytes);
}
