import type { FastifyInstance } from 'fastify';
import { venueService } from './venue.service.js';
import { venueCompatibilityService } from './venue-compatibility.service.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { createVenueSchema, updateVenueSchema, addVenueEquipmentSchema, venueSearchSchema } from '@artist-booking/shared';

export async function venueRoutes(app: FastifyInstance) {
  /**
   * POST /v1/venues — Create a venue
   */
  app.post('/v1/venues', {
    preHandler: [authMiddleware, requirePermission('venue:create')],
  }, async (request, reply) => {
    const data = createVenueSchema.parse(request.body);
    const venue = await venueService.createVenue(request.user!.user_id, data);

    return reply.status(201).send({ success: true, data: venue, errors: [] });
  });

  /**
   * GET /v1/venues — Search/list venues
   */
  app.get('/v1/venues', {
    preHandler: [authMiddleware, requirePermission('venue:read')],
  }, async (request, reply) => {
    const filters = venueSearchSchema.parse(request.query);
    const result = await venueService.searchVenues(filters);

    return reply.send({ success: true, data: result.data, meta: result.meta, errors: [] });
  });

  /**
   * GET /v1/venues/:id — Get venue details
   */
  app.get('/v1/venues/:id', {
    preHandler: [authMiddleware, requirePermission('venue:read')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const venue = await venueService.getVenue(id);

    return reply.send({ success: true, data: venue, errors: [] });
  });

  /**
   * PUT /v1/venues/:id — Update venue
   */
  app.put('/v1/venues/:id', {
    preHandler: [authMiddleware, requirePermission('venue:update')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = updateVenueSchema.parse(request.body);
    const venue = await venueService.updateVenue(id, data);

    return reply.send({ success: true, data: venue, errors: [] });
  });

  /**
   * POST /v1/venues/:id/equipment — Add equipment to venue
   */
  app.post('/v1/venues/:id/equipment', {
    preHandler: [authMiddleware, requirePermission('venue:update')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = addVenueEquipmentSchema.parse(request.body);
    const equipment = await venueService.addEquipment(id, data);

    return reply.status(201).send({ success: true, data: equipment, errors: [] });
  });

  /**
   * DELETE /v1/venues/:id/equipment/:equipId — Remove equipment
   */
  app.delete('/v1/venues/:id/equipment/:equipId', {
    preHandler: [authMiddleware, requirePermission('venue:update')],
  }, async (request, reply) => {
    const { id, equipId } = request.params as { id: string; equipId: string };
    await venueService.removeEquipment(id, equipId);

    return reply.send({ success: true, data: { deleted: true }, errors: [] });
  });

  /**
   * GET /v1/venues/:id/compatibility/:artistId — Venue-artist compatibility
   */
  app.get('/v1/venues/:id/compatibility/:artistId', {
    preHandler: [authMiddleware, requirePermission('venue:read')],
  }, async (request, reply) => {
    const { id, artistId } = request.params as { id: string; artistId: string };
    const score = await venueCompatibilityService.getCompatibilityScore(artistId, id);

    return reply.send({ success: true, data: score, errors: [] });
  });

  /**
   * GET /v1/artists/:id/compatible-venues — List compatible venues for artist
   */
  app.get('/v1/artists/:id/compatible-venues', {
    preHandler: [authMiddleware, requirePermission('venue:read')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const results = await venueCompatibilityService.getCompatibleVenues(id);

    return reply.send({ success: true, data: results, errors: [] });
  });
}
