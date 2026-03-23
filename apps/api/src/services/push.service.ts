import { providersConfig } from '../config/providers.js';
import { logger } from '../utils/logger.js';

/**
 * Firebase Cloud Messaging push notification service.
 * Sends push notifications to mobile and web clients.
 */

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  badge?: string;
  sound?: string;
  image?: string;
}

export interface SendPushOptions extends PushNotificationPayload {
  deviceToken: string;
  priority?: 'normal' | 'high';
}

class PushNotificationService {
  private enabled: boolean;
  private projectId?: string;

  constructor() {
    this.enabled = providersConfig.firebase.enabled;
    this.projectId = providersConfig.firebase.projectId;

    if (!this.enabled) {
      logger.warn('Push notification service disabled: Firebase not configured');
    }
  }

  /**
   * Send a push notification to a device
   */
  async sendToDevice(options: SendPushOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!options.deviceToken) {
        throw new Error('Device token is required');
      }

      // If Firebase is enabled, send via FCM
      if (this.enabled) {
        return await this.sendViaFirebase(options);
      }

      // Fallback: log to console
      return this.logToConsole(options);
    } catch (error) {
      logger.error('Failed to send push notification', error instanceof Error ? error : { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send push notification via Firebase Cloud Messaging
   */
  private async sendViaFirebase(options: SendPushOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Get Firebase admin SDK access token
      const accessToken = await this.getAccessToken();

      const payload = {
        message: {
          token: options.deviceToken,
          notification: {
            title: options.title,
            body: options.body,
            ...(options.image && { image: options.image }),
          },
          data: options.data,
          android: {
            priority: options.priority === 'high' ? 'high' : 'normal',
            notification: {
              sound: options.sound || 'default',
              clickAction: 'FLUTTER_NOTIFICATION_CLICK',
            },
          },
          apns: {
            payload: {
              aps: {
                'alert': {
                  'title': options.title,
                  'body': options.body,
                },
                'badge': options.badge ? parseInt(options.badge) : 1,
                'sound': options.sound || 'default',
              },
            },
          },
          webpush: {
            notification: {
              title: options.title,
              body: options.body,
              icon: options.image,
            },
          },
        },
      };

      const response = await fetch(
        `https://fcm.googleapis.com/v1/projects/${this.projectId}/messages:send`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Firebase error: ${JSON.stringify(error)}`);
      }

      const data = await response.json() as { name: string };
      logger.info('Push notification sent via Firebase', {
        deviceToken: options.deviceToken.substring(0, 20) + '...',
        messageId: data.name,
      });

      return {
        success: true,
        messageId: data.name,
      };
    } catch (error) {
      logger.error('Firebase push notification error', error instanceof Error ? error : { error });
      throw error;
    }
  }

  /**
   * Get Firebase access token (would use service account in production)
   */
  private async getAccessToken(): Promise<string> {
    // In a real implementation, this would use Google Cloud auth
    // For now, return a placeholder
    return 'placeholder-access-token';
  }

  /**
   * Fallback: log notification to console
   */
  private logToConsole(options: SendPushOptions): { success: boolean; messageId?: string } {
    const messageId = `console-push-${Date.now()}`;
    logger.info('[CONSOLE PUSH NOTIFICATION]', {
      deviceToken: options.deviceToken.substring(0, 20) + '...',
      title: options.title,
      body: options.body,
      messageId,
    });
    return { success: true, messageId };
  }

  /**
   * Send to multiple devices
   */
  async sendToMultiple(
    deviceTokens: string[],
    payload: PushNotificationPayload,
  ): Promise<{ success: number; failed: number; errors: Array<{ token: string; error: string }> }> {
    const results = await Promise.allSettled(
      deviceTokens.map(token =>
        this.sendToDevice({
          ...payload,
          deviceToken: token,
        }),
      ),
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- PromiseSettledResult value typing
    const successCount = results.filter(r => r.status === 'fulfilled' && (r.value as any).success).length;
    const errors = results
      .map((r, i) => ({
        token: deviceTokens[i],
        result: r,
      }))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter(({ result }) => result.status === 'rejected' || (result.status === 'fulfilled' && !(result.value as any).success))
      .map(({ token, result }) => ({
        token,
        error: result.status === 'rejected'
          ? (result.reason instanceof Error ? result.reason.message : 'Unknown error')
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          : (result.value as any).error || 'Unknown error',
      }));

    return {
      success: successCount,
      failed: errors.length,
      errors,
    };
  }

  /**
   * Send booking notification
   */
  async sendBookingNotification(
    deviceToken: string,
    bookingDetails: { bookingId: string; artistName: string; eventDate: string },
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    return this.sendToDevice({
      deviceToken,
      title: 'Booking Confirmed',
      body: `Your booking with ${bookingDetails.artistName} on ${bookingDetails.eventDate} is confirmed`,
      data: {
        type: 'booking',
        bookingId: bookingDetails.bookingId,
      },
      priority: 'high',
    });
  }

  /**
   * Send payment notification
   */
  async sendPaymentNotification(
    deviceToken: string,
    amount: number,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    return this.sendToDevice({
      deviceToken,
      title: 'Payment Received',
      body: `Payment of ₹${amount} has been received`,
      data: {
        type: 'payment',
      },
      priority: 'high',
    });
  }
}

export const pushService = new PushNotificationService();
export type { PushNotificationService };
