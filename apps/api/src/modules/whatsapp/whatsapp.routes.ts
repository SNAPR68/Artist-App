import type { FastifyInstance } from 'fastify';
import { whatsAppConversationService } from './whatsapp-conversation.service.js';
import { whatsAppProviderService } from './whatsapp-provider.service.js';
import { whatsAppRepository } from './whatsapp.repository.js';
import { ecConversationService } from './ec-conversation.service.js';
import { whisperService } from './whisper.service.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { db } from '../../infrastructure/database.js';

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

    const rawBody = (request as unknown as { rawBody?: string }).rawBody ?? JSON.stringify(request.body);
    if (!whatsAppProviderService.verifyWebhookSignature(rawBody, signature)) {
      return reply.status(401).send({ success: false, data: null, errors: [{ code: 'INVALID_SIGNATURE', message: 'Webhook signature verification failed' }] });
    }

    const body = request.body as Record<string, unknown>;
    const provider = process.env.WHATSAPP_PROVIDER || 'stub';

    /**
     * Normalise inbound messages across providers.
     * Each entry includes: phone, text (may be empty for audio), msgId,
     * and optional audio metadata for voice notes.
     */
    type InboundMsg = {
      phone: string;
      text: string;
      msgId: string;
      audio?: { url: string; mimeType: string };
    };
    const inbound: InboundMsg[] = [];

    if (provider === 'interakt') {
      const data = body.data as Record<string, unknown> | undefined;
      const msg = data?.message as Record<string, unknown> | undefined;
      if (msg) {
        const phone = msg.from as string;
        const msgId = msg.id as string || `interakt_${Date.now()}`;
        const msgType = msg.type as string | undefined;

        if (msgType === 'audio' || msgType === 'voice') {
          const audio = msg.audio as Record<string, unknown> | undefined
            ?? msg.voice as Record<string, unknown> | undefined;
          const url = audio?.url as string | undefined ?? audio?.link as string | undefined;
          const mimeType = (audio?.mime_type as string | undefined) ?? 'audio/ogg';
          if (phone && url) inbound.push({ phone, text: '', msgId, audio: { url, mimeType } });
        } else {
          const text = (msg.text as Record<string, unknown>)?.body as string
            || msg.body as string || '';
          if (phone && text) inbound.push({ phone, text, msgId });
        }
      }
    } else {
      // Meta Cloud API format
      const entry = (body.entry as Record<string, unknown>[])?.[0];
      const changes = (entry?.changes as Record<string, unknown>[])?.[0];
      const value = changes?.value as Record<string, unknown>;
      for (const msg of (value?.messages as Record<string, unknown>[]) ?? []) {
        const phone = msg.from as string;
        const msgId = msg.id as string;
        const msgType = msg.type as string | undefined;

        if (msgType === 'audio') {
          const audio = msg.audio as Record<string, unknown> | undefined;
          // Meta: audio.id → fetch URL via Graph API. For simplicity, store id as url placeholder.
          const mediaId = audio?.id as string | undefined;
          const mimeType = (audio?.mime_type as string | undefined) ?? 'audio/ogg';
          if (phone && mediaId) {
            // Resolve Meta media URL
            const graphUrl = `https://graph.facebook.com/v19.0/${mediaId}`;
            inbound.push({ phone, text: '', msgId, audio: { url: graphUrl, mimeType } });
          }
        } else {
          const text = (msg.text as Record<string, unknown>)?.body as string
            || msg.body as string || '';
          if (phone && text) inbound.push({ phone, text, msgId });
        }
      }
    }

    for (const { phone, text: rawText, msgId, audio } of inbound) {
      try {
        // ── Transcribe voice note if present ─────────────────────────────
        let text = rawText;
        if (audio?.url && !text) {
          const transcribed = await whisperService.transcribeUrl(audio.url, audio.mimeType);
          if (!transcribed) {
            // Can't transcribe — ask to resend as text
            const conversation = await whatsAppRepository.findOrCreateConversation(phone);
            const sorry = `Sorry, I couldn't understand your voice note. Please send your request as a text message.`;
            await whatsAppProviderService.sendText(phone, sorry);
            await whatsAppRepository.addMessage({
              conversation_id: conversation.id,
              direction: 'inbound',
              message_type: 'audio',
              content: `[voice note: ${audio.url}]`,
              provider_message_id: msgId,
              status: 'received',
            });
            continue;
          }
          text = transcribed;
        }

        if (!text) continue;

        // ── Route: event_company vs everyone else ─────────────────────────
        const conversation = await whatsAppRepository.findOrCreateConversation(phone);

        // Look up user by phone
        if (!conversation.user_id) {
          const user = await db('users').where({ phone }).first();
          if (user) await whatsAppRepository.linkUser(conversation.id, user.id);
        }

        const conv = await whatsAppRepository.getConversation(conversation.id);
        const userId = conv?.user_id as string | undefined;

        let isEventCompany = false;
        if (userId) {
          const roleRow = await db('user_roles').where({ user_id: userId, role: 'event_company' }).first();
          isEventCompany = !!roleRow;
        }

        // Log inbound
        await whatsAppRepository.addMessage({
          conversation_id: conversation.id,
          direction: 'inbound',
          message_type: audio ? 'audio' : 'text',
          content: audio ? `[voice note transcribed] ${text}` : text,
          provider_message_id: msgId,
          status: 'received',
        });

        if (isEventCompany && userId) {
          await ecConversationService.handle(phone, text, userId, conversation.id);
        } else {
          await whatsAppConversationService.handleInboundMessage(phone, text, msgId);
        }
      } catch (err) {
        console.error(`[WHATSAPP] Error processing message from ${phone}:`, err);
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
