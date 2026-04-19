import { db } from '../../infrastructure/database.js';

/**
 * Workspace collaboration — comments, @mentions, assignments.
 *
 * Resource types: 'event' | 'booking' | 'presentation'.
 * All writes enforce workspace membership check before hitting this service.
 */

export type ResourceType = 'event' | 'booking' | 'presentation';

export interface CommentCreate {
  workspace_id: string;
  resource_type: ResourceType;
  resource_id: string;
  author_user_id: string;
  body: string;
  mentioned_user_ids?: string[];
}

export interface AssignmentCreate {
  workspace_id: string;
  resource_type: 'event' | 'booking';
  resource_id: string;
  assignee_user_id: string;
  assigned_by_user_id: string;
}

class CollaborationService {
  /**
   * Parse @mentions from comment body.
   * Expected format: "@user_id_uuid" — frontend resolves names to IDs before submit.
   * Returns unique user IDs found in body.
   */
  parseMentions(body: string): string[] {
    const uuidRe = /@([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi;
    const matches = new Set<string>();
    for (const m of body.matchAll(uuidRe)) matches.add(m[1]);
    return Array.from(matches);
  }

  async createComment(input: CommentCreate) {
    const mentionedIds = input.mentioned_user_ids && input.mentioned_user_ids.length > 0
      ? input.mentioned_user_ids
      : this.parseMentions(input.body);

    return db.transaction(async (trx) => {
      const [comment] = await trx('workspace_comments').insert({
        workspace_id: input.workspace_id,
        resource_type: input.resource_type,
        resource_id: input.resource_id,
        author_user_id: input.author_user_id,
        body: input.body,
        mentioned_user_ids: mentionedIds,
      }).returning('*');

      if (mentionedIds.length > 0) {
        // Validate mentioned users are workspace members
        const members = await trx('workspace_members')
          .where({ workspace_id: input.workspace_id, is_active: true })
          .whereIn('user_id', mentionedIds)
          .select('user_id');
        const validIds = members.map((m) => m.user_id as string);

        if (validIds.length > 0) {
          await trx('workspace_mentions').insert(
            validIds.map((uid) => ({
              workspace_id: input.workspace_id,
              mentioned_user_id: uid,
              comment_id: comment.id,
              resource_type: input.resource_type,
              resource_id: input.resource_id,
            })),
          );
        }
      }

      return comment;
    });
  }

  async listComments(workspaceId: string, resourceType: ResourceType, resourceId: string) {
    return db('workspace_comments as c')
      .leftJoin('users as u', 'u.id', 'c.author_user_id')
      .where({
        'c.workspace_id': workspaceId,
        'c.resource_type': resourceType,
        'c.resource_id': resourceId,
      })
      .whereNull('c.deleted_at')
      .select(
        'c.id',
        'c.body',
        'c.mentioned_user_ids',
        'c.author_user_id',
        'c.created_at',
        'c.updated_at',
        'u.email as author_email',
        'u.phone as author_phone',
      )
      .orderBy('c.created_at', 'asc');
  }

  async deleteComment(commentId: string, userId: string) {
    // Only the author can soft-delete their own comment
    return db('workspace_comments')
      .where({ id: commentId, author_user_id: userId })
      .update({ deleted_at: new Date(), updated_at: new Date() })
      .returning('*');
  }

  async listMentionsInbox(userId: string, unreadOnly = false) {
    const q = db('workspace_mentions as m')
      .join('workspace_comments as c', 'c.id', 'm.comment_id')
      .join('workspaces as w', 'w.id', 'm.workspace_id')
      .leftJoin('users as au', 'au.id', 'c.author_user_id')
      .where('m.mentioned_user_id', userId)
      .whereNull('c.deleted_at')
      .select(
        'm.id',
        'm.workspace_id',
        'w.name as workspace_name',
        'm.resource_type',
        'm.resource_id',
        'm.read_at',
        'm.created_at',
        'c.body',
        'c.author_user_id',
        'au.email as author_email',
      )
      .orderBy('m.created_at', 'desc')
      .limit(100);

    if (unreadOnly) q.whereNull('m.read_at');
    return q;
  }

  async markMentionsRead(userId: string, mentionIds: string[]) {
    if (mentionIds.length === 0) return 0;
    return db('workspace_mentions')
      .where({ mentioned_user_id: userId })
      .whereIn('id', mentionIds)
      .update({ read_at: new Date() });
  }

  async markAllMentionsRead(userId: string) {
    return db('workspace_mentions')
      .where({ mentioned_user_id: userId })
      .whereNull('read_at')
      .update({ read_at: new Date() });
  }

  async setAssignment(input: AssignmentCreate) {
    // Upsert — only one assignee per resource
    const existing = await db('workspace_assignments')
      .where({ resource_type: input.resource_type, resource_id: input.resource_id })
      .first();

    if (existing) {
      const [updated] = await db('workspace_assignments')
        .where({ id: existing.id })
        .update({
          assignee_user_id: input.assignee_user_id,
          assigned_by_user_id: input.assigned_by_user_id,
          updated_at: new Date(),
        })
        .returning('*');
      return updated;
    }

    const [created] = await db('workspace_assignments').insert(input).returning('*');
    return created;
  }

  async clearAssignment(resourceType: 'event' | 'booking', resourceId: string) {
    await db('workspace_assignments')
      .where({ resource_type: resourceType, resource_id: resourceId })
      .delete();
  }

  async getAssignment(resourceType: 'event' | 'booking', resourceId: string) {
    return db('workspace_assignments as a')
      .leftJoin('users as u', 'u.id', 'a.assignee_user_id')
      .where({ 'a.resource_type': resourceType, 'a.resource_id': resourceId })
      .select(
        'a.id',
        'a.workspace_id',
        'a.resource_type',
        'a.resource_id',
        'a.assignee_user_id',
        'a.assigned_by_user_id',
        'a.created_at',
        'u.email as assignee_email',
        'u.phone as assignee_phone',
      )
      .first();
  }

  async listMyAssignments(userId: string) {
    return db('workspace_assignments as a')
      .join('workspaces as w', 'w.id', 'a.workspace_id')
      .where('a.assignee_user_id', userId)
      .select(
        'a.id',
        'a.workspace_id',
        'w.name as workspace_name',
        'a.resource_type',
        'a.resource_id',
        'a.created_at',
      )
      .orderBy('a.created_at', 'desc');
  }
}

export const collaborationService = new CollaborationService();
