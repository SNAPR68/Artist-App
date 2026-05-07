/**
 * Proposal-with-P&L (2026-05-05) — Proposal repository.
 *
 * Workspace-scoped. Proposals are independent of event_files until the
 * convert-to-event-file step (see service); the optional event_file_id
 * back-link is set at conversion time (or pre-set if EC is building a
 * proposal off an existing event file).
 */
import crypto from 'node:crypto';
import { db } from '../../infrastructure/database.js';
import type {
  CreateProposalInput,
  UpdateProposalInput,
  CreateProposalLineItemInput,
  UpdateProposalLineItemInput,
} from '@artist-booking/shared';

const PROPOSAL_COLUMNS = [
  'id',
  'workspace_id',
  'event_file_id',
  'client_name',
  'client_email',
  'client_phone',
  'event_title',
  'event_date',
  'venue_text',
  'status',
  'version',
  'parent_proposal_id',
  'total_cost_paise',
  'total_sell_paise',
  'margin_pct',
  'valid_until',
  'public_token',
  'sent_at',
  'viewed_at',
  'accepted_at',
  'declined_at',
  'created_by',
  'created_at',
  'updated_at',
];

const LINE_ITEM_COLUMNS = [
  'id',
  'proposal_id',
  'category',
  'description',
  'notes',
  'qty',
  'cost_paise',
  'sell_paise',
  'sort_order',
  'created_at',
  'updated_at',
];

export interface ListProposalsParams {
  workspace_id: string;
  status?: string;
  q?: string;
  page: number;
  per_page: number;
}

export class ProposalRepository {
  async list(params: ListProposalsParams) {
    let query = db('proposals')
      .where({ workspace_id: params.workspace_id })
      .orderBy('created_at', 'desc');

    if (params.status) query = query.where('status', params.status);
    if (params.q) {
      const term = `%${params.q}%`;
      query = query.where((b) =>
        b.where('client_name', 'ilike', term).orWhere('event_title', 'ilike', term),
      );
    }

    const totalRow = await query.clone().clearOrder().count('id as count').first();
    const rows = await query
      .select(PROPOSAL_COLUMNS)
      .offset((params.page - 1) * params.per_page)
      .limit(params.per_page);

    return { data: rows, total: Number(totalRow?.count ?? 0) };
  }

  async findById(id: string, workspaceId: string) {
    const proposal = await db('proposals')
      .where({ id, workspace_id: workspaceId })
      .select(PROPOSAL_COLUMNS)
      .first();
    if (!proposal) return null;

    const lineItems = await db('proposal_line_items')
      .where({ proposal_id: id })
      .orderBy('sort_order', 'asc')
      .orderBy('created_at', 'asc')
      .select(LINE_ITEM_COLUMNS);

    const events = await db('proposal_events')
      .where({ proposal_id: id })
      .orderBy('created_at', 'desc')
      .limit(50)
      .select('id', 'event_type', 'meta', 'actor_user_id', 'created_at');

    return { ...proposal, line_items: lineItems, events };
  }

  async findByPublicToken(token: string) {
    const proposal = await db('proposals')
      .where({ public_token: token })
      .select(PROPOSAL_COLUMNS)
      .first();
    if (!proposal) return null;

    const lineItems = await db('proposal_line_items')
      .where({ proposal_id: proposal.id })
      .orderBy('sort_order', 'asc')
      .orderBy('created_at', 'asc')
      .select(LINE_ITEM_COLUMNS);

    return { ...proposal, line_items: lineItems };
  }

  async create(workspaceId: string, userId: string, input: CreateProposalInput) {
    const [row] = await db('proposals')
      .insert({
        workspace_id: workspaceId,
        created_by: userId,
        client_name: input.client_name,
        client_email: input.client_email || null,
        client_phone: input.client_phone || null,
        event_title: input.event_title,
        event_date: input.event_date || null,
        venue_text: input.venue_text || null,
        event_file_id: input.event_file_id || null,
      })
      .returning(PROPOSAL_COLUMNS);
    return row;
  }

  async update(id: string, workspaceId: string, input: UpdateProposalInput) {
    const patch: Record<string, unknown> = { updated_at: db.fn.now() };
    for (const k of [
      'client_name',
      'client_email',
      'client_phone',
      'event_title',
      'event_date',
      'venue_text',
      'event_file_id',
      'valid_until',
    ] as const) {
      if (input[k] !== undefined) patch[k] = input[k] === '' ? null : input[k];
    }
    const [row] = await db('proposals')
      .where({ id, workspace_id: workspaceId })
      .update(patch)
      .returning(PROPOSAL_COLUMNS);
    return row ?? null;
  }

  async delete(id: string, workspaceId: string) {
    return db('proposals').where({ id, workspace_id: workspaceId, status: 'draft' }).del();
  }

  async addLineItem(proposalId: string, input: CreateProposalLineItemInput) {
    const [row] = await db('proposal_line_items')
      .insert({
        proposal_id: proposalId,
        category: input.category,
        description: input.description,
        notes: input.notes || null,
        qty: input.qty,
        cost_paise: input.cost_paise,
        sell_paise: input.sell_paise,
        sort_order: input.sort_order ?? 0,
      })
      .returning(LINE_ITEM_COLUMNS);
    return row;
  }

  async updateLineItem(
    proposalId: string,
    itemId: string,
    input: UpdateProposalLineItemInput,
  ) {
    const patch: Record<string, unknown> = { updated_at: db.fn.now() };
    for (const k of [
      'category',
      'description',
      'notes',
      'qty',
      'cost_paise',
      'sell_paise',
      'sort_order',
    ] as const) {
      if (input[k] !== undefined) patch[k] = input[k];
    }
    const [row] = await db('proposal_line_items')
      .where({ id: itemId, proposal_id: proposalId })
      .update(patch)
      .returning(LINE_ITEM_COLUMNS);
    return row ?? null;
  }

  async deleteLineItem(proposalId: string, itemId: string) {
    return db('proposal_line_items').where({ id: itemId, proposal_id: proposalId }).del();
  }

  async recomputeTotals(proposalId: string) {
    const totals = await db('proposal_line_items')
      .where({ proposal_id: proposalId })
      .sum<{ cost: string | null; sell: string | null }>(
        db.raw('cost_paise * qty as cost'),
        db.raw('sell_paise * qty as sell'),
      )
      .first();

    const cost = Math.round(Number(totals?.cost ?? 0));
    const sell = Math.round(Number(totals?.sell ?? 0));

    await db('proposals')
      .where({ id: proposalId })
      .update({
        total_cost_paise: cost,
        total_sell_paise: sell,
        updated_at: db.fn.now(),
      });

    return { total_cost_paise: cost, total_sell_paise: sell };
  }

  async logEvent(
    proposalId: string,
    eventType: string,
    meta: Record<string, unknown> = {},
    actorUserId: string | null = null,
  ) {
    await db('proposal_events').insert({
      proposal_id: proposalId,
      event_type: eventType,
      meta,
      actor_user_id: actorUserId,
    });
  }

  async checkWorkspaceMembership(workspaceId: string, userId: string): Promise<boolean> {
    const row = await db('workspace_members')
      .where({ workspace_id: workspaceId, user_id: userId })
      .first();
    return !!row;
  }

  /**
   * Send: assign public_token (if not already), set status, default valid_until,
   * stamp sent_at. Idempotent — re-sending a sent proposal just updates sent_at.
   */
  async send(id: string, workspaceId: string) {
    const existing = await db('proposals')
      .where({ id, workspace_id: workspaceId })
      .first();
    if (!existing) return null;

    const token = existing.public_token || crypto.randomBytes(24).toString('base64url');
    const validUntil =
      existing.valid_until ||
      new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const [row] = await db('proposals')
      .where({ id, workspace_id: workspaceId })
      .update({
        public_token: token,
        status: 'sent',
        sent_at: db.fn.now(),
        valid_until: validUntil,
        updated_at: db.fn.now(),
      })
      .returning(PROPOSAL_COLUMNS);

    return row ?? null;
  }

  /**
   * Version: clone the proposal + line items as v+1, status=draft,
   * parent_proposal_id = current. Resets totals; recomputeTotals must run after.
   */
  async createVersion(id: string, workspaceId: string, userId: string) {
    return db.transaction(async (trx) => {
      const parent = await trx('proposals')
        .where({ id, workspace_id: workspaceId })
        .first();
      if (!parent) return null;

      const [next] = await trx('proposals')
        .insert({
          workspace_id: parent.workspace_id,
          event_file_id: parent.event_file_id,
          client_name: parent.client_name,
          client_email: parent.client_email,
          client_phone: parent.client_phone,
          event_title: parent.event_title,
          event_date: parent.event_date,
          venue_text: parent.venue_text,
          status: 'draft',
          version: Number(parent.version) + 1,
          parent_proposal_id: parent.id,
          valid_until: null,
          created_by: userId,
        })
        .returning(PROPOSAL_COLUMNS);

      const lineItems = await trx('proposal_line_items')
        .where({ proposal_id: parent.id })
        .select('category', 'description', 'notes', 'qty', 'cost_paise', 'sell_paise', 'sort_order');

      if (lineItems.length > 0) {
        await trx('proposal_line_items').insert(
          lineItems.map((li) => ({ ...li, proposal_id: next.id })),
        );
      }

      // Recompute totals inside the same tx
      const totals = await trx('proposal_line_items')
        .where({ proposal_id: next.id })
        .sum<{ cost: string | null; sell: string | null }>(
          trx.raw('cost_paise * qty as cost'),
          trx.raw('sell_paise * qty as sell'),
        )
        .first();

      const cost = Math.round(Number(totals?.cost ?? 0));
      const sell = Math.round(Number(totals?.sell ?? 0));
      await trx('proposals')
        .where({ id: next.id })
        .update({ total_cost_paise: cost, total_sell_paise: sell });

      return { ...next, total_cost_paise: cost, total_sell_paise: sell };
    });
  }

  /**
   * Convert: create event_files row + boq_line_items copies + back-pointer.
   * Marks proposal accepted (if not already). Returns event_file_id.
   *
   * boq_line_items uses INR decimal columns; convert paise → INR (paise / 100).
   */
  async convertToEventFile(id: string, workspaceId: string, userId: string) {
    return db.transaction(async (trx) => {
      const proposal = await trx('proposals')
        .where({ id, workspace_id: workspaceId })
        .first();
      if (!proposal) return null;

      // Bail if already converted
      if (proposal.event_file_id) {
        return { event_file_id: proposal.event_file_id, already_converted: true };
      }

      const lineItems = await trx('proposal_line_items')
        .where({ proposal_id: id })
        .orderBy('sort_order', 'asc');

      // Create event_file. We need a city — fall back to venue_text or 'TBD'.
      const eventDate =
        proposal.event_date ||
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      const [eventFile] = await trx('event_files')
        .insert({
          client_id: userId,
          event_name: proposal.event_title,
          event_date: eventDate,
          city: 'TBD',
          venue: proposal.venue_text || null,
          brief: { source: 'proposal', proposal_id: id, client_name: proposal.client_name },
          status: 'planning',
          budget_paise: proposal.total_sell_paise,
          source_proposal_id: id,
        })
        .returning(['id']);

      const eventFileId = eventFile.id;

      // Copy line items into boq_line_items (paise → INR decimal)
      if (lineItems.length > 0) {
        await trx('boq_line_items').insert(
          lineItems.map((li) => {
            const qty = Number(li.qty);
            const unitInr = Number(li.sell_paise) / 100;
            const total = unitInr * qty;
            return {
              event_file_id: eventFileId,
              vendor_profile_id: null,
              category: li.category,
              description: li.description,
              quantity: qty,
              unit_price_inr: unitInr,
              line_total_inr: total,
              sort_order: li.sort_order,
            };
          }),
        );
      }

      // Mark proposal accepted + back-link
      await trx('proposals')
        .where({ id })
        .update({
          event_file_id: eventFileId,
          status: 'accepted',
          accepted_at: proposal.accepted_at || trx.fn.now(),
          updated_at: trx.fn.now(),
        });

      return { event_file_id: eventFileId, already_converted: false };
    });
  }

  /**
   * Summary: P&L by category, plus header totals.
   */
  async summary(id: string, workspaceId: string) {
    const proposal = await db('proposals')
      .where({ id, workspace_id: workspaceId })
      .first();
    if (!proposal) return null;

    const rows = await db('proposal_line_items')
      .where({ proposal_id: id })
      .groupBy('category')
      .select('category')
      .sum<{ category: string; cost: string; sell: string; line_count: string }[]>(
        db.raw('cost_paise * qty as cost'),
        db.raw('sell_paise * qty as sell'),
      )
      .count('id as line_count');

    const byCategory = rows.map((r: any) => {
      const cost = Number(r.cost ?? 0);
      const sell = Number(r.sell ?? 0);
      return {
        category: r.category,
        line_count: Number(r.line_count ?? 0),
        cost_paise: Math.round(cost),
        sell_paise: Math.round(sell),
        margin_paise: Math.round(sell - cost),
        margin_pct: sell > 0 ? Number((((sell - cost) / sell) * 100).toFixed(2)) : null,
      };
    });

    return {
      proposal_id: id,
      total_cost_paise: Number(proposal.total_cost_paise),
      total_sell_paise: Number(proposal.total_sell_paise),
      margin_paise:
        Number(proposal.total_sell_paise) - Number(proposal.total_cost_paise),
      margin_pct: proposal.margin_pct,
      by_category: byCategory,
    };
  }

  /**
   * Workspace lookup — for PDF branding.
   */
  async findWorkspace(workspaceId: string) {
    return db('workspaces').where({ id: workspaceId }).first();
  }

  /**
   * Public-token mutations (Phase 3 helpers, defined here for cohesion).
   */
  async logFirstView(token: string, meta: Record<string, unknown>) {
    return db.transaction(async (trx) => {
      const proposal = await trx('proposals').where({ public_token: token }).first();
      if (!proposal) return null;
      if (!proposal.viewed_at) {
        await trx('proposals')
          .where({ id: proposal.id })
          .update({
            viewed_at: trx.fn.now(),
            status: proposal.status === 'sent' ? 'viewed' : proposal.status,
            updated_at: trx.fn.now(),
          });
        await trx('proposal_events').insert({
          proposal_id: proposal.id,
          event_type: 'viewed',
          meta,
          actor_user_id: null,
        });
      }
      return proposal;
    });
  }

  async acceptByToken(token: string, meta: Record<string, unknown>) {
    return db.transaction(async (trx) => {
      const proposal = await trx('proposals').where({ public_token: token }).first();
      if (!proposal) return null;
      if (proposal.status === 'accepted' || proposal.status === 'declined') return proposal;
      const [row] = await trx('proposals')
        .where({ id: proposal.id })
        .update({
          status: 'accepted',
          accepted_at: trx.fn.now(),
          updated_at: trx.fn.now(),
        })
        .returning(PROPOSAL_COLUMNS);
      await trx('proposal_events').insert({
        proposal_id: proposal.id,
        event_type: 'accepted',
        meta,
        actor_user_id: null,
      });
      return row;
    });
  }

  async declineByToken(token: string, meta: Record<string, unknown>) {
    return db.transaction(async (trx) => {
      const proposal = await trx('proposals').where({ public_token: token }).first();
      if (!proposal) return null;
      if (proposal.status === 'accepted' || proposal.status === 'declined') return proposal;
      const [row] = await trx('proposals')
        .where({ id: proposal.id })
        .update({
          status: 'declined',
          declined_at: trx.fn.now(),
          updated_at: trx.fn.now(),
        })
        .returning(PROPOSAL_COLUMNS);
      await trx('proposal_events').insert({
        proposal_id: proposal.id,
        event_type: 'declined',
        meta,
        actor_user_id: null,
      });
      return row;
    });
  }
}

export const proposalRepository = new ProposalRepository();
