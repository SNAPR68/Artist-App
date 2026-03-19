import { socialAnalyzerRepository } from './social-analyzer.repository.js';

export class SocialAnalyzerService {
  /**
   * Analyze a social media profile (STUB — returns mock data).
   * Full analysis requires Instagram/YouTube API integration.
   */
  async analyze(userId: string, platform: string, profileUrl: string) {
    const username = this.extractUsername(profileUrl);
    const profileData = this.generateMockProfileData(username, platform);

    const row = await socialAnalyzerRepository.create({
      user_id: userId,
      platform,
      profile_url: profileUrl,
      profile_data: profileData,
      status: 'completed',
    });

    return row;
  }

  /**
   * Return analysis history for a user.
   */
  async getHistory(userId: string) {
    return socialAnalyzerRepository.findByUser(userId);
  }

  // ── Private helpers ──────────────────────────────────────────

  private extractUsername(url: string): string {
    try {
      const parsed = new URL(url);
      const segments = parsed.pathname.split('/').filter(Boolean);
      return segments[0]?.replace(/^@/, '') ?? 'unknown';
    } catch {
      // If URL parsing fails, try to get something useful
      const parts = url.split('/').filter(Boolean);
      return parts[parts.length - 1]?.replace(/^@/, '') ?? 'unknown';
    }
  }

  private generateMockProfileData(username: string, platform: string): Record<string, unknown> {
    const displayName = username
      .split(/[._-]/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    const followerCount = Math.floor(Math.random() * 49000) + 1000;

    const suggestedGenres: Record<string, string[]> = {
      instagram: ['Bollywood', 'Pop', 'Indie'],
      youtube: ['Bollywood', 'Classical', 'Fusion'],
    };

    const topContent = [
      { title: `${displayName} — Live at Mumbai`, views: Math.floor(Math.random() * 90000) + 10000 },
      { title: `${displayName} — Acoustic Session`, views: Math.floor(Math.random() * 50000) + 5000 },
      { title: `${displayName} — Behind the Scenes`, views: Math.floor(Math.random() * 30000) + 2000 },
    ];

    return {
      username,
      display_name: displayName,
      follower_count: followerCount,
      suggested_genres: suggestedGenres[platform] ?? ['Bollywood', 'Pop'],
      suggested_bio: 'Professional artist known for captivating live performances.',
      top_content: topContent,
      _stub_notice: 'This is placeholder data. Full analysis requires Instagram/YouTube API integration.',
    };
  }
}

export class SocialAnalyzerError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = 'SocialAnalyzerError';
  }
}

export const socialAnalyzerService = new SocialAnalyzerService();
