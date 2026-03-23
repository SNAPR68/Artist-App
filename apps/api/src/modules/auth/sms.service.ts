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
    // OTP bypass: only allowed when explicitly enabled (dev/staging only, NEVER production)
    if (config.OTP_BYPASS_ENABLED === 'true') {
      console.log(`[OTP BYPASS] OTP bypass enabled for +91${phone.slice(0, 2)}****${phone.slice(-2)}`);
      return { success: true, provider: 'bypass' };
    }

    if (!config.MSG91_AUTH_KEY || !config.MSG91_OTP_TEMPLATE_ID) {
      console.error(`[SMS ERROR] MSG91 not configured and OTP bypass is disabled. Cannot send OTP.`);
      return { success: false, provider: 'none' };
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
