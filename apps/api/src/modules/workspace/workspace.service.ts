import { WorkspaceRole } from '@artist-booking/shared';
import { workspaceRepository } from './workspace.repository.js';
import type { UpdateWorkspaceData, PipelineFilters, DateRange } from './workspace.repository.js';
import { db } from '../../infrastructure/database.js';

// ─── Error Class ───────────────────────────────────────────────

export class WorkspaceError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = 'WorkspaceError';
  }
}

// ─── Service ───────────────────────────────────────────────────

export class WorkspaceService {

  // ─── Workspace CRUD ─────────────────────────────────────────

  async createWorkspace(userId: string, data: {
    name: string;
    description?: string;
    website?: string;
    city?: string;
    company_type?: string;
    logo_url?: string;
    brand_color?: string;
  }) {
    const slug = this.generateSlug(data.name, data.city);

    const workspace = await workspaceRepository.createWorkspace({
      name: data.name,
      slug,
      owner_user_id: userId,
      description: data.description,
      website: data.website,
      city: data.city,
      company_type: data.company_type,
      logo_url: data.logo_url,
      brand_color: data.brand_color,
    });

    // Add the creator as owner member with accepted_at set
    await workspaceRepository.addMember({
      workspace_id: workspace.id,
      user_id: userId,
      role: WorkspaceRole.OWNER,
      invited_by: userId,
    });

    // Auto-accept the owner's membership
    await workspaceRepository.acceptInvitation(workspace.id, userId);

    // Link client_profile.workspace_id if client profile exists
    await db('client_profiles')
      .where({ user_id: userId })
      .update({ workspace_id: workspace.id, updated_at: new Date() });

    return workspace;
  }

  async getWorkspaces(userId: string) {
    return workspaceRepository.findByMemberId(userId);
  }

  async getWorkspace(userId: string, workspaceId: string) {
    await this.verifyMembership(workspaceId, userId);

    const workspace = await workspaceRepository.findById(workspaceId);
    if (!workspace) {
      throw new WorkspaceError('NOT_FOUND', 'Workspace not found', 404);
    }

    const members = await workspaceRepository.getMembers(workspaceId);

    return {
      ...workspace,
      member_count: members.length,
    };
  }

  async updateWorkspace(userId: string, workspaceId: string, data: UpdateWorkspaceData) {
    await this.verifyManagerAccess(workspaceId, userId);

    const workspace = await workspaceRepository.findById(workspaceId);
    if (!workspace) {
      throw new WorkspaceError('NOT_FOUND', 'Workspace not found', 404);
    }

    return workspaceRepository.updateWorkspace(workspaceId, data);
  }

  // ─── Team Members ──────────────────────────────────────────

  async inviteTeamMember(workspaceId: string, inviterUserId: string, phone: string, role: string) {
    await this.verifyManagerAccess(workspaceId, inviterUserId);

    // Find user by phone
    const user = await db('users').where({ phone }).first();
    if (!user) {
      throw new WorkspaceError('USER_NOT_REGISTERED', 'User must register on the platform first before being invited to a workspace.', 400);
    }

    // Check if already a member
    const existingMember = await workspaceRepository.getMember(workspaceId, user.id);
    if (existingMember && existingMember.is_active) {
      throw new WorkspaceError('ALREADY_MEMBER', 'User is already a member of this workspace', 409);
    }

    // If previously removed, reactivate
    if (existingMember && !existingMember.is_active) {
      const [reactivated] = await db('workspace_members')
        .where({ workspace_id: workspaceId, user_id: user.id })
        .update({
          is_active: true,
          role,
          invited_by: inviterUserId,
          invited_at: new Date(),
          accepted_at: null,
          updated_at: new Date(),
        })
        .returning('*');
      return reactivated;
    }

    return workspaceRepository.addMember({
      workspace_id: workspaceId,
      user_id: user.id,
      role,
      invited_by: inviterUserId,
    });
  }

  async acceptInvitation(workspaceId: string, userId: string) {
    const member = await workspaceRepository.getMember(workspaceId, userId);
    if (!member || !member.is_active) {
      throw new WorkspaceError('NOT_MEMBER', 'You are not a pending member of this workspace', 404);
    }

    if (member.accepted_at) {
      throw new WorkspaceError('ALREADY_ACCEPTED', 'Invitation has already been accepted', 400);
    }

    return workspaceRepository.acceptInvitation(workspaceId, userId);
  }

  async updateMemberRole(workspaceId: string, userId: string, targetUserId: string, newRole: string) {
    await this.verifyOwnerAccess(workspaceId, userId);

    if (userId === targetUserId) {
      throw new WorkspaceError('CANNOT_CHANGE_OWN_ROLE', 'You cannot change your own role', 400);
    }

    if (newRole === WorkspaceRole.OWNER) {
      throw new WorkspaceError('CANNOT_SET_OWNER', 'There can only be one workspace owner. Transfer ownership instead.', 400);
    }

    const targetMember = await workspaceRepository.getMember(workspaceId, targetUserId);
    if (!targetMember || !targetMember.is_active) {
      throw new WorkspaceError('MEMBER_NOT_FOUND', 'Target member not found in this workspace', 404);
    }

    return workspaceRepository.updateMemberRole(workspaceId, targetUserId, newRole);
  }

  async removeMember(workspaceId: string, userId: string, targetUserId: string) {
    await this.verifyManagerAccess(workspaceId, userId);

    const targetMember = await workspaceRepository.getMember(workspaceId, targetUserId);
    if (!targetMember || !targetMember.is_active) {
      throw new WorkspaceError('MEMBER_NOT_FOUND', 'Target member not found in this workspace', 404);
    }

    if (targetMember.role === WorkspaceRole.OWNER) {
      throw new WorkspaceError('CANNOT_REMOVE_OWNER', 'The workspace owner cannot be removed', 403);
    }

    return workspaceRepository.removeMember(workspaceId, targetUserId);
  }

  async getMembers(workspaceId: string, userId: string) {
    await this.verifyMembership(workspaceId, userId);
    return workspaceRepository.getMembers(workspaceId);
  }

  // ─── Booking Pipeline ──────────────────────────────────────

  async getBookingPipeline(workspaceId: string, userId: string, filters?: PipelineFilters) {
    await this.verifyMembership(workspaceId, userId);
    return workspaceRepository.getBookingPipeline(workspaceId, filters);
  }

  async bulkUpdateBookingState(workspaceId: string, userId: string, bookingIds: string[], action: string) {
    await this.verifyManagerAccess(workspaceId, userId);

    // Verify all bookings belong to this workspace
    const bookings = await db('bookings')
      .whereIn('id', bookingIds)
      .where({ workspace_id: workspaceId, deleted_at: null });

    if (bookings.length !== bookingIds.length) {
      const foundIds = new Set(bookings.map((b: Record<string, unknown>) => b.id));
      const missingIds = bookingIds.filter((id) => !foundIds.has(id));
      throw new WorkspaceError(
        'BOOKINGS_NOT_FOUND',
        `Some bookings were not found in this workspace: ${missingIds.join(', ')}`,
        400,
      );
    }

    // Return success — actual state transitions are handled by the booking service
    return {
      action,
      booking_ids: bookingIds,
      count: bookingIds.length,
      status: 'accepted',
    };
  }

  // ─── Events ─────────────────────────────────────────────────

  async createEvent(workspaceId: string, userId: string, data: {
    name: string;
    event_date: string;
    event_end_date?: string;
    event_city: string;
    venue_id?: string;
    event_type: string;
    guest_count?: number;
    budget_min_paise?: number;
    budget_max_paise?: number;
    notes?: string;
    client_name?: string;
    client_phone?: string;
    client_email?: string;
  }) {
    await this.verifyManagerAccess(workspaceId, userId);

    return workspaceRepository.createEvent({
      workspace_id: workspaceId,
      ...data,
      created_by: userId,
    });
  }

  async updateEvent(workspaceId: string, userId: string, eventId: string, data: {
    name?: string;
    event_date?: string;
    event_end_date?: string;
    event_city?: string;
    venue_id?: string;
    event_type?: string;
    guest_count?: number;
    budget_min_paise?: number;
    budget_max_paise?: number;
    notes?: string;
    client_name?: string;
    client_phone?: string;
    client_email?: string;
    status?: string;
  }) {
    await this.verifyManagerAccess(workspaceId, userId);

    const event = await workspaceRepository.getEventById(eventId);
    if (!event || event.workspace_id !== workspaceId) {
      throw new WorkspaceError('EVENT_NOT_FOUND', 'Event not found in this workspace', 404);
    }

    return workspaceRepository.updateEvent(eventId, data);
  }

  async getEvents(workspaceId: string, userId: string, filters?: { status?: string; start_date?: string; end_date?: string; page?: number; per_page?: number }) {
    await this.verifyMembership(workspaceId, userId);
    return workspaceRepository.getEvents(workspaceId, filters);
  }

  async getEventWithBookings(workspaceId: string, userId: string, eventId: string) {
    await this.verifyMembership(workspaceId, userId);

    const event = await workspaceRepository.getEventById(eventId);
    if (!event || event.workspace_id !== workspaceId) {
      throw new WorkspaceError('EVENT_NOT_FOUND', 'Event not found in this workspace', 404);
    }

    return workspaceRepository.getEventWithBookings(eventId);
  }

  async linkBookingsToEvent(workspaceId: string, userId: string, eventId: string, bookings: Array<{ booking_id: string; role_label?: string }>) {
    await this.verifyManagerAccess(workspaceId, userId);

    const event = await workspaceRepository.getEventById(eventId);
    if (!event || event.workspace_id !== workspaceId) {
      throw new WorkspaceError('EVENT_NOT_FOUND', 'Event not found in this workspace', 404);
    }

    const results = [];
    for (const booking of bookings) {
      const link = await workspaceRepository.linkBookingToEvent(eventId, booking.booking_id, booking.role_label);
      results.push(link);
    }

    return results;
  }

  async unlinkBooking(workspaceId: string, userId: string, eventId: string, bookingId: string) {
    await this.verifyManagerAccess(workspaceId, userId);

    const event = await workspaceRepository.getEventById(eventId);
    if (!event || event.workspace_id !== workspaceId) {
      throw new WorkspaceError('EVENT_NOT_FOUND', 'Event not found in this workspace', 404);
    }

    return workspaceRepository.unlinkBooking(eventId, bookingId);
  }

  // ─── Presentations ─────────────────────────────────────────

  async generatePresentation(workspaceId: string, userId: string, data: {
    title: string;
    workspace_event_id?: string;
    artist_ids: string[];
    notes_per_artist?: Record<string, string>;
    custom_header?: string;
    custom_footer?: string;
    include_pricing?: boolean;
    include_media?: boolean;
    expires_at?: string;
  }) {
    await this.verifyMembership(workspaceId, userId);

    const slug = this.generatePresentationSlug();

    return workspaceRepository.createPresentation({
      workspace_id: workspaceId,
      workspace_event_id: data.workspace_event_id,
      title: data.title,
      slug,
      artist_ids: data.artist_ids,
      notes_per_artist: data.notes_per_artist,
      custom_header: data.custom_header,
      custom_footer: data.custom_footer,
      include_pricing: data.include_pricing,
      include_media: data.include_media,
      expires_at: data.expires_at,
      created_by: userId,
    });
  }

  async getPublicPresentation(slug: string) {
    const presentation = await workspaceRepository.getPresentationBySlug(slug);
    if (!presentation) {
      throw new WorkspaceError('PRESENTATION_NOT_FOUND', 'Presentation not found or has expired', 404);
    }

    // Parse artist_ids (may be stored as JSON string)
    const artistIds: string[] = typeof presentation.artist_ids === 'string'
      ? JSON.parse(presentation.artist_ids)
      : presentation.artist_ids;

    // Fetch artist data
    const artists = await db('artist_profiles')
      .whereIn('id', artistIds)
      .select(
        'id',
        'stage_name',
        'bio',
        'genres',
        'city',
        'trust_score',
        'profile_image_url',
      );

    // Fetch media thumbnails for each artist
    const media = await db('artist_media')
      .whereIn('artist_id', artistIds)
      .where({ is_active: true })
      .select('artist_id', 'media_type', 'url', 'thumbnail_url', 'title', 'sort_order')
      .orderBy('sort_order', 'asc');

    const mediaByArtist: Record<string, Array<Record<string, unknown>>> = {};
    for (const m of media) {
      const key = m.artist_id as string;
      if (!mediaByArtist[key]) mediaByArtist[key] = [];
      mediaByArtist[key].push(m);
    }

    // Fetch pricing if include_pricing is true
    let pricingByArtist: Record<string, Array<Record<string, unknown>>> = {};
    if (presentation.include_pricing) {
      const pricing = await db('artist_pricing')
        .whereIn('artist_id', artistIds)
        .where({ is_active: true })
        .select('artist_id', 'event_type', 'city_tier', 'base_price_paise', 'duration_hours');

      for (const p of pricing) {
        const key = p.artist_id as string;
        if (!pricingByArtist[key]) pricingByArtist[key] = [];
        pricingByArtist[key].push(p);
      }
    }

    // Parse notes_per_artist
    const notesPerArtist: Record<string, string> = typeof presentation.notes_per_artist === 'string'
      ? JSON.parse(presentation.notes_per_artist)
      : (presentation.notes_per_artist ?? {});

    // Fetch workspace branding
    const workspace = await workspaceRepository.findById(presentation.workspace_id);

    // Increment view count (fire-and-forget)
    workspaceRepository.incrementPresentationViews(presentation.id);

    return {
      presentation: {
        id: presentation.id,
        title: presentation.title,
        custom_header: presentation.custom_header,
        custom_footer: presentation.custom_footer,
        include_pricing: presentation.include_pricing,
        include_media: presentation.include_media,
        created_at: presentation.created_at,
      },
      workspace_branding: workspace ? {
        name: workspace.name,
        logo_url: workspace.logo_url,
        brand_color: workspace.brand_color,
      } : null,
      artists: artists.map((artist) => ({
        id: artist.id,
        stage_name: artist.stage_name,
        bio: artist.bio,
        genres: artist.genres,
        city: artist.city,
        trust_score: artist.trust_score,
        profile_image_url: artist.profile_image_url,
        notes: notesPerArtist[artist.id] ?? null,
        media: presentation.include_media ? (mediaByArtist[artist.id] ?? []) : [],
        pricing: presentation.include_pricing ? (pricingByArtist[artist.id] ?? []) : [],
      })),
    };
  }

  async getPresentations(workspaceId: string, userId: string) {
    await this.verifyMembership(workspaceId, userId);
    return workspaceRepository.getPresentations(workspaceId);
  }

  // ─── Analytics ─────────────────────────────────────────────

  async getAnalytics(workspaceId: string, userId: string, dateRange?: DateRange) {
    await this.verifyMembership(workspaceId, userId);
    return workspaceRepository.getAnalytics(workspaceId, dateRange);
  }

  // ─── Private Helpers ───────────────────────────────────────

  private async verifyMembership(workspaceId: string, userId: string) {
    const member = await workspaceRepository.getMember(workspaceId, userId);
    if (!member || !member.is_active) {
      throw new WorkspaceError('NOT_MEMBER', 'You are not a member of this workspace', 403);
    }
    return member;
  }

  private async verifyManagerAccess(workspaceId: string, userId: string) {
    const member = await this.verifyMembership(workspaceId, userId);
    if (member.role !== WorkspaceRole.OWNER && member.role !== WorkspaceRole.MANAGER) {
      throw new WorkspaceError('INSUFFICIENT_ROLE', 'This action requires owner or manager role', 403);
    }
    return member;
  }

  private async verifyOwnerAccess(workspaceId: string, userId: string) {
    const member = await this.verifyMembership(workspaceId, userId);
    if (member.role !== WorkspaceRole.OWNER) {
      throw new WorkspaceError('OWNER_REQUIRED', 'This action requires the workspace owner', 403);
    }
    return member;
  }

  private generateSlug(name: string, city?: string): string {
    const base = [name, city]
      .filter(Boolean)
      .join('-')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const random = Math.random().toString(36).substring(2, 6);
    return `${base}-${random}`;
  }

  private generatePresentationSlug(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let slug = '';
    for (let i = 0; i < 8; i++) {
      slug += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return slug;
  }
}

export const workspaceService = new WorkspaceService();
