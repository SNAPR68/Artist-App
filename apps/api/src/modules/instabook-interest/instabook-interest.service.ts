import { instabookInterestRepository } from './instabook-interest.repository.js';

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

    return { id: row.id, created_at: row.created_at };
  }

  async list(filters: { page: number; per_page: number; role?: string; city?: string; pilot?: boolean }) {
    return instabookInterestRepository.list(filters);
  }

  async stats() {
    return instabookInterestRepository.stats();
  }
}

export const instabookInterestService = new InstabookInterestService();
