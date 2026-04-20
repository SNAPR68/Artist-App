import { db } from '../../infrastructure/database.js';
import { notificationService } from './notification.service.js';
import { NotificationChannel } from '@artist-booking/shared';

type NudgeType =
  | 'no_first_brief_d3'
  | 'no_first_deal_d7'
  | 'concierge_stuck_48h'
  | 'trial_ending_t3';

type Candidate = {
  workspace_id: string;
  user_id: string;
  phone: string | null;
  email: string | null;
  variables: Record<string, string>;
};

const TEMPLATE_BY_NUDGE: Record<NudgeType, string> = {
  no_first_brief_d3: 'activation_no_first_brief_d3',
  no_first_deal_d7: 'activation_no_first_deal_d7',
  concierge_stuck_48h: 'activation_concierge_stuck_48h',
  trial_ending_t3: 'activation_trial_ending_t3',
};

class ActivationNudgeService {
  /**
   * Run all activation nudge checks and send to eligible workspaces.
   * Deduped via activation_nudges_sent (one row per workspace+nudge_type).
   */
  async runAll(): Promise<{ sent: Record<NudgeType, number> }> {
    const results: Record<NudgeType, number> = {
      no_first_brief_d3: 0,
      no_first_deal_d7: 0,
      concierge_stuck_48h: 0,
      trial_ending_t3: 0,
    };

    results.no_first_brief_d3 = await this.processNudge(
      'no_first_brief_d3',
      await this.findNoFirstBriefD3(),
    );
    results.no_first_deal_d7 = await this.processNudge(
      'no_first_deal_d7',
      await this.findNoFirstDealD7(),
    );
    results.concierge_stuck_48h = await this.processNudge(
      'concierge_stuck_48h',
      await this.findConciergeStuck(),
    );
    results.trial_ending_t3 = await this.processNudge(
      'trial_ending_t3',
      await this.findTrialEnding(),
    );

    return { sent: results };
  }

  private async processNudge(nudge: NudgeType, candidates: Candidate[]): Promise<number> {
    let sent = 0;
    const template = TEMPLATE_BY_NUDGE[nudge];
    for (const c of candidates) {
      const existing = await db('activation_nudges_sent')
        .where({ workspace_id: c.workspace_id, nudge_type: nudge })
        .first();
      if (existing) continue;

      let channel: NotificationChannel | null = null;
      try {
        if (c.phone) {
          await notificationService.send({
            userId: c.user_id,
            channel: NotificationChannel.WHATSAPP,
            template,
            variables: c.variables,
            phone: c.phone,
          });
          channel = NotificationChannel.WHATSAPP;
        } else if (c.email) {
          await notificationService.send({
            userId: c.user_id,
            channel: NotificationChannel.EMAIL,
            template,
            variables: c.variables,
            email: c.email,
          });
          channel = NotificationChannel.EMAIL;
        }
      } catch (err) {
        console.error(`[NUDGE] Send failed for ${c.workspace_id}/${nudge}:`, err);
        continue;
      }

      if (!channel) continue;

      await db('activation_nudges_sent').insert({
        workspace_id: c.workspace_id,
        nudge_type: nudge,
        channel,
      }).onConflict(['workspace_id', 'nudge_type']).ignore();
      sent++;
    }
    return sent;
  }

  /** Agencies created 3-14 days ago with zero decision_briefs. */
  private async findNoFirstBriefD3(): Promise<Candidate[]> {
    const rows = await db.raw(
      `
      SELECT w.id AS workspace_id, u.id AS user_id, u.phone, u.email,
             EXTRACT(DAY FROM NOW() - w.created_at)::int AS days_since
      FROM workspaces w
      JOIN users u ON u.id = w.owner_user_id
      WHERE w.is_active = true
        AND w.created_at BETWEEN NOW() - INTERVAL '14 days' AND NOW() - INTERVAL '3 days'
        AND NOT EXISTS (
          SELECT 1 FROM decision_briefs b
          WHERE b.workspace_id = w.id OR b.created_by_user_id = u.id
        )
      LIMIT 200
      `,
    );
    return rows.rows.map((r: any) => ({
      workspace_id: r.workspace_id,
      user_id: r.user_id,
      phone: r.phone,
      email: r.email,
      variables: { days_since: String(r.days_since ?? 3) },
    }));
  }

  /** Agencies created 7-30 days ago with briefs but zero confirmed bookings. */
  private async findNoFirstDealD7(): Promise<Candidate[]> {
    const rows = await db.raw(
      `
      SELECT w.id AS workspace_id, u.id AS user_id, u.phone, u.email,
             EXTRACT(DAY FROM NOW() - w.created_at)::int AS days_since
      FROM workspaces w
      JOIN users u ON u.id = w.owner_user_id
      WHERE w.is_active = true
        AND w.created_at BETWEEN NOW() - INTERVAL '30 days' AND NOW() - INTERVAL '7 days'
        AND EXISTS (
          SELECT 1 FROM decision_briefs b
          WHERE b.workspace_id = w.id OR b.created_by_user_id = u.id
        )
        AND NOT EXISTS (
          SELECT 1 FROM bookings bk
          WHERE bk.client_user_id = u.id
            AND bk.state IN ('confirmed', 'event_day', 'completed', 'settled')
        )
      LIMIT 200
      `,
    );
    return rows.rows.map((r: any) => ({
      workspace_id: r.workspace_id,
      user_id: r.user_id,
      phone: r.phone,
      email: r.email,
      variables: { days_since: String(r.days_since ?? 7) },
    }));
  }

  /** Concierge requests pending/accepted for >48h with no progress. */
  private async findConciergeStuck(): Promise<Candidate[]> {
    const rows = await db.raw(
      `
      SELECT cr.workspace_id, cr.requested_by AS user_id, u.phone, u.email,
             EXTRACT(EPOCH FROM (NOW() - cr.created_at))::int / 3600 AS hours_since
      FROM concierge_requests cr
      JOIN users u ON u.id = cr.requested_by
      WHERE cr.status IN ('pending', 'accepted')
        AND cr.created_at < NOW() - INTERVAL '48 hours'
      LIMIT 200
      `,
    );
    return rows.rows.map((r: any) => ({
      workspace_id: r.workspace_id,
      user_id: r.user_id,
      phone: r.phone,
      email: r.email,
      variables: { hours_since: String(r.hours_since ?? 48) },
    }));
  }

  /** Trials ending in ~3 days. Trial stored in workspaces.metadata->>'trial_ends_at'. */
  private async findTrialEnding(): Promise<Candidate[]> {
    const rows = await db.raw(
      `
      SELECT w.id AS workspace_id, u.id AS user_id, u.phone, u.email,
             TO_CHAR((w.metadata->>'trial_ends_at')::timestamptz, 'DD Mon') AS trial_end_date
      FROM workspaces w
      JOIN users u ON u.id = w.owner_user_id
      WHERE w.is_active = true
        AND w.metadata->>'trial_ends_at' IS NOT NULL
        AND (w.metadata->>'plan') = 'pro'
        AND (w.metadata->>'trial_ends_at')::timestamptz
            BETWEEN NOW() + INTERVAL '2 days' AND NOW() + INTERVAL '3 days 6 hours'
      LIMIT 200
      `,
    );
    return rows.rows.map((r: any) => ({
      workspace_id: r.workspace_id,
      user_id: r.user_id,
      phone: r.phone,
      email: r.email,
      variables: { trial_end_date: r.trial_end_date ?? 'soon' },
    }));
  }
}

export const activationNudgeService = new ActivationNudgeService();
