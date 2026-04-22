/**
 * Event Company OS pivot (2026-04-22) — EPK (Electronic Press Kit) routes.
 *
 * POST   /v1/artists/:id/epk/generate     — render + upload the 4-file bundle
 * GET    /v1/artists/:id/epk/latest       — most recent artifact
 * GET    /v1/artists/:id/epk/history      — artifact history
 * POST   /v1/artists/:id/epk/upload       — vendor re-uploads their own files
 *
 * Scoping: an artist can only generate/upload for their own profile unless the
 * caller is admin. Public microsite reads go via the public vendor route.
 */
import type { FastifyInstance } from 'fastify';
import { db } from '../../infrastructure/database.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { rateLimit } from '../../middleware/rate-limiter.middleware.js';
import { epkService } from './epk.service.js';

async function assertVendorAccess(userId: string, role: string, vendorProfileId: string): Promise<boolean> {
  if (role === 'admin') return true;
  const row = await db('artist_profiles').where({ id: vendorProfileId }).first('user_id');
  return !!row && row.user_id === userId;
}

export async function epkRoutes(app: FastifyInstance) {
  /** POST /v1/artists/:id/epk/generate */
  app.post<{ Params: { id: string }; Body: { include_reel?: boolean } }>(
    '/v1/artists/:id/epk/generate',
    { preHandler: [authMiddleware, rateLimit('WRITE')] },
    async (request, reply) => {
      const ok = await assertVendorAccess(request.user!.user_id, request.user!.role, request.params.id);
      if (!ok) {
        return reply.status(403).send({
          success: false,
          errors: [{ code: 'FORBIDDEN', message: 'Cannot generate EPK for another vendor' }],
        });
      }
      try {
        const row = await epkService.generate(request.params.id, request.user!.user_id, {
          includeReel: request.body?.include_reel,
        });
        return reply.send({ success: true, data: row, errors: [] });
      } catch (e: any) {
        return reply.status(400).send({
          success: false,
          errors: [{ code: 'EPK_GENERATE_FAILED', message: e?.message ?? 'EPK generation failed' }],
        });
      }
    },
  );

  /** GET /v1/artists/:id/epk/latest */
  app.get<{ Params: { id: string } }>(
    '/v1/artists/:id/epk/latest',
    { preHandler: [authMiddleware, rateLimit('READ')] },
    async (request, reply) => {
      const row = await epkService.latest(request.params.id);
      return reply.send({ success: true, data: row ?? null, errors: [] });
    },
  );

  /** GET /v1/artists/:id/epk/history */
  app.get<{ Params: { id: string } }>(
    '/v1/artists/:id/epk/history',
    { preHandler: [authMiddleware, rateLimit('READ')] },
    async (request, reply) => {
      const rows = await epkService.list(request.params.id);
      return reply.send({ success: true, data: rows, errors: [] });
    },
  );

  /** POST /v1/artists/:id/epk/upload */
  app.post<{
    Params: { id: string };
    Body: {
      pdf_url?: string;
      pdf_s3_key?: string;
      xlsx_url?: string;
      xlsx_s3_key?: string;
      pptx_url?: string;
      pptx_s3_key?: string;
      mp4_url?: string;
      mp4_s3_key?: string;
      note?: string;
    };
  }>(
    '/v1/artists/:id/epk/upload',
    { preHandler: [authMiddleware, rateLimit('WRITE')] },
    async (request, reply) => {
      const ok = await assertVendorAccess(request.user!.user_id, request.user!.role, request.params.id);
      if (!ok) {
        return reply.status(403).send({
          success: false,
          errors: [{ code: 'FORBIDDEN', message: 'Cannot upload EPK for another vendor' }],
        });
      }
      try {
        const row = await epkService.recordUpload({
          vendor_profile_id: request.params.id,
          created_by_user_id: request.user!.user_id,
          ...request.body,
        });
        return reply.send({ success: true, data: row, errors: [] });
      } catch (e: any) {
        return reply.status(400).send({
          success: false,
          errors: [{ code: 'EPK_UPLOAD_FAILED', message: e?.message ?? 'EPK upload failed' }],
        });
      }
    },
  );
}
