import axios from 'axios';
import { config } from '../../config/index.js';

export interface SMSResult {
  success: boolean;
  provider: string;
  messageId?: string;
}

export class SMSService {
  /**
   * Send OTP via MSG91
   */
  async sendOTP(phone: string, otp: string): Promise<SMSResult> {
    // In development, just log that OTP was sent (don't log the actual OTP)
    if (config.NODE_ENV === 'development') {
      console.log(`[DEV] OTP sent for +91${phone}`);
      return { success: true, provider: 'dev-console' };
    }

    if (!config.MSG91_AUTH_KEY || !config.MSG91_OTP_TEMPLATE_ID) {
      console.log(`[SMS BYPASS] OTP sent for +91${phone} (MSG91 not configured, use 123456 to bypass)`);
      return { success: true, provider: 'bypass-console' };
    }

    try {
      const response = await axios.post(
        'https://control.msg91.com/api/v5/otp',
        {
          template_id: config.MSG91_OTP_TEMPLATE_ID,
          mobile: `91${phone}`,
          otp,
        },
        {
          headers: {
            authkey: config.MSG91_AUTH_KEY,
            'Content-Type': 'application/json',
          },
          timeout: 10_000,
        },
      );

      return {
        success: response.data?.type === 'success',
        provider: 'msg91',
        messageId: response.data?.request_id,
      };
    } catch (error) {
      console.error('MSG91 SMS send failed:', error);
      return { success: false, provider: 'msg91' };
    }
  }
}

export const smsService = new SMSService();
