import { providersConfig } from '../config/providers.js';
import { logger } from '../utils/logger.js';

/**
 * Gupshup WhatsApp messaging service.
 * Sends transactional messages and notifications via WhatsApp Business API.
 */

export interface WhatsAppMessageOptions {
  phoneNumber: string;
  message: string;
  templateName?: string;
  templateParams?: Record<string, string>;
}

class WhatsAppService {
  private enabled: boolean;
  private userId?: string;
  private password?: string;
  private appName?: string;

  constructor() {
    this.enabled = providersConfig.gupshup.enabled;
    this.userId = providersConfig.gupshup.userId;
    this.password = providersConfig.gupshup.password;
    this.appName = providersConfig.gupshup.appName;
    // sourceNumber is stored but not used in this implementation

    if (!this.enabled) {
      logger.warn('WhatsApp service disabled: Gupshup credentials not configured');
    }
  }

  /**
   * Send a WhatsApp message
   */
  async sendMessage(options: WhatsAppMessageOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Validate phone number
      const formattedPhone = this.formatPhoneNumber(options.phoneNumber);
      if (!formattedPhone) {
        throw new Error(`Invalid phone number: ${options.phoneNumber}`);
      }

      if (this.enabled) {
        return await this.sendViaGupshup(formattedPhone, options);
      }

      return this.logToConsole(options);
    } catch (error) {
      logger.error('Failed to send WhatsApp message', error instanceof Error ? error : { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send message via Gupshup API
   */
  private async sendViaGupshup(
    phone: string,
    options: WhatsAppMessageOptions,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const params = new URLSearchParams();
      params.append('userid', this.userId || '');
      params.append('password', this.password || '');
      params.append('phone_number', phone);
      params.append('method', 'SendMessage');
      params.append('app_name', this.appName || 'default');
      params.append('message', options.message);

      const response = await fetch('https://api.gupshup.io/sm/api/v1/msg', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Gupshup API error: ${text}`);
      }

      const data = await response.text();
      const messageId = this.extractMessageId(data);

      logger.info('WhatsApp message sent via Gupshup', {
        phone: this.maskPhone(phone),
        messageId,
      });

      return {
        success: true,
        messageId,
      };
    } catch (error) {
      logger.error('Gupshup WhatsApp API error', error instanceof Error ? error : { error });
      throw error;
    }
  }

  /**
   * Fallback: log message to console
   */
  private logToConsole(options: WhatsAppMessageOptions): { success: boolean; messageId?: string } {
    const messageId = `console-wa-${Date.now()}`;
    logger.info('[CONSOLE WHATSAPP]', {
      phone: this.maskPhone(options.phoneNumber),
      message: options.message.substring(0, 100),
      messageId,
    });
    return { success: true, messageId };
  }

  /**
   * Format phone number to international format
   */
  private formatPhoneNumber(phone: string): string {
    // Remove all non-digits
    const cleaned = phone.replace(/\D/g, '');

    // If length is 10 (India), add country code
    if (cleaned.length === 10) {
      return `91${cleaned}`;
    }

    // If length is 12 and starts with 91, it's already formatted
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
      return cleaned;
    }

    // Otherwise, assume it's already formatted with country code
    return cleaned;
  }

  /**
   * Mask phone number for logging
   */
  private maskPhone(phone: string): string {
    return phone.substring(0, phone.length - 4) + '****';
  }

  /**
   * Extract message ID from Gupshup response
   */
  private extractMessageId(response: string): string {
    const match = response.match(/(?:id|message_id)["\s:]*(\d+)/i);
    return match ? match[1] : `gupshup-${Date.now()}`;
  }

  /**
   * Send OTP via WhatsApp
   */
  async sendOtp(phoneNumber: string, otp: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    return this.sendMessage({
      phoneNumber,
      message: `Your OTP for Artist Booking Platform is: ${otp}. This expires in 10 minutes. Do not share this with anyone.`,
    });
  }

  /**
   * Send booking confirmation via WhatsApp
   */
  async sendBookingConfirmation(
    phoneNumber: string,
    details: { bookingId: string; artistName: string; eventDate: string; amount: number },
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    return this.sendMessage({
      phoneNumber,
      message: `Your booking with ${details.artistName} on ${details.eventDate} is confirmed. Booking ID: ${details.bookingId}. Amount: ₹${details.amount}. Thank you for using Artist Booking!`,
    });
  }

  /**
   * Send payment reminder via WhatsApp
   */
  async sendPaymentReminder(
    phoneNumber: string,
    details: { bookingId: string; amount: number; dueDate: string },
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    return this.sendMessage({
      phoneNumber,
      message: `Payment reminder: ₹${details.amount} is due on ${details.dueDate} for booking ${details.bookingId}. Please complete your payment.`,
    });
  }

  /**
   * Send bulk messages to multiple recipients
   */
  async sendBulk(
    recipients: Array<{ phoneNumber: string; message: string }>,
  ): Promise<{ success: number; failed: number; errors: Array<{ phone: string; error: string }> }> {
    const results = await Promise.allSettled(
      recipients.map(r => this.sendMessage({
        phoneNumber: r.phoneNumber,
        message: r.message,
      })),
    );

    const successCount = results.filter(r => r.status === 'fulfilled' && (r.value as any).success).length;
    const errors = results
      .map((r, i) => ({
        phone: recipients[i].phoneNumber,
        result: r,
      }))
      .filter(({ result }) => result.status === 'rejected' || (result.status === 'fulfilled' && !(result.value as any).success))
      .map(({ phone, result }) => ({
        phone,
        error: result.status === 'rejected'
          ? (result.reason instanceof Error ? result.reason.message : 'Unknown error')
          : (result.value as any).error || 'Unknown error',
      }));

    return {
      success: successCount,
      failed: errors.length,
      errors,
    };
  }
}

export const whatsappService = new WhatsAppService();
export type { WhatsAppService };
