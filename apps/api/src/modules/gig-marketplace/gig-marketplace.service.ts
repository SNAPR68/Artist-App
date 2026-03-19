import { UserRole } from '@artist-booking/shared';
import { gigMarketplaceRepository } from './gig-marketplace.repository.js';
import type { UpdateGigPostData, GigPostFilters, CreateGigApplicationData } from './gig-marketplace.repository.js';
import { db } from '../../infrastructure/database.js';

// ─── Error Class ───────────────────────────────────────────────

export class GigMarketplaceError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = 'GigMarketplaceError';
  }
}

// ─── Service ───────────────────────────────────────────────────

export class GigMarketplaceService {

  // ─── Post Management ─────────────────────────────────────────

  async createPost(userId: string, data: {
    title: string;
    description: string;
    event_type: string;
    event_date: string;
    event_city: string;
    genres_needed: string[];
    budget_min_paise: number;
    budget_max_paise: number;
    guest_count?: number;
    duration_hours?: number;
    requirements?: string;
    workspace_id?: string;
    expires_at?: string;
  }) {
    // Verify user is client/event_company/agent
    const user = await db('users').where({ id: userId }).first();
    if (!user) {
      throw new GigMarketplaceError('USER_NOT_FOUND', 'User not found', 404);
    }

    const allowedRoles = [UserRole.CLIENT, UserRole.EVENT_COMPANY, UserRole.AGENT];
    if (!allowedRoles.includes(user.role as UserRole)) {
      throw new GigMarketplaceError('FORBIDDEN', 'Only clients, event companies, and agents can post gigs', 403);
    }

    if (data.budget_min_paise > data.budget_max_paise) {
      throw new GigMarketplaceError('INVALID_BUDGET', 'Minimum budget cannot exceed maximum budget', 400);
    }

    const post = await gigMarketplaceRepository.createPost({
      posted_by: userId,
      ...data,
    });

    return post;
  }

  async getPosts(filters: GigPostFilters) {
    return gigMarketplaceRepository.getPosts(filters);
  }

  async getPost(postId: string) {
    const post = await gigMarketplaceRepository.getPost(postId);
    if (!post) {
      throw new GigMarketplaceError('POST_NOT_FOUND', 'Gig post not found', 404);
    }
    return post;
  }

  async getMyPosts(userId: string) {
    return gigMarketplaceRepository.getPostsByUser(userId);
  }

  async updatePost(postId: string, userId: string, data: UpdateGigPostData) {
    const post = await gigMarketplaceRepository.getPost(postId);
    if (!post) {
      throw new GigMarketplaceError('POST_NOT_FOUND', 'Gig post not found', 404);
    }
    if (post.posted_by !== userId) {
      throw new GigMarketplaceError('FORBIDDEN', 'You can only update your own gig posts', 403);
    }
    if (post.status !== 'open') {
      throw new GigMarketplaceError('POST_NOT_OPEN', 'Can only update open gig posts', 400);
    }

    if (data.budget_min_paise !== undefined && data.budget_max_paise !== undefined) {
      if (data.budget_min_paise > data.budget_max_paise) {
        throw new GigMarketplaceError('INVALID_BUDGET', 'Minimum budget cannot exceed maximum budget', 400);
      }
    }

    return gigMarketplaceRepository.updatePost(postId, data);
  }

  async closePost(postId: string, userId: string) {
    const post = await gigMarketplaceRepository.getPost(postId);
    if (!post) {
      throw new GigMarketplaceError('POST_NOT_FOUND', 'Gig post not found', 404);
    }
    if (post.posted_by !== userId) {
      throw new GigMarketplaceError('FORBIDDEN', 'You can only close your own gig posts', 403);
    }
    if (post.status !== 'open') {
      throw new GigMarketplaceError('POST_NOT_OPEN', 'Can only close open gig posts', 400);
    }

    return gigMarketplaceRepository.updatePost(postId, { status: 'closed' });
  }

  // ─── Applications ────────────────────────────────────────────

  async applyToGig(postId: string, userId: string, data: CreateGigApplicationData) {
    // Resolve artist_id from userId
    const artist = await db('artist_profiles').where({ user_id: userId }).first();
    if (!artist) {
      throw new GigMarketplaceError('ARTIST_NOT_FOUND', 'Artist profile not found. Only artists can apply to gigs.', 404);
    }

    // Verify user is artist
    const user = await db('users').where({ id: userId }).first();
    if (user?.role !== UserRole.ARTIST) {
      throw new GigMarketplaceError('FORBIDDEN', 'Only artists can apply to gigs', 403);
    }

    // Verify post is open
    const post = await gigMarketplaceRepository.getPost(postId);
    if (!post) {
      throw new GigMarketplaceError('POST_NOT_FOUND', 'Gig post not found', 404);
    }
    if (post.status !== 'open') {
      throw new GigMarketplaceError('POST_NOT_OPEN', 'This gig is no longer accepting applications', 400);
    }

    // Verify no existing application
    const existing = await db('gig_applications')
      .where({ gig_post_id: postId, artist_id: artist.id })
      .first();
    if (existing) {
      throw new GigMarketplaceError('ALREADY_APPLIED', 'You have already applied to this gig', 409);
    }

    // Check genre match (warn but don't block)
    const postGenres: string[] = Array.isArray(post.genres_needed) ? post.genres_needed : [];
    const artistGenres: string[] = Array.isArray(artist.genres) ? artist.genres : [];
    const genreOverlap = postGenres.filter((g: string) => artistGenres.includes(g));
    const genreMatch = genreOverlap.length > 0;

    const application = await gigMarketplaceRepository.createApplication(postId, artist.id, data);

    return {
      application,
      genre_match: genreMatch,
      matching_genres: genreOverlap,
      warning: !genreMatch ? 'Your genres do not match the gig requirements, but your application has been submitted.' : undefined,
    };
  }

  async getApplicationsForPost(postId: string, userId: string) {
    // Verify post ownership
    const post = await gigMarketplaceRepository.getPost(postId);
    if (!post) {
      throw new GigMarketplaceError('POST_NOT_FOUND', 'Gig post not found', 404);
    }
    if (post.posted_by !== userId) {
      throw new GigMarketplaceError('FORBIDDEN', 'You can only view applications for your own gig posts', 403);
    }

    return gigMarketplaceRepository.getApplications(postId);
  }

  async getMyApplications(userId: string) {
    // Resolve artist_id from userId
    const artist = await db('artist_profiles').where({ user_id: userId }).first();
    if (!artist) {
      throw new GigMarketplaceError('ARTIST_NOT_FOUND', 'Artist profile not found', 404);
    }

    return gigMarketplaceRepository.getApplicationsByArtist(artist.id);
  }

  async respondToApplication(applicationId: string, userId: string, status: string) {
    const application = await gigMarketplaceRepository.getApplication(applicationId);
    if (!application) {
      throw new GigMarketplaceError('APPLICATION_NOT_FOUND', 'Application not found', 404);
    }

    // Verify post ownership
    const post = await gigMarketplaceRepository.getPost(application.gig_post_id);
    if (!post) {
      throw new GigMarketplaceError('POST_NOT_FOUND', 'Gig post not found', 404);
    }
    if (post.posted_by !== userId) {
      throw new GigMarketplaceError('FORBIDDEN', 'You can only respond to applications on your own gig posts', 403);
    }

    if (application.status !== 'pending' && application.status !== 'shortlisted') {
      throw new GigMarketplaceError('INVALID_STATUS', 'Can only respond to pending or shortlisted applications', 400);
    }

    const updated = await gigMarketplaceRepository.updateApplicationStatus(applicationId, status);

    // If accepted, update post status to filled
    if (status === 'accepted') {
      await gigMarketplaceRepository.updatePost(post.id, { status: 'filled' });
    }

    return updated;
  }

  async withdrawApplication(applicationId: string, userId: string) {
    const application = await gigMarketplaceRepository.getApplication(applicationId);
    if (!application) {
      throw new GigMarketplaceError('APPLICATION_NOT_FOUND', 'Application not found', 404);
    }

    // Verify artist ownership
    const artist = await db('artist_profiles').where({ user_id: userId }).first();
    if (!artist || artist.id !== application.artist_id) {
      throw new GigMarketplaceError('FORBIDDEN', 'You can only withdraw your own applications', 403);
    }

    if (application.status === 'accepted') {
      throw new GigMarketplaceError('CANNOT_WITHDRAW', 'Cannot withdraw an accepted application', 400);
    }

    return gigMarketplaceRepository.updateApplicationStatus(applicationId, 'withdrawn');
  }

  // ─── Matching ────────────────────────────────────────────────

  async getMatchingGigs(userId: string, filters: GigPostFilters = {}) {
    // Resolve artist_id from userId
    const artist = await db('artist_profiles').where({ user_id: userId }).first();
    if (!artist) {
      throw new GigMarketplaceError('ARTIST_NOT_FOUND', 'Artist profile not found', 404);
    }

    return gigMarketplaceRepository.getPostsForArtist(artist.id, filters);
  }

  // ─── Batch Operations ────────────────────────────────────────

  async expireOldPosts() {
    const count = await gigMarketplaceRepository.expireOldPosts();
    return count;
  }
}

export const gigMarketplaceService = new GigMarketplaceService();
