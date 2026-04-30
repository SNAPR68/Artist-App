import { instabookInterestRepository } from './instabook-interest.repository.js';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

export class InstabookInterestError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public code: string = 'INSTABOOK_INTEREST_ERROR',
  ) {
    super(message);
    this.name = 'InstabookInterestError';
  }
}

interface SubmitData {
  role: string;
  name: string;
  phone: string;
  email?: string;
  city: string;
  excitement_score: number;
  top_concern?: string;
  would_use_first_month: string;
  role_specific_data: Record<string, unknown>;
  source: string;
}

class InstabookInterestService {
  async submit(data: SubmitData, ipAddress: string | null, userAgent: string | null) {
    // Application-level rate limit check (backup for Redis)
    const recentCount = await instabookInterestRepository.countByPhoneLastHour(data.phone);
    if (recentCount >= 5) {
      throw new InstabookInterestError(
        'You have already submitted interest recently. Please try again later.',
        429,
        'RATE_LIMITED',
      );
    }

    const row = await instabookInterestRepository.create({
      role: data.role,
      name: data.name,
      phone: data.phone,
      email: data.email || null,
      city: data.city,
      excitement_score: data.excitement_score,
      top_concern: data.top_concern || null,
      would_use_first_month: data.would_use_first_month,
      role_specific_data: data.role_specific_data,
      source: data.source,
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    // Fire-and-forget Slack ping for pilot leads (D6.3). Never block the
    // response on webhook latency/failure — the lead is already persisted.
    if (data.role_specific_data?.pilot === true) {
      void this.notifySlack(data).catch((err) => {
        logger.warn('Slack pilot notification failed (non-fatal)', { err: err instanceof Error ? err.message : String(err) });
      });
    }

    return { id: row.id, created_at: row.created_at };
  }

  private async notifySlack(data: SubmitData): Promise<void> {
    const url = config.SLACK_PILOT_WEBHOOK_URL;
    if (!url) return;

    const rsd = data.role_specific_data as Record<string, unknown>;
    const company = (rsd.company_name as string) || 'Unknown company';
    const epm = (rsd.events_per_month as string) || '?';
    const start = (rsd.start_when as string) || '?';
    const pains = Array.isArray(rsd.pain_points) ? (rsd.pain_points as string[]).join(', ') : '';

    const text = [
      ':rocket: *New GRID pilot request*',
      `*${company}* — ${data.name}`,
      `${data.city} · ${epm} events/mo · start: ${start}`,
      `📞 ${data.phone}${data.email ? ` · ✉️ ${data.email}` : ''}`,
      pains ? `Pain: ${pains}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
  }

  async list(filters: { page: number; per_page: number; role?: string; city?: string; pilot?: boolean }) {
    return instabookInterestRepository.list(filters);
  }

  async stats() {
    return instabookInterestRepository.stats();
  }
}

export const instabookInterestService = new InstabookInterestService();
