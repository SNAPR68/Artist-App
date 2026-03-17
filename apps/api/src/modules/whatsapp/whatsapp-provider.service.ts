/**
 * Abstract WhatsApp provider interface.
 * v1: Stub implementation that logs messages.
 * Replace with actual Gupshup/Twilio/Meta Cloud API integration.
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

    // TODO: Implement actual provider API call
    throw new Error(`Provider ${this.config.provider} not implemented`);
  }

  async sendTemplate(phone: string, templateId: string, params: Record<string, string>): Promise<string> {
    if (this.config.provider === 'stub') {
      console.log(`[WHATSAPP_STUB] → ${phone}: template=${templateId}, params=${JSON.stringify(params)}`);
      return `stub_${Date.now()}`;
    }

    throw new Error(`Provider ${this.config.provider} not implemented`);
  }

  async sendInteractiveList(phone: string, header: string, body: string, items: ListItem[]): Promise<string> {
    if (this.config.provider === 'stub') {
      console.log(`[WHATSAPP_STUB] → ${phone}: list header="${header}", body="${body}", ${items.length} items`);
      return `stub_${Date.now()}`;
    }

    throw new Error(`Provider ${this.config.provider} not implemented`);
  }

  async sendInteractiveButtons(phone: string, body: string, buttons: Button[]): Promise<string> {
    if (this.config.provider === 'stub') {
      console.log(`[WHATSAPP_STUB] → ${phone}: buttons body="${body}", ${buttons.length} buttons`);
      return `stub_${Date.now()}`;
    }

    throw new Error(`Provider ${this.config.provider} not implemented`);
  }

  /**
   * Verify webhook signature from provider.
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (this.config.provider === 'stub') return true;

    const expected = createHmac('sha256', this.config.webhookSecret)
      .update(payload)
      .digest('hex');
    return expected === signature;
  }

  getWebhookSecret(): string {
    return this.config.webhookSecret;
  }
}

export const whatsAppProviderService = new WhatsAppProviderService();
