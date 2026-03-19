import type { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole } from '@artist-booking/shared';

/**
 * Permission matrix: defines which roles can access which resources/actions.
 */
const PERMISSIONS: Record<string, UserRole[]> = {
  // Artist profile management
  'artist:create': [UserRole.ARTIST],
  'artist:read_own': [UserRole.ARTIST],
  'artist:update_own': [UserRole.ARTIST],
  'artist:read_public': [UserRole.ARTIST, UserRole.AGENT, UserRole.CLIENT, UserRole.EVENT_COMPANY, UserRole.ADMIN],

  // Agent management
  'agent:create': [UserRole.AGENT],
  'agent:read_own': [UserRole.AGENT],
  'agent:update_own': [UserRole.AGENT],
  'agent:manage_roster': [UserRole.AGENT],

  // Client management
  'client:create': [UserRole.CLIENT, UserRole.EVENT_COMPANY],
  'client:read_own': [UserRole.CLIENT, UserRole.EVENT_COMPANY],
  'client:update_own': [UserRole.CLIENT, UserRole.EVENT_COMPANY],

  // Search
  'search:artists': [UserRole.CLIENT, UserRole.EVENT_COMPANY, UserRole.AGENT, UserRole.ADMIN],

  // Booking
  'booking:create': [UserRole.CLIENT, UserRole.EVENT_COMPANY, UserRole.AGENT],
  'booking:read_own': [UserRole.ARTIST, UserRole.CLIENT, UserRole.EVENT_COMPANY, UserRole.AGENT],
  'booking:respond': [UserRole.ARTIST],
  'booking:cancel': [UserRole.ARTIST, UserRole.CLIENT, UserRole.EVENT_COMPANY, UserRole.ADMIN],

  // Quotes
  'quote:create': [UserRole.ARTIST, UserRole.CLIENT, UserRole.EVENT_COMPANY],
  'quote:read': [UserRole.ARTIST, UserRole.CLIENT, UserRole.EVENT_COMPANY, UserRole.AGENT],

  // Payment
  'payment:create': [UserRole.CLIENT, UserRole.EVENT_COMPANY],
  'payment:read_own': [UserRole.ARTIST, UserRole.CLIENT, UserRole.EVENT_COMPANY, UserRole.AGENT],

  // Calendar
  'calendar:manage': [UserRole.ARTIST],
  'calendar:read_own': [UserRole.ARTIST],
  'calendar:update_own': [UserRole.ARTIST],
  'calendar:read_public': [UserRole.CLIENT, UserRole.EVENT_COMPANY, UserRole.AGENT, UserRole.ADMIN],

  // Media
  'media:upload': [UserRole.ARTIST],
  'media:manage': [UserRole.ARTIST],
  'media:delete_own': [UserRole.ARTIST],
  'media:read_public': [UserRole.ARTIST, UserRole.CLIENT, UserRole.EVENT_COMPANY, UserRole.AGENT, UserRole.ADMIN],

  // Reviews
  'review:create': [UserRole.ARTIST, UserRole.CLIENT, UserRole.EVENT_COMPANY],
  'review:read': [UserRole.ARTIST, UserRole.CLIENT, UserRole.EVENT_COMPANY, UserRole.AGENT, UserRole.ADMIN],

  // Shortlists
  'shortlist:manage': [UserRole.CLIENT, UserRole.EVENT_COMPANY, UserRole.AGENT],

  // Admin
  'admin:users': [UserRole.ADMIN],
  'admin:bookings': [UserRole.ADMIN],
  'admin:payments': [UserRole.ADMIN],
  'admin:moderate': [UserRole.ADMIN],

  // Disputes
  'dispute:create': [UserRole.ARTIST, UserRole.CLIENT, UserRole.EVENT_COMPANY],
  'dispute:read_own': [UserRole.ARTIST, UserRole.CLIENT, UserRole.EVENT_COMPANY],
  'admin:disputes': [UserRole.ADMIN],

  // Concierge
  'concierge:manage': [UserRole.ADMIN],

  // Coordination (pre-event)
  'coordination:read': [UserRole.ARTIST, UserRole.CLIENT, UserRole.EVENT_COMPANY, UserRole.AGENT],
  'coordination:update': [UserRole.ARTIST, UserRole.CLIENT, UserRole.EVENT_COMPANY, UserRole.AGENT],

  // Event-day operations
  'event_day:manage': [UserRole.ARTIST, UserRole.CLIENT, UserRole.EVENT_COMPANY],

  // Analytics
  'analytics:read': [UserRole.ADMIN],
  'analytics:fair_price': [UserRole.ARTIST, UserRole.CLIENT, UserRole.EVENT_COMPANY, UserRole.AGENT],

  // Event Context
  'event_context:create': [UserRole.ARTIST, UserRole.CLIENT, UserRole.EVENT_COMPANY],
  'event_context:read': [UserRole.ARTIST, UserRole.CLIENT, UserRole.EVENT_COMPANY, UserRole.AGENT],

  // Venues
  'venue:create': [UserRole.ADMIN, UserRole.CLIENT, UserRole.EVENT_COMPANY],
  'venue:read': [UserRole.ARTIST, UserRole.AGENT, UserRole.CLIENT, UserRole.EVENT_COMPANY, UserRole.ADMIN],
  'venue:update': [UserRole.ADMIN, UserRole.EVENT_COMPANY],

  // Rider
  'rider:manage': [UserRole.ARTIST],
  'rider:read': [UserRole.ARTIST, UserRole.CLIENT, UserRole.EVENT_COMPANY, UserRole.AGENT],
  'rider:check': [UserRole.ADMIN, UserRole.CLIENT, UserRole.EVENT_COMPANY, UserRole.AGENT],

  // Calendar Intelligence
  'calendar_intelligence:read': [UserRole.ARTIST, UserRole.AGENT],

  // Pricing Brain
  'pricing_brain:read': [UserRole.ARTIST, UserRole.AGENT],

  // WhatsApp Admin
  'admin:whatsapp': [UserRole.ADMIN],

  // Workspace
  'workspace:create': [UserRole.CLIENT, UserRole.EVENT_COMPANY],
  'workspace:read': [UserRole.CLIENT, UserRole.EVENT_COMPANY, UserRole.AGENT],
  'workspace:manage': [UserRole.CLIENT, UserRole.EVENT_COMPANY],
  'workspace:invite': [UserRole.CLIENT, UserRole.EVENT_COMPANY],
  'workspace:events': [UserRole.CLIENT, UserRole.EVENT_COMPANY],
  'workspace:presentations': [UserRole.CLIENT, UserRole.EVENT_COMPANY, UserRole.AGENT],
  'workspace:bulk_actions': [UserRole.CLIENT, UserRole.EVENT_COMPANY],
  'workspace:analytics': [UserRole.CLIENT, UserRole.EVENT_COMPANY],

  // Recommendations
  'recommendations:read_client': [UserRole.CLIENT, UserRole.EVENT_COMPANY, UserRole.AGENT],
  'recommendations:read_artist': [UserRole.ARTIST, UserRole.AGENT],
  'recommendations:feedback': [UserRole.ARTIST, UserRole.CLIENT, UserRole.EVENT_COMPANY, UserRole.AGENT],

  // Artist Intelligence (extended)
  'artist_intelligence:read': [UserRole.ARTIST],
  'artist_intelligence:read_agent': [UserRole.AGENT],
  'artist_intelligence:gig_advisor': [UserRole.ARTIST, UserRole.AGENT],

  // Dynamic Pricing
  'dynamic_pricing:read': [UserRole.ARTIST, UserRole.AGENT],
  'dynamic_pricing:manage_rules': [UserRole.ARTIST],
  'dynamic_pricing:surge_indicator': [UserRole.CLIENT, UserRole.EVENT_COMPANY, UserRole.AGENT, UserRole.ADMIN],

  // Voice Query
  'voice:query': [UserRole.ARTIST, UserRole.CLIENT, UserRole.EVENT_COMPANY, UserRole.AGENT],
  'voice:manage_sessions': [UserRole.ARTIST, UserRole.CLIENT, UserRole.EVENT_COMPANY, UserRole.AGENT],

  // Financial Command Center
  'financial:read_own': [UserRole.ARTIST, UserRole.AGENT],
  'financial:certificate': [UserRole.ARTIST],

  // Seasonal Demand Intelligence
  'seasonal:read_artist': [UserRole.ARTIST, UserRole.AGENT, UserRole.ADMIN],
  'seasonal:read_client': [UserRole.CLIENT, UserRole.EVENT_COMPANY, UserRole.AGENT, UserRole.ADMIN],
  'seasonal:alerts': [UserRole.ARTIST, UserRole.CLIENT, UserRole.EVENT_COMPANY, UserRole.AGENT],

  // Reputation Defense
  'reputation:dispute': [UserRole.ARTIST],
  'reputation:respond': [UserRole.ARTIST],
  'reputation:report_venue': [UserRole.ARTIST, UserRole.CLIENT, UserRole.EVENT_COMPANY],
  'admin:reputation': [UserRole.ADMIN],

  // Emergency Substitution
  'substitution:create': [UserRole.CLIENT, UserRole.EVENT_COMPANY, UserRole.AGENT, UserRole.ADMIN],
  'substitution:respond': [UserRole.ARTIST],
  'substitution:read': [UserRole.ARTIST, UserRole.CLIENT, UserRole.EVENT_COMPANY, UserRole.AGENT],

  // Gig Marketplace
  'gig:create': [UserRole.CLIENT, UserRole.EVENT_COMPANY, UserRole.AGENT],
  'gig:browse': [UserRole.ARTIST, UserRole.CLIENT, UserRole.EVENT_COMPANY, UserRole.AGENT],
  'gig:apply': [UserRole.ARTIST],

  // Gamification
  'gamification:read': [UserRole.ARTIST, UserRole.CLIENT, UserRole.EVENT_COMPANY, UserRole.AGENT],
  'gamification:claim_badge': [UserRole.ARTIST],

  // Artist Microsite
  'artist:microsite': [UserRole.ARTIST],
};

/**
 * Create an RBAC guard for specific permissions.
 *
 * Usage: `{ preHandler: [authMiddleware, requirePermission('booking:create')] }`
 */
export function requirePermission(...permissions: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;

    if (!user) {
      return reply.status(401).send({
        success: false,
        data: null,
        errors: [{ code: 'UNAUTHORIZED', message: 'Authentication required' }],
      });
    }

    // Admin has access to everything
    if (user.role === UserRole.ADMIN) return;

    const hasPermission = permissions.every((perm) => {
      const allowedRoles = PERMISSIONS[perm];
      if (!allowedRoles) return false;
      return allowedRoles.includes(user.role as UserRole);
    });

    if (!hasPermission) {
      return reply.status(403).send({
        success: false,
        data: null,
        errors: [{
          code: 'FORBIDDEN',
          message: `Insufficient permissions. Required: ${permissions.join(', ')}`,
        }],
      });
    }
  };
}

/**
 * Require that the authenticated user has one of the specified roles.
 */
export function requireRole(...roles: UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;

    if (!user) {
      return reply.status(401).send({
        success: false,
        data: null,
        errors: [{ code: 'UNAUTHORIZED', message: 'Authentication required' }],
      });
    }

    if (!roles.includes(user.role as UserRole)) {
      return reply.status(403).send({
        success: false,
        data: null,
        errors: [{
          code: 'FORBIDDEN',
          message: `This action requires one of: ${roles.join(', ')}`,
        }],
      });
    }
  };
}
