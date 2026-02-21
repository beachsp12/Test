/**
 * Form Template persistence — stores uploaded GBBREB PDFs and their field mappings.
 * A "form template" is the blank PDF + the mapping JSON that tells fillPdf()
 * how to populate it from an OfferFields object.
 */

import Database from 'better-sqlite3';
import db from './database';
import type { FieldMapping } from './pdfMapper';

// Run migration to add the form_templates table if it doesn't exist.
db.exec(`
  CREATE TABLE IF NOT EXISTS form_templates (
    id           TEXT PRIMARY KEY,
    form_type    TEXT NOT NULL UNIQUE,
    form_title   TEXT NOT NULL,
    form_version TEXT,
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL,
    pdf_data     BLOB NOT NULL,
    mappings     TEXT NOT NULL DEFAULT '[]'
  );
`);

export interface FormTemplateRow {
  id: string;
  form_type: string;
  form_title: string;
  form_version: string | null;
  created_at: string;
  updated_at: string;
  pdf_data: Buffer;
  mappings: string;
}

export interface FormTemplateRecord {
  id: string;
  formType: string;
  formTitle: string;
  formVersion?: string;
  createdAt: string;
  updatedAt: string;
  mappings: FieldMapping[];
}

export const formTemplateQueries = {
  upsert: (db as Database.Database).prepare(`
    INSERT INTO form_templates (id, form_type, form_title, form_version, created_at, updated_at, pdf_data, mappings)
    VALUES (@id, @formType, @formTitle, @formVersion, @createdAt, @updatedAt, @pdfData, @mappings)
    ON CONFLICT(form_type) DO UPDATE SET
      form_title   = excluded.form_title,
      form_version = excluded.form_version,
      updated_at   = excluded.updated_at,
      pdf_data     = excluded.pdf_data,
      mappings     = excluded.mappings
  `),

  findByFormType: (db as Database.Database).prepare(
    `SELECT * FROM form_templates WHERE form_type = ?`
  ),

  findAll: (db as Database.Database).prepare(
    `SELECT id, form_type, form_title, form_version, created_at, updated_at FROM form_templates`
  ),

  updateMappings: (db as Database.Database).prepare(
    `UPDATE form_templates SET mappings = @mappings, updated_at = @updatedAt WHERE form_type = @formType`
  ),

  delete: (db as Database.Database).prepare(
    `DELETE FROM form_templates WHERE form_type = ?`
  ),
};
