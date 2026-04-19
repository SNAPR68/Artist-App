import { db } from '../../infrastructure/database.js';

export interface GstSettings {
  workspace_id: string;
  legal_name: string;
  gstin: string | null;
  pan: string | null;
  state_code: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  default_sac_code: string;
  default_tax_rate: number;
  invoice_prefix: string;
  invoice_counter: number;
  financial_year: string;
}

export interface GstInvoice {
  id: string;
  workspace_id: string;
  invoice_number: string;
  financial_year: string;
  issue_date: string;
  due_date: string | null;
  supplier_legal_name: string;
  supplier_gstin: string | null;
  supplier_pan: string | null;
  supplier_address: string | null;
  supplier_state_code: string | null;
  recipient_name: string;
  recipient_gstin: string | null;
  recipient_address: string | null;
  recipient_state_code: string | null;
  recipient_email: string | null;
  recipient_phone: string | null;
  workspace_event_id: string | null;
  booking_id: string | null;
  subtotal_paise: number;
  cgst_paise: number;
  sgst_paise: number;
  igst_paise: number;
  total_paise: number;
  tax_mode: 'intra' | 'inter';
  status: 'draft' | 'issued' | 'paid' | 'cancelled';
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface GstLineItem {
  id: string;
  invoice_id: string;
  description: string;
  sac_code: string;
  quantity: number;
  unit_price_paise: number;
  tax_rate: number;
  amount_paise: number;
  sort_order: number;
}

export interface CreateInvoiceInput {
  workspace_id: string;
  created_by: string;
  issue_date?: string;
  due_date?: string | null;
  recipient_name: string;
  recipient_gstin?: string | null;
  recipient_address?: string | null;
  recipient_state_code?: string | null;
  recipient_email?: string | null;
  recipient_phone?: string | null;
  workspace_event_id?: string | null;
  booking_id?: string | null;
  notes?: string | null;
  line_items: Array<{
    description: string;
    sac_code?: string;
    quantity?: number;
    unit_price_paise: number;
    tax_rate?: number;
  }>;
}

function currentFinancialYear(date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth(); // 0-based
  // Indian FY: Apr (3) → Mar (2) next year
  if (m >= 3) return `${y}-${String((y + 1) % 100).padStart(2, '0')}`;
  return `${y - 1}-${String(y % 100).padStart(2, '0')}`;
}

class GstInvoiceService {
  async getSettings(workspaceId: string): Promise<GstSettings | null> {
    const row = await db<GstSettings>('workspace_gst_settings').where({ workspace_id: workspaceId }).first();
    return row ?? null;
  }

  async upsertSettings(
    workspaceId: string,
    input: Partial<Omit<GstSettings, 'workspace_id' | 'invoice_counter'>>,
  ): Promise<GstSettings> {
    const existing = await this.getSettings(workspaceId);
    if (!existing) {
      const [row] = await db<GstSettings>('workspace_gst_settings')
        .insert({
          workspace_id: workspaceId,
          legal_name: input.legal_name ?? 'Unnamed Agency',
          gstin: input.gstin ?? null,
          pan: input.pan ?? null,
          state_code: input.state_code ?? null,
          address_line1: input.address_line1 ?? null,
          address_line2: input.address_line2 ?? null,
          city: input.city ?? null,
          state: input.state ?? null,
          pincode: input.pincode ?? null,
          default_sac_code: input.default_sac_code ?? '998554',
          default_tax_rate: input.default_tax_rate ?? 18,
          invoice_prefix: input.invoice_prefix ?? 'INV',
          financial_year: input.financial_year ?? currentFinancialYear(),
        })
        .returning('*');
      return row;
    }
    const patch: Record<string, unknown> = { updated_at: db.fn.now() };
    for (const k of [
      'legal_name',
      'gstin',
      'pan',
      'state_code',
      'address_line1',
      'address_line2',
      'city',
      'state',
      'pincode',
      'default_sac_code',
      'default_tax_rate',
      'invoice_prefix',
      'financial_year',
    ] as const) {
      if (k in input) patch[k] = input[k as keyof typeof input] ?? null;
    }
    const [row] = await db<GstSettings>('workspace_gst_settings')
      .where({ workspace_id: workspaceId })
      .update(patch)
      .returning('*');
    return row;
  }

  async createInvoice(input: CreateInvoiceInput): Promise<{ invoice: GstInvoice; line_items: GstLineItem[] }> {
    if (!input.line_items || input.line_items.length === 0) {
      throw new Error('At least one line item is required');
    }
    const settings = await this.getSettings(input.workspace_id);
    if (!settings) {
      throw new Error('Configure GST settings before issuing invoices');
    }

    const taxMode: 'intra' | 'inter' =
      settings.state_code && input.recipient_state_code && settings.state_code === input.recipient_state_code
        ? 'intra'
        : 'inter';

    // Compute totals (tax per line, summed)
    let subtotal = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;
    const lineItemsPrepared = input.line_items.map((li, idx) => {
      const qty = li.quantity ?? 1;
      const rate = Number(li.tax_rate ?? settings.default_tax_rate);
      const amount = Math.round(qty * li.unit_price_paise);
      subtotal += amount;
      const tax = Math.round((amount * rate) / 100);
      if (taxMode === 'intra') {
        cgst += Math.round(tax / 2);
        sgst += tax - Math.round(tax / 2);
      } else {
        igst += tax;
      }
      return {
        description: li.description,
        sac_code: li.sac_code ?? settings.default_sac_code,
        quantity: qty,
        unit_price_paise: li.unit_price_paise,
        tax_rate: rate,
        amount_paise: amount,
        sort_order: idx,
      };
    });
    const total = subtotal + cgst + sgst + igst;

    return db.transaction(async (trx) => {
      // Atomic counter increment with FY boundary reset
      const activeFY = currentFinancialYear();
      const current = await trx<GstSettings>('workspace_gst_settings')
        .where({ workspace_id: input.workspace_id })
        .first();
      const isNewFY = current && current.financial_year !== activeFY;
      const [updated] = await trx<GstSettings>('workspace_gst_settings')
        .where({ workspace_id: input.workspace_id })
        .update(isNewFY
          ? { financial_year: activeFY, invoice_counter: 1 }
          : { invoice_counter: trx.raw('invoice_counter + 1') as unknown as number })
        .returning(['invoice_counter', 'invoice_prefix', 'financial_year']);

      const invoiceNumber = `${updated.invoice_prefix}/${updated.financial_year}/${String(
        updated.invoice_counter,
      ).padStart(4, '0')}`;

      const [invoice] = await trx<GstInvoice>('gst_invoices')
        .insert({
          workspace_id: input.workspace_id,
          invoice_number: invoiceNumber,
          financial_year: updated.financial_year,
          issue_date: input.issue_date ?? new Date().toISOString().slice(0, 10),
          due_date: input.due_date ?? null,
          supplier_legal_name: settings.legal_name,
          supplier_gstin: settings.gstin,
          supplier_pan: settings.pan,
          supplier_address: [settings.address_line1, settings.address_line2, settings.city, settings.state, settings.pincode]
            .filter(Boolean)
            .join(', ') || null,
          supplier_state_code: settings.state_code,
          recipient_name: input.recipient_name,
          recipient_gstin: input.recipient_gstin ?? null,
          recipient_address: input.recipient_address ?? null,
          recipient_state_code: input.recipient_state_code ?? null,
          recipient_email: input.recipient_email ?? null,
          recipient_phone: input.recipient_phone ?? null,
          workspace_event_id: input.workspace_event_id ?? null,
          booking_id: input.booking_id ?? null,
          subtotal_paise: subtotal,
          cgst_paise: cgst,
          sgst_paise: sgst,
          igst_paise: igst,
          total_paise: total,
          tax_mode: taxMode,
          status: 'issued',
          notes: input.notes ?? null,
          created_by: input.created_by,
        })
        .returning('*');

      const lineItems = await trx<GstLineItem>('gst_invoice_line_items')
        .insert(lineItemsPrepared.map((li) => ({ ...li, invoice_id: invoice.id })))
        .returning('*');

      return { invoice, line_items: lineItems };
    });
  }

  async listInvoices(
    workspaceId: string,
    opts: { financial_year?: string; status?: string; page?: number; per_page?: number } = {},
  ): Promise<{ rows: GstInvoice[]; total: number; page: number; per_page: number }> {
    const page = Math.max(1, opts.page ?? 1);
    const per = Math.min(100, Math.max(1, opts.per_page ?? 20));
    const q = db<GstInvoice>('gst_invoices').where({ workspace_id: workspaceId });
    if (opts.financial_year) q.andWhere('financial_year', opts.financial_year);
    if (opts.status) q.andWhere('status', opts.status);
    const [{ count }] = await q.clone().clearSelect().clearOrder().count<{ count: string }[]>('id as count');
    const rows = await q.orderBy('issue_date', 'desc').orderBy('invoice_number', 'desc').limit(per).offset((page - 1) * per);
    return { rows, total: Number(count), page, per_page: per };
  }

  async getInvoice(id: string, workspaceId: string): Promise<{ invoice: GstInvoice; line_items: GstLineItem[] } | null> {
    const invoice = await db<GstInvoice>('gst_invoices').where({ id, workspace_id: workspaceId }).first();
    if (!invoice) return null;
    const line_items = await db<GstLineItem>('gst_invoice_line_items').where({ invoice_id: id }).orderBy('sort_order', 'asc');
    return { invoice, line_items };
  }

  async markPaid(id: string, workspaceId: string): Promise<GstInvoice | null> {
    const [row] = await db<GstInvoice>('gst_invoices')
      .where({ id, workspace_id: workspaceId })
      .update({ status: 'paid', updated_at: db.fn.now() })
      .returning('*');
    return row ?? null;
  }

  async cancel(id: string, workspaceId: string): Promise<GstInvoice | null> {
    const [row] = await db<GstInvoice>('gst_invoices')
      .where({ id, workspace_id: workspaceId })
      .update({ status: 'cancelled', updated_at: db.fn.now() })
      .returning('*');
    return row ?? null;
  }

  /**
   * Tally-compatible CSV export.
   * Tally XML import accepts CSV with these canonical columns per voucher row.
   * Also importable into Zoho Books via their "Import Invoices" flow.
   */
  async tallyCsv(workspaceId: string, financialYear: string): Promise<string> {
    const invoices = await db<GstInvoice>('gst_invoices')
      .where({ workspace_id: workspaceId, financial_year: financialYear })
      .whereNot('status', 'cancelled')
      .orderBy('issue_date', 'asc');

    const headers = [
      'Invoice Number',
      'Invoice Date',
      'Customer Name',
      'Customer GSTIN',
      'Place of Supply',
      'Taxable Value (INR)',
      'CGST (INR)',
      'SGST (INR)',
      'IGST (INR)',
      'Total (INR)',
      'Tax Mode',
      'Status',
      'Voucher Type',
    ];
    const esc = (v: unknown): string => {
      const s = v == null ? '' : String(v);
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const rupees = (p: number) => (p / 100).toFixed(2);

    const lines: string[] = [headers.join(',')];
    for (const inv of invoices) {
      lines.push(
        [
          inv.invoice_number,
          inv.issue_date,
          inv.recipient_name,
          inv.recipient_gstin ?? '',
          inv.recipient_state_code ?? '',
          rupees(inv.subtotal_paise),
          rupees(inv.cgst_paise),
          rupees(inv.sgst_paise),
          rupees(inv.igst_paise),
          rupees(inv.total_paise),
          inv.tax_mode === 'intra' ? 'CGST+SGST' : 'IGST',
          inv.status,
          'Sales',
        ]
          .map(esc)
          .join(','),
      );
    }
    return lines.join('\r\n');
  }
}

export const gstInvoiceService = new GstInvoiceService();
