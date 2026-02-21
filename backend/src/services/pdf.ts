import {
  PDFDocument,
  rgb,
  StandardFonts,
  PDFPage,
  PDFFont,
} from 'pdf-lib';
import type { OfferFields } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

type Color = ReturnType<typeof rgb>;

interface DrawOptions {
  x: number;
  y: number;
  size?: number;
  color?: Color;
  font?: PDFFont;
  maxWidth?: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_MARGIN = 50;
const LINE_HEIGHT = 16;
const LABEL_SIZE = 8;
const VALUE_SIZE = 10;
const SECTION_SIZE = 11;
const TITLE_SIZE = 14;

const DARK = rgb(0.1, 0.1, 0.1);
const GRAY = rgb(0.45, 0.45, 0.45);
const BRAND = rgb(0.04, 0.52, 0.78);
const LIGHT_GRAY = rgb(0.92, 0.92, 0.92);

// ─── Helper ───────────────────────────────────────────────────────────────────

function formatCurrency(val: number | null | undefined): string {
  if (val == null) return '_________________';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val);
}

function formatDate(val: string | null | undefined): string {
  if (!val) return '_________________';
  try {
    return new Date(val + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return val;
  }
}

function blank(val: unknown): string {
  if (val === null || val === undefined || val === '') return '_________________';
  if (Array.isArray(val)) return val.length > 0 ? val.join(', ') : '_________________';
  return String(val);
}

// ─── PDF Builder ──────────────────────────────────────────────────────────────

class OTPBuilder {
  private doc!: PDFDocument;
  private page!: PDFPage;
  private regular!: PDFFont;
  private bold!: PDFFont;
  private pageWidth!: number;
  private pageHeight!: number;
  private y!: number;
  private pages: PDFPage[] = [];

  async init() {
    this.doc = await PDFDocument.create();
    this.regular = await this.doc.embedFont(StandardFonts.Helvetica);
    this.bold = await this.doc.embedFont(StandardFonts.HelveticaBold);
    this.addPage();
  }

  private addPage() {
    this.page = this.doc.addPage([612, 792]); // US Letter
    this.pageWidth = this.page.getWidth();
    this.pageHeight = this.page.getHeight();
    this.y = this.pageHeight - PAGE_MARGIN;
    this.pages.push(this.page);
  }

  private checkPageBreak(needed = LINE_HEIGHT * 3) {
    if (this.y < PAGE_MARGIN + needed) {
      this.addPage();
    }
  }

  private drawText(text: string, opts: DrawOptions) {
    const font = opts.font ?? this.regular;
    const size = opts.size ?? VALUE_SIZE;
    const color = opts.color ?? DARK;

    if (opts.maxWidth) {
      // Word-wrap
      const words = text.split(' ');
      let line = '';
      let currentY = opts.y;

      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        const w = font.widthOfTextAtSize(test, size);
        if (w > opts.maxWidth && line) {
          this.page.drawText(line, { x: opts.x, y: currentY, size, font, color });
          line = word;
          currentY -= LINE_HEIGHT;
          this.y = Math.min(this.y, currentY);
        } else {
          line = test;
        }
      }
      if (line) {
        this.page.drawText(line, { x: opts.x, y: currentY, size, font, color });
      }
    } else {
      this.page.drawText(text, {
        x: opts.x,
        y: opts.y,
        size,
        font,
        color,
      });
    }
  }

  private drawLine(y: number, x1 = PAGE_MARGIN, x2?: number) {
    const endX = x2 ?? this.pageWidth - PAGE_MARGIN;
    this.page.drawLine({
      start: { x: x1, y },
      end: { x: endX, y },
      thickness: 0.5,
      color: LIGHT_GRAY,
    });
  }

  private drawSectionHeader(title: string) {
    this.checkPageBreak(LINE_HEIGHT * 4);
    this.y -= LINE_HEIGHT * 0.5;

    // Background bar
    this.page.drawRectangle({
      x: PAGE_MARGIN - 5,
      y: this.y - 4,
      width: this.pageWidth - PAGE_MARGIN * 2 + 10,
      height: LINE_HEIGHT + 4,
      color: BRAND,
    });

    this.drawText(title.toUpperCase(), {
      x: PAGE_MARGIN,
      y: this.y,
      size: SECTION_SIZE,
      font: this.bold,
      color: rgb(1, 1, 1),
    });

    this.y -= LINE_HEIGHT * 1.6;
  }

  private drawField(label: string, value: string, indent = 0) {
    this.checkPageBreak(LINE_HEIGHT * 3);
    const x = PAGE_MARGIN + indent;
    const maxW = this.pageWidth - PAGE_MARGIN * 2 - indent - 10;

    this.drawText(label.toUpperCase(), {
      x,
      y: this.y,
      size: LABEL_SIZE,
      color: GRAY,
      font: this.bold,
    });
    this.y -= LINE_HEIGHT * 0.9;

    this.drawText(value, {
      x,
      y: this.y,
      size: VALUE_SIZE,
      font: this.regular,
      color: DARK,
      maxWidth: maxW,
    });
    this.y -= LINE_HEIGHT * 1.4;
    this.drawLine(this.y + LINE_HEIGHT * 0.2);
    this.y -= LINE_HEIGHT * 0.4;
  }

  private drawTwoFields(
    label1: string, val1: string,
    label2: string, val2: string,
  ) {
    this.checkPageBreak(LINE_HEIGHT * 3);
    const colW = (this.pageWidth - PAGE_MARGIN * 2 - 20) / 2;
    const x2 = PAGE_MARGIN + colW + 20;

    this.drawText(label1.toUpperCase(), {
      x: PAGE_MARGIN, y: this.y, size: LABEL_SIZE, color: GRAY, font: this.bold,
    });
    this.drawText(label2.toUpperCase(), {
      x: x2, y: this.y, size: LABEL_SIZE, color: GRAY, font: this.bold,
    });
    this.y -= LINE_HEIGHT * 0.9;

    this.drawText(val1, { x: PAGE_MARGIN, y: this.y, size: VALUE_SIZE, maxWidth: colW });
    this.drawText(val2, { x: x2, y: this.y, size: VALUE_SIZE, maxWidth: colW });
    this.y -= LINE_HEIGHT * 1.4;
    this.drawLine(this.y + LINE_HEIGHT * 0.2);
    this.y -= LINE_HEIGHT * 0.4;
  }

  private drawSignatureLine(role: string, x: number, lineW: number) {
    this.page.drawLine({
      start: { x, y: this.y },
      end: { x: x + lineW, y: this.y },
      thickness: 0.8,
      color: DARK,
    });
    this.y -= LINE_HEIGHT * 0.7;
    this.drawText(`${role} Signature`, {
      x, y: this.y, size: LABEL_SIZE, color: GRAY, font: this.bold,
    });
    this.drawText('Date', {
      x: x + lineW - 60, y: this.y, size: LABEL_SIZE, color: GRAY, font: this.bold,
    });
  }

  async build(fields: OfferFields, isDraft = true): Promise<Uint8Array> {
    await this.init();
    const p = fields.property ?? {};
    const b = fields.buyer ?? {};
    const s = fields.seller ?? {};
    const t = fields.terms ?? {};
    const f = fields.financing ?? {};
    const c = fields.contingencies ?? {};

    // ── Title ──────────────────────────────────────────────────────────────
    this.y -= 10;
    this.drawText('GREATER BOSTON REAL ESTATE BOARD', {
      x: PAGE_MARGIN, y: this.y, size: 9, font: this.bold, color: GRAY,
    });
    this.y -= LINE_HEIGHT;

    this.drawText('OFFER TO PURCHASE REAL ESTATE', {
      x: PAGE_MARGIN, y: this.y, size: TITLE_SIZE, font: this.bold, color: BRAND,
    });
    this.y -= LINE_HEIGHT * 0.5;

    if (isDraft) {
      this.drawText('[DRAFT – NOT FOR EXECUTION]', {
        x: PAGE_MARGIN, y: this.y, size: 9, font: this.bold, color: rgb(0.8, 0.2, 0.2),
      });
      this.y -= LINE_HEIGHT * 0.4;
    }

    this.drawLine(this.y);
    this.y -= LINE_HEIGHT;

    // ── Property ──────────────────────────────────────────────────────────
    this.drawSectionHeader('1. Property Information');

    const address = [
      p.streetAddress ?? '',
      p.unit ? `Unit ${p.unit}` : '',
    ].filter(Boolean).join(', ');

    this.drawField('Property Address', blank(address || p.streetAddress));

    this.drawTwoFields(
      'City / Town', blank(p.city),
      'State', blank(p.state ?? 'MA'),
    );
    this.drawTwoFields(
      'ZIP Code', blank(p.zip),
      'County', blank(p.county),
    );
    this.drawTwoFields(
      'MLS #', blank(p.mlsNumber),
      'Property Type', blank(p.propertyType),
    );

    // ── Buyer ─────────────────────────────────────────────────────────────
    this.drawSectionHeader('2. Buyer Information');

    this.drawField('Buyer Name(s)', blank(b.names));
    this.drawTwoFields(
      'Buyer Entity Type', blank(b.entityType ?? 'Individual'),
      'Buyer Current Address', blank(b.address),
    );

    // ── Seller ────────────────────────────────────────────────────────────
    this.drawSectionHeader('3. Seller Information');
    this.drawField('Seller Name(s)', blank(s.names));

    // ── Offer Terms ───────────────────────────────────────────────────────
    this.drawSectionHeader('4. Offer Terms');

    this.drawTwoFields(
      'Purchase Price', formatCurrency(t.purchasePrice),
      'Earnest Money Deposit', formatCurrency(t.earnestMoneyDeposit),
    );
    this.drawTwoFields(
      'Earnest Money Due (days after acceptance)',
      blank(t.earnestMoneyDueDays ?? 3),
      'Closing Date',
      t.closingDate
        ? formatDate(t.closingDate)
        : t.closingDays
          ? `${t.closingDays} days after acceptance`
          : '_________________',
    );
    this.drawTwoFields(
      'Offer Expires',
      t.offerExpirationDate
        ? `${formatDate(t.offerExpirationDate)}${t.offerExpirationTime ? ` at ${t.offerExpirationTime}` : ''}`
        : '_________________',
      'Seller Closing Cost Contribution',
      formatCurrency(t.closingCostContribution ?? 0),
    );

    if (t.personalProperty && t.personalProperty.length > 0) {
      this.drawField('Personal Property Included', t.personalProperty.join(', '));
    }

    // ── Financing ─────────────────────────────────────────────────────────
    this.drawSectionHeader('5. Financing');

    this.drawTwoFields(
      'Financing Type', blank(f.type),
      'Down Payment', f.downPaymentPercent != null ? `${f.downPaymentPercent}%` : '_____',
    );
    this.drawTwoFields(
      'Loan Amount', formatCurrency(f.loanAmount),
      'Lender', blank(f.lenderName),
    );

    // ── Contingencies ─────────────────────────────────────────────────────
    this.drawSectionHeader('6. Contingencies');

    const yesNo = (v: boolean | null | undefined) =>
      v === true ? 'YES' : v === false ? 'NO' : '_____';

    this.drawTwoFields(
      'Financing Contingency', yesNo(c.financingContingency),
      'Financing Deadline (days)', blank(c.financingDeadlineDays),
    );
    this.drawTwoFields(
      'Inspection Contingency', yesNo(c.inspectionContingency),
      'Inspection Deadline (days)', blank(c.inspectionDeadlineDays),
    );
    this.drawTwoFields(
      'Sale of Buyer\'s Property Contingency', yesNo(c.saleContingency),
      'Sale Property Address', blank(c.salePropertyAddress),
    );

    // ── Additional Terms ──────────────────────────────────────────────────
    this.drawSectionHeader('7. Additional Terms & Conditions');

    const addl = fields.additionalTerms
      ? fields.additionalTerms
      : 'None';
    this.drawField('Additional Terms', addl);

    // ── Legal Boilerplate ─────────────────────────────────────────────────
    this.checkPageBreak(LINE_HEIGHT * 10);
    this.y -= LINE_HEIGHT * 0.5;
    this.drawText(
      'This Offer to Purchase is subject to all terms and conditions of the Greater Boston Real Estate Board standard form. ' +
      'Time is of the essence. This offer shall be governed by the laws of the Commonwealth of Massachusetts.',
      {
        x: PAGE_MARGIN,
        y: this.y,
        size: 8,
        color: GRAY,
        maxWidth: this.pageWidth - PAGE_MARGIN * 2,
      },
    );
    this.y -= LINE_HEIGHT * 3;

    // ── Signatures ────────────────────────────────────────────────────────
    this.checkPageBreak(LINE_HEIGHT * 10);
    this.drawSectionHeader('8. Signatures');

    const halfW = (this.pageWidth - PAGE_MARGIN * 2 - 30) / 2;
    this.drawSignatureLine('Buyer', PAGE_MARGIN, halfW);
    this.y -= LINE_HEIGHT * 2;
    this.drawSignatureLine('Buyer', PAGE_MARGIN, halfW);
    this.y -= LINE_HEIGHT * 2;
    this.drawSignatureLine('Seller', PAGE_MARGIN, halfW);
    this.y -= LINE_HEIGHT * 2;
    this.drawSignatureLine('Seller', PAGE_MARGIN, halfW);
    this.y -= LINE_HEIGHT * 2;
    this.drawSignatureLine("Buyer's Agent", PAGE_MARGIN, halfW);
    this.y -= LINE_HEIGHT * 2;
    this.drawSignatureLine("Seller's Agent", PAGE_MARGIN, halfW);

    // ── Footer on all pages ───────────────────────────────────────────────
    const totalPages = this.pages.length;
    this.pages.forEach((pg, i) => {
      const footerY = PAGE_MARGIN - 18;
      pg.drawText(`GBBREB Offer to Purchase  |  Page ${i + 1} of ${totalPages}`, {
        x: PAGE_MARGIN,
        y: footerY,
        size: 7,
        font: this.regular,
        color: GRAY,
      });
      if (isDraft) {
        pg.drawText('DRAFT', {
          x: this.pageWidth / 2 - 60,
          y: this.pageHeight / 2,
          size: 80,
          font: this.bold,
          color: rgb(0.9, 0.9, 0.9),
          opacity: 0.25,
          rotate: { type: 'degrees', angle: 45 },
        });
      }
    });

    return this.doc.save();
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function generateOTPPdf(
  fields: OfferFields,
  isDraft = true,
): Promise<Buffer> {
  const builder = new OTPBuilder();
  const bytes = await builder.build(fields, isDraft);
  return Buffer.from(bytes);
}
