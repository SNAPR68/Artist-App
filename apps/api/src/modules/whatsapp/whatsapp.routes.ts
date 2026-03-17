import type { FastifyInstance } from 'fastify';
import { whatsAppConversationService } from './whatsapp-conversation.service.js';
import { whatsAppProviderService } from './whatsapp-provider.service.js';
import { whatsAppRepository } from './whatsapp.repository.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';

export async function whatsappRoutes(app: FastifyInstance) {
  /**
   * POST /v1/whatsapp/webhook — Receive inbound WhatsApp messages
   * Public endpoint — verified by provider signature
   */
  app.post('/v1/whatsapp/webhook', async (request, reply) => {
    // Verify webhook signature
    const signature = request.headers['x-hub-signature-256'] as string
      || request.headers['x-whatsapp-signature'] as string
      || '';

    const rawBody = JSON.stringify(request.body);
    if (!whatsAppProviderService.verifyWebhookSignature(rawBody, signature)) {
      return reply.status(401).send({ success: false, data: null, errors: [{ code: 'INVALID_SIGNATURE', message: 'Webhook signature verification failed' }] });
    }

    // Extract message data (format depends on provider)
    const body = request.body as Record<string, unknown>;

    // Meta Cloud API format
    const entry = (body.entry as Record<string, unknown>[])?.[0];
    const changes = (entry?.changes as Record<string, unknown>[])?.[0];
    const value = changes?.value as Record<string, unknown>;
    const messages = (value?.messages as Record<string, unknown>[]) || [];

    for (const msg of messages) {
      const phone = msg.from as string;
      const text = (msg.text as Record<string, unknown>)?.body as string || msg.body as string || '';
      const msgId = msg.id as string;

      if (phone && text) {
        try {
          await whatsAppConversationService.handleInboundMessage(phone, text, msgId);
        } catch (err) {
          console.error(`[WHATSAPP] Error processing message from ${phone}:`, err);
        }
      }
    }

    // Always return 200 to acknowledge
    return reply.status(200).send({ success: true });
  });

  /**
   * GET /v1/whatsapp/webhook — Webhook verification (challenge)
   */
  app.get('/v1/whatsapp/webhook', async (request, reply) => {
    const query = request.query as Record<string, string>;
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    if (mode === 'subscribe' && token === whatsAppProviderService.getWebhookSecret()) {
      return reply.status(200).send(challenge);
    }

    return reply.status(403).send({ success: false, data: null, errors: [{ code: 'FORBIDDEN', message: 'Verification failed' }] });
  });

  /**
   * GET /v1/admin/whatsapp/conversations — List active conversations
   */
  app.get('/v1/admin/whatsapp/conversations', {
    preHandler: [authMiddleware, requirePermission('admin:whatsapp')],
  }, async (request, reply) => {
    const { page = 1, per_page = 20 } = request.query as { page?: number; per_page?: number };
    const result = await whatsAppRepository.listActiveConversations(Number(page), Number(per_page));

    return reply.send({ success: true, data: result.data, meta: result.meta, errors: [] });
  });

  /**
   * GET /v1/admin/whatsapp/conversations/:id/messages — View conversation messages
   */
  app.get('/v1/admin/whatsapp/conversations/:id/messages', {
    preHandler: [authMiddleware, requirePermission('admin:whatsapp')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const conversation = await whatsAppRepository.getConversation(id);
    if (!conversation) {
      return reply.status(404).send({ success: false, data: null, errors: [{ code: 'NOT_FOUND', message: 'Conversation not found' }] });
    }

    const messages = await whatsAppRepository.getMessages(id);

    return reply.send({ success: true, data: { conversation, messages }, errors: [] });
  });
}
