import { NotificationChannel } from '@artist-booking/shared';

interface NotificationPayload {
  userId: string;
  channel: NotificationChannel;
  template: string;
  variables: Record<string, string>;
  phone?: string;
}

/**
 * Unified notification service.
 * Routes messages through the appropriate channel (WhatsApp, SMS, Push).
 * In production, dispatches via SQS for async processing.
 */
export class NotificationService {
  async send(payload: NotificationPayload) {
    const { channel, template, variables, phone } = payload;

    switch (channel) {
      case NotificationChannel.WHATSAPP:
        return this.sendWhatsApp(phone!, template, variables);
      case NotificationChannel.SMS:
        return this.sendSMS(phone!, template, variables);
      case NotificationChannel.PUSH:
        return this.sendPush(payload.userId, template, variables);
      default:
        console.warn(`Unknown notification channel: ${channel}`);
    }
  }

  /**
   * Send booking-related notifications to all relevant channels.
   */
  async sendBookingNotification(params: {
    type: 'inquiry_received' | 'quote_received' | 'booking_confirmed' | 'payment_received' | 'booking_cancelled' | 'event_reminder';
    recipientUserId: string;
    recipientPhone: string;
    variables: Record<string, string>;
  }) {
    const { type, recipientUserId, recipientPhone, variables } = params;

    // Try WhatsApp first, fallback to SMS
    try {
      await this.send({
        userId: recipientUserId,
        channel: NotificationChannel.WHATSAPP,
        template: type,
        variables,
        phone: recipientPhone,
      });
    } catch {
      // Fallback to SMS
      await this.send({
        userId: recipientUserId,
        channel: NotificationChannel.SMS,
        template: type,
        variables,
        phone: recipientPhone,
      });
    }

    // Also send push notification
    await this.send({
      userId: recipientUserId,
      channel: NotificationChannel.PUSH,
      template: type,
      variables,
    });
  }

  private async sendWhatsApp(phone: string, template: string, variables: Record<string, string>) {
    // Gupshup WhatsApp Business API integration
    // In development, log to console
    if (process.env.NODE_ENV === 'development') {
      console.log(`[WhatsApp] To: ${phone}, Template: ${template}`, variables);
      return { status: 'sent', channel: 'whatsapp' };
    }

    const apiKey = process.env.GUPSHUP_API_KEY;
    if (!apiKey) {
      console.warn('GUPSHUP_API_KEY not configured, skipping WhatsApp');
      throw new Error('WhatsApp not configured');
    }

    const response = await fetch('https://api.gupshup.io/wa/api/v1/template/msg', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        apikey: apiKey,
      },
      body: new URLSearchParams({
        channel: 'whatsapp',
        source: process.env.GUPSHUP_SOURCE_NUMBER ?? '',
        destination: phone,
        'src.name': process.env.GUPSHUP_APP_NAME ?? 'ArtistBooking',
        template: JSON.stringify({ id: template, params: Object.values(variables) }),
      }),
    });

    return response.json();
  }

  private async sendSMS(phone: string, template: string, variables: Record<string, string>) {
    // MSG91 SMS integration
    if (process.env.NODE_ENV === 'development') {
      console.log(`[SMS] To: ${phone}, Template: ${template}`, variables);
      return { status: 'sent', channel: 'sms' };
    }

    const authKey = process.env.MSG91_AUTH_KEY;
    if (!authKey) {
      console.warn('MSG91_AUTH_KEY not configured, skipping SMS');
      return null;
    }

    const response = await fetch('https://control.msg91.com/api/v5/flow/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authkey: authKey,
      },
      body: JSON.stringify({
        flow_id: template,
        sender: process.env.MSG91_SENDER_ID ?? 'ARTBKNG',
        mobiles: `91${phone}`,
        ...variables,
      }),
    });

    return response.json();
  }

  private async sendPush(userId: string, template: string, variables: Record<string, string>) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Push] To: ${userId}, Template: ${template}`, variables);
      return { status: 'sent', channel: 'push' };
    }

    // Look up device tokens
    const devices = await import('../../infrastructure/database.js').then(m =>
      m.db('user_devices').where({ user_id: userId, is_active: true }).select('fcm_token')
    );

    if (devices.length === 0) return null;

    // Use template registry for title/body
    const { NOTIFICATION_TEMPLATES, interpolateTemplate } = await import('./template.registry.js');
    const tmpl = NOTIFICATION_TEMPLATES[template];
    if (!tmpl) {
      console.warn(`No push template for: ${template}`);
      return null;
    }

    const title = interpolateTemplate(tmpl.push_title, variables);
    const body = interpolateTemplate(tmpl.push_body, variables);

    // Firebase Admin SDK
    const firebaseProjectId = process.env.FIREBASE_PROJECT_ID;
    if (!firebaseProjectId) {
      console.warn('FIREBASE_PROJECT_ID not configured, skipping push');
      return null;
    }

    // Use FCM HTTP v1 API (or Admin SDK in production)
    for (const device of devices) {
      try {
        await fetch(`https://fcm.googleapis.com/v1/projects/${firebaseProjectId}/messages:send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.FIREBASE_ACCESS_TOKEN ?? ''}`,
          },
          body: JSON.stringify({
            message: {
              token: device.fcm_token,
              notification: { title, body },
              data: { template, ...variables },
            },
          }),
        });
      } catch (err) {
        console.error(`Push notification failed for token ${device.fcm_token}:`, err);
      }
    }

    return { status: 'sent', channel: 'push', count: devices.length };
  }
}

export const notificationService = new NotificationService();
