import { db } from '../../infrastructure/database.js';

export interface CreateSocialAnalysisData {
  user_id: string;
  platform: string;
  profile_url: string;
  profile_data: Record<string, unknown>;
  status: string;
}

export class SocialAnalyzerRepository {
  async create(data: CreateSocialAnalysisData) {
    const [row] = await db('social_media_analyses')
      .insert({
        user_id: data.user_id,
        platform: data.platform,
        profile_url: data.profile_url,
        profile_data: JSON.stringify(data.profile_data),
        status: data.status,
      })
      .returning('*');
    return row;
  }

  async findByUser(userId: string) {
    return db('social_media_analyses')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc');
  }
}

export const socialAnalyzerRepository = new SocialAnalyzerRepository();
