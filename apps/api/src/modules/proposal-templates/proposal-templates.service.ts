import { db } from '../../infrastructure/database.js';

export interface ProposalTemplate {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  custom_header: string | null;
  custom_footer: string | null;
  terms_and_conditions: string | null;
  include_pricing: boolean;
  include_media: boolean;
  is_default: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateTemplateInput {
  workspace_id: string;
  name: string;
  description?: string | null;
  custom_header?: string | null;
  custom_footer?: string | null;
  terms_and_conditions?: string | null;
  include_pricing?: boolean;
  include_media?: boolean;
  is_default?: boolean;
  created_by: string;
}

export type UpdateTemplateInput = Partial<Omit<CreateTemplateInput, 'workspace_id' | 'created_by'>>;

class ProposalTemplatesService {
  async list(workspaceId: string): Promise<ProposalTemplate[]> {
    return db<ProposalTemplate>('proposal_templates')
      .where({ workspace_id: workspaceId })
      .whereNull('deleted_at')
      .orderBy('is_default', 'desc')
      .orderBy('updated_at', 'desc');
  }

  async get(id: string, workspaceId: string): Promise<ProposalTemplate | null> {
    const row = await db<ProposalTemplate>('proposal_templates')
      .where({ id, workspace_id: workspaceId })
      .whereNull('deleted_at')
      .first();
    return row ?? null;
  }

  async getDefault(workspaceId: string): Promise<ProposalTemplate | null> {
    const row = await db<ProposalTemplate>('proposal_templates')
      .where({ workspace_id: workspaceId, is_default: true })
      .whereNull('deleted_at')
      .first();
    return row ?? null;
  }

  async create(input: CreateTemplateInput): Promise<ProposalTemplate> {
    return db.transaction(async (trx) => {
      if (input.is_default) {
        await trx('proposal_templates')
          .where({ workspace_id: input.workspace_id, is_default: true })
          .update({ is_default: false });
      }
      const [row] = await trx<ProposalTemplate>('proposal_templates')
        .insert({
          workspace_id: input.workspace_id,
          name: input.name,
          description: input.description ?? null,
          custom_header: input.custom_header ?? null,
          custom_footer: input.custom_footer ?? null,
          terms_and_conditions: input.terms_and_conditions ?? null,
          include_pricing: input.include_pricing ?? false,
          include_media: input.include_media ?? true,
          is_default: input.is_default ?? false,
          created_by: input.created_by,
        })
        .returning('*');
      return row;
    });
  }

  async update(id: string, workspaceId: string, input: UpdateTemplateInput): Promise<ProposalTemplate | null> {
    return db.transaction(async (trx) => {
      if (input.is_default) {
        await trx('proposal_templates')
          .where({ workspace_id: workspaceId, is_default: true })
          .whereNot('id', id)
          .update({ is_default: false });
      }
      const patch: Record<string, unknown> = { updated_at: trx.fn.now() };
      for (const k of [
        'name',
        'description',
        'custom_header',
        'custom_footer',
        'terms_and_conditions',
        'include_pricing',
        'include_media',
        'is_default',
      ] as const) {
        if (k in input) patch[k] = input[k] ?? null;
      }
      const [row] = await trx<ProposalTemplate>('proposal_templates')
        .where({ id, workspace_id: workspaceId })
        .whereNull('deleted_at')
        .update(patch)
        .returning('*');
      return row ?? null;
    });
  }

  async remove(id: string, workspaceId: string): Promise<boolean> {
    const count = await db('proposal_templates')
      .where({ id, workspace_id: workspaceId })
      .whereNull('deleted_at')
      .update({ deleted_at: db.fn.now(), is_default: false });
    return count > 0;
  }
}

export const proposalTemplatesService = new ProposalTemplatesService();
