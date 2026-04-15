import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const DB_PATH = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.resolve(__dirname, '../../data/offers.db');

// Ensure the data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── Migrations ───────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS offers (
    id          TEXT PRIMARY KEY,
    name        TEXT,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'draft',
    form_type   TEXT NOT NULL DEFAULT 'OTP',
    fields      TEXT NOT NULL DEFAULT '{}',
    metadata    TEXT,
    notes       TEXT
  );

  CREATE TABLE IF NOT EXISTS templates (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT,
    created_at  TEXT NOT NULL,
    form_type   TEXT NOT NULL DEFAULT 'OTP',
    fields      TEXT NOT NULL DEFAULT '{}',
    tags        TEXT
  );

  CREATE TABLE IF NOT EXISTS documents (
    id          TEXT PRIMARY KEY,
    offer_id    TEXT NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
    version     INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL,
    pdf_data    BLOB,
    status      TEXT NOT NULL DEFAULT 'draft',
    watermarked INTEGER NOT NULL DEFAULT 1,
    UNIQUE(offer_id, version)
  );

  CREATE TABLE IF NOT EXISTS market_reports (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    fields      TEXT NOT NULL DEFAULT '{}'
  );

  CREATE TABLE IF NOT EXISTS market_report_templates (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT,
    created_at  TEXT NOT NULL,
    fields      TEXT NOT NULL DEFAULT '{}',
    tags        TEXT
  );
`);

// ─── Offer helpers ────────────────────────────────────────────────────────────

export const offerQueries = {
  insert: db.prepare(`
    INSERT INTO offers (id, name, created_at, updated_at, status, form_type, fields, metadata, notes)
    VALUES (@id, @name, @createdAt, @updatedAt, @status, @formType, @fields, @metadata, @notes)
  `),

  update: db.prepare(`
    UPDATE offers
    SET name = @name, updated_at = @updatedAt, status = @status,
        fields = @fields, metadata = @metadata, notes = @notes
    WHERE id = @id
  `),

  findById: db.prepare(`SELECT * FROM offers WHERE id = ?`),

  findAll: db.prepare(`SELECT * FROM offers ORDER BY updated_at DESC`),

  delete: db.prepare(`DELETE FROM offers WHERE id = ?`),
};

// ─── Template helpers ─────────────────────────────────────────────────────────

export const templateQueries = {
  insert: db.prepare(`
    INSERT INTO templates (id, name, description, created_at, form_type, fields, tags)
    VALUES (@id, @name, @description, @createdAt, @formType, @fields, @tags)
  `),

  findAll: db.prepare(`SELECT * FROM templates ORDER BY created_at DESC`),

  findById: db.prepare(`SELECT * FROM templates WHERE id = ?`),

  delete: db.prepare(`DELETE FROM templates WHERE id = ?`),
};

// ─── Document helpers ─────────────────────────────────────────────────────────

export const documentQueries = {
  insert: db.prepare(`
    INSERT INTO documents (id, offer_id, version, created_at, pdf_data, status, watermarked)
    VALUES (@id, @offerId, @version, @createdAt, @pdfData, @status, @watermarked)
  `),

  findByOfferId: db.prepare(`
    SELECT id, offer_id, version, created_at, status, watermarked
    FROM documents WHERE offer_id = ? ORDER BY version DESC
  `),

  findById: db.prepare(`SELECT * FROM documents WHERE id = ?`),

  getLatestByOfferId: db.prepare(`
    SELECT * FROM documents WHERE offer_id = ? ORDER BY version DESC LIMIT 1
  `),

  getNextVersion: db.prepare(`
    SELECT COALESCE(MAX(version), 0) + 1 AS next FROM documents WHERE offer_id = ?
  `),
};

// ─── Market Report helpers ────────────────────────────────────────────────────

export const marketReportQueries = {
  insert: db.prepare(`
    INSERT INTO market_reports (id, name, created_at, updated_at, fields)
    VALUES (@id, @name, @createdAt, @updatedAt, @fields)
  `),

  update: db.prepare(`
    UPDATE market_reports SET name = @name, updated_at = @updatedAt, fields = @fields WHERE id = @id
  `),

  findAll: db.prepare(`SELECT * FROM market_reports ORDER BY updated_at DESC`),

  findById: db.prepare(`SELECT * FROM market_reports WHERE id = ?`),

  delete: db.prepare(`DELETE FROM market_reports WHERE id = ?`),
};

// ─── Market Report Template helpers ──────────────────────────────────────────

export const marketReportTemplateQueries = {
  insert: db.prepare(`
    INSERT INTO market_report_templates (id, name, description, created_at, fields, tags)
    VALUES (@id, @name, @description, @createdAt, @fields, @tags)
  `),

  findAll: db.prepare(`SELECT * FROM market_report_templates ORDER BY created_at DESC`),

  findById: db.prepare(`SELECT * FROM market_report_templates WHERE id = ?`),

  delete: db.prepare(`DELETE FROM market_report_templates WHERE id = ?`),
};

export default db;
