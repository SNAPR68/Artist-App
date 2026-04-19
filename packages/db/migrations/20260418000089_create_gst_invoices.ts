import type { Knex } from 'knex';

/**
 * GST invoices — tax-compliant invoice generation for agencies.
 *
 * Why this is a moat:
 * - Indian CAs need GSTR-1 exports, HSN/SAC codes, CGST/SGST/IGST splits.
 * - Once an agency has issued 20+ GST invoices with sequential numbering,
 *   their CA won't accept a switch to a new system mid-year.
 *
 * Storage:
 * - workspace_gst_settings: one row per workspace (GSTIN, legal name, SAC)
 * - gst_invoices: immutable once issued (number is sequential per workspace per FY)
 * - gst_invoice_line_items: denormalized so invoice stays valid if booking changes
 */
export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS workspace_gst_settings (
      workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
      legal_name TEXT NOT NULL,
      gstin TEXT NULL,
      pan TEXT NULL,
      state_code TEXT NULL,
      address_line1 TEXT NULL,
      address_line2 TEXT NULL,
      city TEXT NULL,
      state TEXT NULL,
      pincode TEXT NULL,
      default_sac_code TEXT NOT NULL DEFAULT '998554',
      default_tax_rate NUMERIC(5,2) NOT NULL DEFAULT 18.00,
      invoice_prefix TEXT NOT NULL DEFAULT 'INV',
      invoice_counter INTEGER NOT NULL DEFAULT 0,
      financial_year TEXT NOT NULL DEFAULT '2026-27',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS gst_invoices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      invoice_number TEXT NOT NULL,
      financial_year TEXT NOT NULL,
      issue_date DATE NOT NULL,
      due_date DATE NULL,

      -- Supplier snapshot (frozen at issue time)
      supplier_legal_name TEXT NOT NULL,
      supplier_gstin TEXT NULL,
      supplier_pan TEXT NULL,
      supplier_address TEXT NULL,
      supplier_state_code TEXT NULL,

      -- Recipient
      recipient_name TEXT NOT NULL,
      recipient_gstin TEXT NULL,
      recipient_address TEXT NULL,
      recipient_state_code TEXT NULL,
      recipient_email TEXT NULL,
      recipient_phone TEXT NULL,

      -- Link to deal (optional)
      workspace_event_id UUID NULL REFERENCES workspace_events(id) ON DELETE SET NULL,
      booking_id UUID NULL REFERENCES bookings(id) ON DELETE SET NULL,

      -- Amounts (paise)
      subtotal_paise BIGINT NOT NULL DEFAULT 0,
      cgst_paise BIGINT NOT NULL DEFAULT 0,
      sgst_paise BIGINT NOT NULL DEFAULT 0,
      igst_paise BIGINT NOT NULL DEFAULT 0,
      total_paise BIGINT NOT NULL DEFAULT 0,

      -- Tax mode: intra-state (CGST+SGST) or inter-state (IGST)
      tax_mode TEXT NOT NULL DEFAULT 'intra' CHECK (tax_mode IN ('intra','inter')),

      status TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('draft','issued','paid','cancelled')),
      notes TEXT NULL,
      created_by UUID NOT NULL REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

      UNIQUE(workspace_id, invoice_number)
    );
  `);
  await knex.raw(`CREATE INDEX IF NOT EXISTS gst_invoices_workspace_fy_idx ON gst_invoices(workspace_id, financial_year);`);
  await knex.raw(`CREATE INDEX IF NOT EXISTS gst_invoices_issue_date_idx ON gst_invoices(workspace_id, issue_date DESC);`);

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS gst_invoice_line_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      invoice_id UUID NOT NULL REFERENCES gst_invoices(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      sac_code TEXT NOT NULL DEFAULT '998554',
      quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
      unit_price_paise BIGINT NOT NULL,
      tax_rate NUMERIC(5,2) NOT NULL DEFAULT 18.00,
      amount_paise BIGINT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await knex.raw(`CREATE INDEX IF NOT EXISTS gst_invoice_line_items_invoice_idx ON gst_invoice_line_items(invoice_id);`);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP TABLE IF EXISTS gst_invoice_line_items;');
  await knex.raw('DROP TABLE IF EXISTS gst_invoices;');
  await knex.raw('DROP TABLE IF EXISTS workspace_gst_settings;');
}
