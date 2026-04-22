/**
 * Event Company OS pivot (2026-04-22) — Outbound voice routes.
 *
 * POST   /v1/outbound-voice/calls                    — Queue a call
 * GET    /v1/outbound-voice/calls/:id                — Call detail
 * GET    /v1/outbound-voice/event-files/:eid/calls   — All calls for an event file
 * POST   /v1/outbound-voice/calls/:id/webhook        — Provider status/transcript webhook
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { outboundVoiceService, type QueueCallInput } from './outbound-voice.service.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { rateLimit } from '../../middleware/rate-limiter.middleware.js';

const queueCallSchema = z.object({
  vendor_profile_id: z.string().uuid(),
  purpose: z.enum(['availability', 'call_sheet_confirm', 'day_of_checkin', 'rider_confirm']),
  event_file_id: z.string().uuid().optional(),
  booking_id: z.string().uuid().optional(),
});

const webhookSchema = z.object({
  status: z.enum(['dialing', 'answered', 'completed', 'failed', 'no_answer']),
  provider: z.string().optional(),
  provider_call_sid: z.string().optional(),
  transcript: z.string().optional(),
  duration_seconds: z.number().int().nonnegative().optional(),
  recording_url: z.string().url().optional(),
  available: z.boolean().optional(),
  ai_summary: z.record(z.any()).optional(),
});

function zodFail(reply: any, issues: { path: (string | number)[]; message: string }[]) {
  return reply.status(400).send({
    success: false,
    errors: issues.map((i) => ({
      code: 'VALIDATION_ERROR',
      message: `${i.path.join('.') || '(root)'}: ${i.message}`,
    })),
  });
}

export async function outboundVoiceRoutes(app: FastifyInstance) {
  app.post(
    '/v1/outbound-voice/calls',
    { preHandler: [authMiddleware, rateLimit('WRITE')] },
    async (request, reply) => {
      const parsed = queueCallSchema.safeParse(request.body);
      if (!parsed.success) return zodFail(reply, parsed.error.issues);

      try {
        const call = await outboundVoiceService.queueCall({
          ...parsed.data,
          initiated_by_user_id: request.user!.user_id,
        } as QueueCallInput);
        return reply.status(201).send({ success: true, data: call, errors: [] });
      } catch (err: any) {
        if (err?.message === 'VENDOR_NOT_FOUND') {
          return reply.status(404).send({
            success: false,
            errors: [{ code: 'VENDOR_NOT_FOUND', message: 'Vendor not found' }],
          });
        }
        if (typeof err?.message === 'string' && err.message.startsWith('UNSUPPORTED_SCRIPT:')) {
          return reply.status(422).send({
            success: false,
            errors: [{ code: 'UNSUPPORTED_SCRIPT', message: err.message }],
          });
        }
        throw err;
      }
    },
  );

  app.get(
    '/v1/outbound-voice/calls/:id',
    { preHandler: [authMiddleware, rateLimit('READ')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const call = await outboundVoiceService.get(id);
      if (!call) {
        return reply.status(404).send({
          success: false,
          errors: [{ code: 'NOT_FOUND', message: 'Call not found' }],
        });
      }
      return reply.send({ success: true, data: call, errors: [] });
    },
  );

  app.post(
    '/v1/outbound-voice/event-files/:eid/day-of-checkin',
    { preHandler: [authMiddleware, rateLimit('WRITE')] },
    async (request, reply) => {
      const { eid } = request.params as { eid: string };
      const result = await outboundVoiceService.bulkDayOfCheckin({
        event_file_id: eid,
        initiated_by_user_id: request.user!.user_id,
      });
      return reply.status(201).send({ success: true, data: result, errors: [] });
    },
  );

  app.get(
    '/v1/outbound-voice/event-files/:eid/calls',
    { preHandler: [authMiddleware, rateLimit('READ')] },
    async (request, reply) => {
      const { eid } = request.params as { eid: string };
      const calls = await outboundVoiceService.listForEventFile(eid);
      return reply.send({ success: true, data: calls, errors: [] });
    },
  );

  // Webhook from telephony provider. No auth middleware — gated by provider_call_sid
  // matching the DB row + shared secret header in production. In MVP we accept and log.
  app.post(
    '/v1/outbound-voice/calls/:id/webhook',
    { preHandler: [rateLimit('WRITE')] },
    async (request, reply) => {
      const parsed = webhookSchema.safeParse(request.body);
      if (!parsed.success) return zodFail(reply, parsed.error.issues);

      const { id } = request.params as { id: string };
      const patch: Record<string, unknown> = { status: parsed.data.status };
      if (parsed.data.provider) patch.provider = parsed.data.provider;
      if (parsed.data.provider_call_sid) patch.provider_call_sid = parsed.data.provider_call_sid;
      if (parsed.data.transcript) patch.transcript = parsed.data.transcript;
      if (parsed.data.duration_seconds !== undefined) patch.duration_seconds = parsed.data.duration_seconds;
      if (parsed.data.recording_url) patch.recording_url = parsed.data.recording_url;
      if (parsed.data.available !== undefined) patch.available = parsed.data.available;
      if (parsed.data.ai_summary) patch.ai_summary = JSON.stringify(parsed.data.ai_summary);
      if (['completed', 'failed', 'no_answer'].includes(parsed.data.status)) {
        patch.ended_at = new Date();
      }

      const row = await outboundVoiceService.markStatus(id, patch);
      if (!row) {
        return reply.status(404).send({
          success: false,
          errors: [{ code: 'NOT_FOUND', message: 'Call not found' }],
        });
      }
      return reply.send({ success: true, data: row, errors: [] });
    },
  );
}
