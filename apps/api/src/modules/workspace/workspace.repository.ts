import { db } from '../../infrastructure/database.js';

// ─── Interfaces ────────────────────────────────────────────────

export interface CreateWorkspaceData {
  name: string;
  slug: string;
  owner_user_id: string;
  description?: string;
  website?: string;
  city?: string;
  company_type?: string;
  logo_url?: string;
  brand_color?: string;
}

export interface UpdateWorkspaceData {
  name?: string;
  description?: string;
  website?: string;
  city?: string;
  company_type?: string;
  logo_url?: string;
  brand_color?: string;
}

export interface AddMemberData {
  workspace_id: string;
  user_id: string;
  role: string;
  invited_by: string;
}

export interface CreateEventData {
  workspace_id: string;
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
  status?: string;
  created_by: string;
}

export interface UpdateEventData {
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
}

export interface CreatePresentationData {
  workspace_id: string;
  workspace_event_id?: string;
  title: string;
  slug: string;
  artist_ids: string[];
  notes_per_artist?: Record<string, string>;
  custom_header?: string;
  custom_footer?: string;
  include_pricing?: boolean;
  include_media?: boolean;
  expires_at?: string;
  created_by: string;
}

export interface PipelineFilters {
  state?: string;
  event_type?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  per_page?: number;
}

export interface DateRange {
  start_date: string;
  end_date: string;
}

// ─── Repository ────────────────────────────────────────────────

export class WorkspaceRepository {
  // ─── Workspace CRUD ─────────────────────────────────────────

  async createWorkspace(data: CreateWorkspaceData) {
    const [workspace] = await db('workspaces')
      .insert({
        name: data.name,
        slug: data.slug,
        owner_user_id: data.owner_user_id,
        description: data.description ?? null,
        website: data.website ?? null,
        city: data.city ?? null,
        company_type: data.company_type ?? null,
        logo_url: data.logo_url ?? null,
        brand_color: data.brand_color ?? null,
        is_active: true,
      })
      .returning('*');
    return workspace;
  }

  async findById(id: string) {
    return db('workspaces')
      .where({ id, is_active: true })
      .first();
  }

  async findBySlug(slug: string) {
    return db('workspaces')
      .where({ slug, is_active: true })
      .first();
  }

  async findByOwnerId(userId: string) {
    return db('workspaces')
      .where({ owner_user_id: userId, is_active: true })
      .orderBy('created_at', 'desc');
  }

  async findByMemberId(userId: string) {
    return db('workspaces as w')
      .join('workspace_members as wm', 'wm.workspace_id', 'w.id')
      .where({ 'wm.user_id': userId, 'wm.is_active': true, 'w.is_active': true })
      .select('w.*')
      .orderBy('w.created_at', 'desc');
  }

  async updateWorkspace(id: string, data: UpdateWorkspaceData) {
    const updateData: Record<string, unknown> = { updated_at: new Date() };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.website !== undefined) updateData.website = data.website;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.company_type !== undefined) updateData.company_type = data.company_type;
    if (data.logo_url !== undefined) updateData.logo_url = data.logo_url;
    if (data.brand_color !== undefined) updateData.brand_color = data.brand_color;

    const [updated] = await db('workspaces')
      .where({ id })
      .update(updateData)
      .returning('*');
    return updated;
  }

  // ─── Members ────────────────────────────────────────────────

  async addMember(data: AddMemberData) {
    const [member] = await db('workspace_members')
      .insert({
        workspace_id: data.workspace_id,
        user_id: data.user_id,
        role: data.role,
        invited_by: data.invited_by,
        invited_at: new Date(),
        is_active: true,
      })
      .returning('*');
    return member;
  }

  async updateMemberRole(workspaceId: string, userId: string, role: string) {
    const [updated] = await db('workspace_members')
      .where({ workspace_id: workspaceId, user_id: userId, is_active: true })
      .update({ role, updated_at: new Date() })
      .returning('*');
    return updated;
  }

  async removeMember(workspaceId: string, userId: string) {
    const [updated] = await db('workspace_members')
      .where({ workspace_id: workspaceId, user_id: userId })
      .update({ is_active: false, updated_at: new Date() })
      .returning('*');
    return updated;
  }

  async getMembers(workspaceId: string) {
    return db('workspace_members as wm')
      .join('users as u', 'u.id', 'wm.user_id')
      .where({ 'wm.workspace_id': workspaceId, 'wm.is_active': true })
      .select(
        'wm.id',
        'wm.workspace_id',
        'wm.user_id',
        'wm.role',
        'wm.invited_by',
        'wm.invited_at',
        'wm.accepted_at',
        'wm.is_active',
        'wm.created_at',
        'wm.updated_at',
        'u.phone',
        'u.email',
      )
      .orderBy('wm.created_at', 'asc');
  }

  async getMember(workspaceId: string, userId: string) {
    return db('workspace_members')
      .where({ workspace_id: workspaceId, user_id: userId })
      .first();
  }

  async acceptInvitation(workspaceId: string, userId: string) {
    const [updated] = await db('workspace_members')
      .where({ workspace_id: workspaceId, user_id: userId, is_active: true })
      .update({ accepted_at: new Date(), updated_at: new Date() })
      .returning('*');
    return updated;
  }

  // ─── Events ─────────────────────────────────────────────────

  async createEvent(data: CreateEventData) {
    const [event] = await db('workspace_events')
      .insert({
        workspace_id: data.workspace_id,
        name: data.name,
        event_date: data.event_date,
        event_end_date: data.event_end_date ?? null,
        event_city: data.event_city,
        venue_id: data.venue_id ?? null,
        event_type: data.event_type,
        guest_count: data.guest_count ?? null,
        budget_min_paise: data.budget_min_paise ?? null,
        budget_max_paise: data.budget_max_paise ?? null,
        notes: data.notes ?? null,
        client_name: data.client_name ?? null,
        client_phone: data.client_phone ?? null,
        client_email: data.client_email ?? null,
        status: data.status ?? 'planning',
        created_by: data.created_by,
      })
      .returning('*');
    return event;
  }

  async updateEvent(eventId: string, data: UpdateEventData) {
    const updateData: Record<string, unknown> = { updated_at: new Date() };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.event_date !== undefined) updateData.event_date = data.event_date;
    if (data.event_end_date !== undefined) updateData.event_end_date = data.event_end_date;
    if (data.event_city !== undefined) updateData.event_city = data.event_city;
    if (data.venue_id !== undefined) updateData.venue_id = data.venue_id;
    if (data.event_type !== undefined) updateData.event_type = data.event_type;
    if (data.guest_count !== undefined) updateData.guest_count = data.guest_count;
    if (data.budget_min_paise !== undefined) updateData.budget_min_paise = data.budget_min_paise;
    if (data.budget_max_paise !== undefined) updateData.budget_max_paise = data.budget_max_paise;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.client_name !== undefined) updateData.client_name = data.client_name;
    if (data.client_phone !== undefined) updateData.client_phone = data.client_phone;
    if (data.client_email !== undefined) updateData.client_email = data.client_email;
    if (data.status !== undefined) updateData.status = data.status;

    const [updated] = await db('workspace_events')
      .where({ id: eventId })
      .update(updateData)
      .returning('*');
    return updated;
  }

  async getEvents(workspaceId: string, filters?: { status?: string; start_date?: string; end_date?: string; page?: number; per_page?: number }) {
    const page = filters?.page ?? 1;
    const perPage = filters?.per_page ?? 20;

    let query = db('workspace_events')
      .where({ workspace_id: workspaceId, deleted_at: null });

    if (filters?.status) {
      query = query.where('status', filters.status);
    }
    if (filters?.start_date) {
      query = query.where('event_date', '>=', filters.start_date);
    }
    if (filters?.end_date) {
      query = query.where('event_date', '<=', filters.end_date);
    }

    const total = await query.clone().count('id as count').first();
    const events = await query
      .orderBy('event_date', 'asc')
      .limit(perPage)
      .offset((page - 1) * perPage);

    return {
      events,
      pagination: {
        total: Number(total?.count ?? 0),
        page,
        per_page: perPage,
        total_pages: Math.ceil(Number(total?.count ?? 0) / perPage),
      },
    };
  }

  async getEventById(eventId: string) {
    return db('workspace_events')
      .where({ id: eventId, deleted_at: null })
      .first();
  }

  // ─── Event Bookings ────────────────────────────────────────

  async linkBookingToEvent(eventId: string, bookingId: string, roleLabel?: string) {
    const maxSort = await db('workspace_event_bookings')
      .where({ workspace_event_id: eventId })
      .max('sort_order as max')
      .first();

    const [link] = await db('workspace_event_bookings')
      .insert({
        workspace_event_id: eventId,
        booking_id: bookingId,
        role_label: roleLabel ?? null,
        sort_order: (maxSort?.max ?? 0) + 1,
      })
      .returning('*');
    return link;
  }

  async unlinkBooking(eventId: string, bookingId: string) {
    return db('workspace_event_bookings')
      .where({ workspace_event_id: eventId, booking_id: bookingId })
      .del();
  }

  async getEventWithBookings(eventId: string) {
    const event = await db('workspace_events')
      .where({ id: eventId, deleted_at: null })
      .first();

    if (!event) return null;

    const bookings = await db('workspace_event_bookings as web')
      .join('bookings as b', 'b.id', 'web.booking_id')
      .leftJoin('artist_profiles as ap', 'ap.id', 'b.artist_id')
      .where({ 'web.workspace_event_id': eventId })
      .select(
        'web.id as link_id',
        'web.role_label',
        'web.sort_order',
        'web.notes',
        'web.created_at as linked_at',
        'b.id as booking_id',
        'b.state',
        'b.event_type',
        'b.event_date',
        'b.event_city',
        'b.quoted_amount_paise',
        'b.final_amount_paise',
        'ap.id as artist_id',
        'ap.stage_name',
        'ap.genres',
        'ap.trust_score',
      )
      .orderBy('web.sort_order', 'asc');

    return { ...event, bookings };
  }

  // ─── Presentations ─────────────────────────────────────────

  async createPresentation(data: CreatePresentationData) {
    const [presentation] = await db('workspace_presentations')
      .insert({
        workspace_id: data.workspace_id,
        workspace_event_id: data.workspace_event_id ?? null,
        title: data.title,
        slug: data.slug,
        artist_ids: JSON.stringify(data.artist_ids),
        notes_per_artist: JSON.stringify(data.notes_per_artist ?? {}),
        custom_header: data.custom_header ?? null,
        custom_footer: data.custom_footer ?? null,
        include_pricing: data.include_pricing ?? false,
        include_media: data.include_media ?? true,
        is_active: true,
        view_count: 0,
        created_by: data.created_by,
        expires_at: data.expires_at ?? null,
      })
      .returning('*');
    return presentation;
  }

  async getPresentationBySlug(slug: string) {
    return db('workspace_presentations')
      .where({ slug, is_active: true })
      .where(function () {
        this.whereNull('expires_at').orWhere('expires_at', '>', new Date());
      })
      .first();
  }

  async getPresentations(workspaceId: string) {
    return db('workspace_presentations')
      .where({ workspace_id: workspaceId, is_active: true })
      .orderBy('created_at', 'desc');
  }

  async incrementPresentationViews(id: string) {
    await db('workspace_presentations')
      .where({ id })
      .increment('view_count', 1);
  }

  // ─── Booking Pipeline ──────────────────────────────────────

  async getBookingPipeline(workspaceId: string, filters?: PipelineFilters) {
    const page = filters?.page ?? 1;
    const perPage = filters?.per_page ?? 20;

    let query = db('bookings as b')
      .leftJoin('artist_profiles as ap', 'ap.id', 'b.artist_id')
      .where({ 'b.workspace_id': workspaceId, 'b.deleted_at': null });

    if (filters?.state) {
      query = query.where('b.state', filters.state);
    }
    if (filters?.event_type) {
      query = query.where('b.event_type', filters.event_type);
    }
    if (filters?.start_date) {
      query = query.where('b.event_date', '>=', filters.start_date);
    }
    if (filters?.end_date) {
      query = query.where('b.event_date', '<=', filters.end_date);
    }

    const total = await query.clone().count('b.id as count').first();

    const bookings = await query.clone()
      .select(
        'b.id',
        'b.state',
        'b.event_type',
        'b.event_date',
        'b.event_city',
        'b.event_venue',
        'b.duration_hours',
        'b.guest_count',
        'b.quoted_amount_paise',
        'b.final_amount_paise',
        'b.created_at',
        'b.updated_at',
        'ap.id as artist_id',
        'ap.stage_name',
        'ap.genres',
      )
      .orderBy('b.event_date', 'asc')
      .limit(perPage)
      .offset((page - 1) * perPage);

    // Group by state for pipeline view
    const stateCountsRaw = await db('bookings')
      .where({ workspace_id: workspaceId, deleted_at: null })
      .select('state')
      .count('id as count')
      .groupBy('state');

    const stateCounts: Record<string, number> = {};
    for (const row of stateCountsRaw) {
      stateCounts[row.state as string] = Number(row.count);
    }

    return {
      bookings,
      state_counts: stateCounts,
      pagination: {
        total: Number(total?.count ?? 0),
        page,
        per_page: perPage,
        total_pages: Math.ceil(Number(total?.count ?? 0) / perPage),
      },
    };
  }

  // ─── Commission ───────────────────────────────────────────

  async getCommissionSummary(workspaceId: string) {
    // Get workspace default commission
    const workspace = await db('workspaces')
      .where({ id: workspaceId, is_active: true })
      .select('default_commission_pct')
      .first();

    const defaultPct = Number(workspace?.default_commission_pct ?? 0);

    // Get all event bookings with booking details for this workspace
    const rows = await db('workspace_event_bookings as web')
      .join('workspace_events as we', 'we.id', 'web.workspace_event_id')
      .join('bookings as b', 'b.id', 'web.booking_id')
      .leftJoin('artist_profiles as ap', 'ap.id', 'b.artist_id')
      .where({ 'we.workspace_id': workspaceId, 'we.deleted_at': null })
      .select(
        'web.id as workspace_event_booking_id',
        'web.commission_pct',
        'web.commission_amount_paise',
        'web.workspace_event_id',
        'we.name as event_name',
        'b.id as booking_id',
        'b.final_amount_paise',
        'b.quoted_amount_paise',
        'b.state',
        'ap.id as artist_id',
        'ap.stage_name as artist_name',
      )
      .orderBy('web.commission_amount_paise', 'desc');

    let totalBookingValuePaise = 0;
    let totalCommissionPaise = 0;

    const bookings = rows.map((row: Record<string, unknown>) => {
      const agreedAmount = Number(row.final_amount_paise ?? row.quoted_amount_paise ?? 0);
      const commPct = row.commission_pct != null ? Number(row.commission_pct) : defaultPct;
      const commAmount = row.commission_amount_paise != null
        ? Number(row.commission_amount_paise)
        : Math.round(agreedAmount * (commPct / 100));

      totalBookingValuePaise += agreedAmount;
      totalCommissionPaise += commAmount;

      return {
        workspace_event_booking_id: row.workspace_event_booking_id,
        workspace_event_id: row.workspace_event_id,
        event_name: row.event_name,
        booking_id: row.booking_id,
        artist_id: row.artist_id,
        artist_name: row.artist_name,
        booking_amount_paise: agreedAmount,
        commission_pct: commPct,
        commission_amount_paise: commAmount,
        state: row.state,
      };
    });

    return {
      default_commission_pct: defaultPct,
      total_bookings: bookings.length,
      total_booking_value_paise: totalBookingValuePaise,
      total_commission_paise: totalCommissionPaise,
      bookings,
    };
  }

  async updateWorkspaceCommission(workspaceId: string, defaultCommissionPct: number) {
    const [updated] = await db('workspaces')
      .where({ id: workspaceId })
      .update({
        default_commission_pct: defaultCommissionPct,
        updated_at: new Date(),
      })
      .returning('*');
    return updated;
  }

  async updateBookingCommission(workspaceEventBookingId: string, commissionPct: number) {
    // Get the booking amount to compute commission
    const row = await db('workspace_event_bookings as web')
      .join('bookings as b', 'b.id', 'web.booking_id')
      .where({ 'web.id': workspaceEventBookingId })
      .select('b.final_amount_paise', 'b.quoted_amount_paise')
      .first();

    const agreedAmount = Number(row?.final_amount_paise ?? row?.quoted_amount_paise ?? 0);
    const commissionAmountPaise = Math.round(agreedAmount * (commissionPct / 100));

    const [updated] = await db('workspace_event_bookings')
      .where({ id: workspaceEventBookingId })
      .update({
        commission_pct: commissionPct,
        commission_amount_paise: commissionAmountPaise,
      })
      .returning('*');
    return updated;
  }

  // ─── Analytics ─────────────────────────────────────────────

  async getAnalytics(workspaceId: string, dateRange?: DateRange) {
    let baseQuery = db('bookings')
      .where({ workspace_id: workspaceId, deleted_at: null });

    if (dateRange?.start_date) {
      baseQuery = baseQuery.where('event_date', '>=', dateRange.start_date);
    }
    if (dateRange?.end_date) {
      baseQuery = baseQuery.where('event_date', '<=', dateRange.end_date);
    }

    // Total spend
    const spendResult = await baseQuery.clone()
      .sum('final_amount_paise as total_spend')
      .count('id as booking_count')
      .first();

    // Completion rate
    const completedCount = await baseQuery.clone()
      .where('state', 'completed')
      .count('id as count')
      .first();

    const totalCount = Number(spendResult?.booking_count ?? 0);
    const completionRate = totalCount > 0
      ? Number(completedCount?.count ?? 0) / totalCount
      : 0;

    // Top artists by booking count
    const topArtists = await baseQuery.clone()
      .join('artist_profiles as ap', 'ap.id', 'bookings.artist_id')
      .select('ap.id as artist_id', 'ap.stage_name')
      .count('bookings.id as booking_count')
      .sum('bookings.final_amount_paise as total_revenue_paise')
      .groupBy('ap.id', 'ap.stage_name')
      .orderBy('booking_count', 'desc')
      .limit(10);

    // Monthly revenue breakdown
    const monthlyRevenue = await baseQuery.clone()
      .select(
        db.raw("to_char(event_date, 'YYYY-MM') as month"),
      )
      .sum('final_amount_paise as revenue_paise')
      .count('id as booking_count')
      .groupBy(db.raw("to_char(event_date, 'YYYY-MM')"))
      .orderBy('month', 'asc');

    return {
      total_spend_paise: Number(spendResult?.total_spend ?? 0),
      booking_count: totalCount,
      completion_rate: Math.round(completionRate * 100) / 100,
      top_artists: topArtists.map((a) => ({
        artist_id: a.artist_id,
        stage_name: a.stage_name,
        booking_count: Number(a.booking_count),
        total_revenue_paise: Number(a.total_revenue_paise ?? 0),
      })),
      monthly_revenue: monthlyRevenue.map((m: Record<string, unknown>) => ({
        month: m.month,
        revenue_paise: Number(m.revenue_paise ?? 0),
        booking_count: Number(m.booking_count),
      })),
    };
  }
}

export const workspaceRepository = new WorkspaceRepository();
