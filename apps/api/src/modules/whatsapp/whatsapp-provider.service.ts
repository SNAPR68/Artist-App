/**
 * WhatsApp provider abstraction.
 * Supports: stub (dev) | interakt (production)
 *
 * Env vars:
 *   WHATSAPP_PROVIDER=interakt
 *   WHATSAPP_API_KEY=<Interakt API key>
 *   WHATSAPP_WEBHOOK_SECRET=<Interakt webhook secret>
 *   WHATSAPP_FROM_NUMBER=<registered WhatsApp number, e.g. 919XXXXXXXXX>
 */

import { createHmac } from 'crypto';

export interface WhatsAppProviderConfig {
  provider: string;
  apiKey: string;
  webhookSecret: string;
  fromNumber: string;
}

export interface ListItem {
  id: string;
  title: string;
  description?: string;
}

export interface Button {
  id: string;
  title: string;
}

// ─── Interakt API helpers ────────────────────────────────────────────────────

const INTERAKT_BASE = 'https://api.interakt.ai/v1/public';

async function interaktPost(apiKey: string, path: string, body: unknown): Promise<string> {
  const res = await fetch(`${INTERAKT_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const json = await res.json() as { id?: string; message?: string; result?: boolean };
  if (!res.ok) {
    throw new Error(`Interakt error ${res.status}: ${json.message ?? JSON.stringify(json)}`);
  }
  return json.id ?? `interakt_${Date.now()}`;
}

// ─── Provider service ────────────────────────────────────────────────────────

export class WhatsAppProviderService {
  private config: WhatsAppProviderConfig;

  constructor() {
    this.config = {
      provider: process.env.WHATSAPP_PROVIDER || 'stub',
      apiKey: process.env.WHATSAPP_API_KEY || '',
      webhookSecret: process.env.WHATSAPP_WEBHOOK_SECRET || '',
      fromNumber: process.env.WHATSAPP_FROM_NUMBER || '',
    };
  }

  async sendText(phone: string, text: string): Promise<string> {
    if (this.config.provider === 'stub') {
      console.log(`[WHATSAPP_STUB] → ${phone}: ${text}`);
      return `stub_${Date.now()}`;
    }

    if (this.config.provider === 'interakt') {
      return interaktPost(this.config.apiKey, '/message/', {
        countryCode: phone.startsWith('+') ? phone.slice(1, phone.length - 10) : '91',
        phoneNumber: phone.replace(/^\+?91/, ''),
        callbackData: 'text',
        type: 'Text',
        data: { message: text },
      });
    }

    throw new Error(`Provider ${this.config.provider} not implemented`);
  }

  async sendTemplate(phone: string, templateId: string, params: Record<string, string>): Promise<string> {
    if (this.config.provider === 'stub') {
      console.log(`[WHATSAPP_STUB] → ${phone}: template=${templateId}, params=${JSON.stringify(params)}`);
      return `stub_${Date.now()}`;
    }

    if (this.config.provider === 'interakt') {
      // Interakt template params: array of values in order
      const headerParams: string[] = [];
      const bodyParams: string[] = [];

      // Conventions: keys starting with "header_" go to header, rest to body
      for (const [k, v] of Object.entries(params)) {
        if (k.startsWith('header_')) headerParams.push(v);
        else bodyParams.push(v);
      }

      return interaktPost(this.config.apiKey, '/message/', {
        countryCode: '91',
        phoneNumber: phone.replace(/^\+?91/, ''),
        callbackData: templateId,
        type: 'Template',
        template: {
          name: templateId,
          languageCode: 'en',
          ...(headerParams.length ? { headerValues: headerParams } : {}),
          ...(bodyParams.length ? { bodyValues: bodyParams } : {}),
        },
      });
    }

    throw new Error(`Provider ${this.config.provider} not implemented`);
  }

  async sendInteractiveList(phone: string, header: string, body: string, items: ListItem[]): Promise<string> {
    if (this.config.provider === 'stub') {
      console.log(`[WHATSAPP_STUB] → ${phone}: list header="${header}", body="${body}", ${items.length} items`);
      return `stub_${Date.now()}`;
    }

    if (this.config.provider === 'interakt') {
      return interaktPost(this.config.apiKey, '/message/', {
        countryCode: '91',
        phoneNumber: phone.replace(/^\+?91/, ''),
        callbackData: 'list',
        type: 'List',
        data: {
          header,
          body,
          footer: 'Powered by GRID',
          buttonText: 'Choose an option',
          sections: [{
            title: header,
            rows: items.map((item) => ({
              id: item.id,
              title: item.title.slice(0, 24),
              description: (item.description ?? '').slice(0, 72),
            })),
          }],
        },
      });
    }

    throw new Error(`Provider ${this.config.provider} not implemented`);
  }

  async sendInteractiveButtons(phone: string, body: string, buttons: Button[]): Promise<string> {
    if (this.config.provider === 'stub') {
      console.log(`[WHATSAPP_STUB] → ${phone}: buttons body="${body}", ${buttons.length} buttons`);
      return `stub_${Date.now()}`;
    }

    if (this.config.provider === 'interakt') {
      return interaktPost(this.config.apiKey, '/message/', {
        countryCode: '91',
        phoneNumber: phone.replace(/^\+?91/, ''),
        callbackData: 'buttons',
        type: 'Button',
        data: {
          message: body,
          buttons: buttons.slice(0, 3).map((btn) => ({
            type: 'reply',
            reply: { id: btn.id, title: btn.title.slice(0, 20) },
          })),
        },
      });
    }

    throw new Error(`Provider ${this.config.provider} not implemented`);
  }

  /**
   * Verify webhook signature from provider.
   * Interakt uses HMAC-SHA256 on raw body with webhook secret.
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (this.config.provider === 'stub') return true;
    if (!this.config.webhookSecret) return true; // not configured — pass through

    const expected = createHmac('sha256', this.config.webhookSecret)
      .update(payload)
      .digest('hex');

    // Accept both raw hex and "sha256=<hex>" prefixed formats
    const incoming = signature.startsWith('sha256=') ? signature.slice(7) : signature;
    return expected === incoming;
  }

  getWebhookSecret(): string {
    return this.config.webhookSecret;
  }
}

export const whatsAppProviderService = new WhatsAppProviderService();
