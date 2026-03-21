import { config } from './index.js';

/**
 * Centralized provider configuration for third-party integrations.
 * Reads from environment variables with validation and sensible defaults.
 */

export interface ProvidersConfig {
  razorpay: {
    keyId?: string;
    keySecret?: string;
    webhookSecret?: string;
    enabled: boolean;
  };
  resend: {
    apiKey?: string;
    enabled: boolean;
  };
  msg91: {
    authKey?: string;
    senderId: string;
    otpTemplateId?: string;
    enabled: boolean;
  };
  firebase: {
    projectId?: string;
    enabled: boolean;
  };
  gupshup: {
    userId?: string;
    password?: string;
    appName?: string;
    sourceNumber?: string;
    enabled: boolean;
  };
}

function validateProvider(providerName: string, requiredVars: string[], values: Record<string, any>): boolean {
  const missing = requiredVars.filter(v => !values[v]);
  if (missing.length > 0) {
    console.warn(`⚠️  ${providerName} provider disabled: missing ${missing.join(', ')}`);
    return false;
  }
  return true;
}

export function getProvidersConfig(): ProvidersConfig {
  return {
    razorpay: {
      keyId: config.RAZORPAY_KEY_ID,
      keySecret: config.RAZORPAY_KEY_SECRET,
      webhookSecret: config.RAZORPAY_WEBHOOK_SECRET,
      enabled:
        validateProvider('Razorpay', ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET'], {
          RAZORPAY_KEY_ID: config.RAZORPAY_KEY_ID,
          RAZORPAY_KEY_SECRET: config.RAZORPAY_KEY_SECRET,
        }) && !!config.RAZORPAY_KEY_ID,
    },
    resend: {
      apiKey: config.RESEND_API_KEY,
      enabled: validateProvider('Resend', ['RESEND_API_KEY'], {
        RESEND_API_KEY: config.RESEND_API_KEY,
      }) && !!config.RESEND_API_KEY,
    },
    msg91: {
      authKey: config.MSG91_AUTH_KEY,
      senderId: config.MSG91_SENDER_ID,
      otpTemplateId: config.MSG91_OTP_TEMPLATE_ID,
      enabled: validateProvider('MSG91', ['MSG91_AUTH_KEY'], {
        MSG91_AUTH_KEY: config.MSG91_AUTH_KEY,
      }) && !!config.MSG91_AUTH_KEY,
    },
    firebase: {
      projectId: config.FIREBASE_PROJECT_ID,
      enabled: validateProvider('Firebase', ['FIREBASE_PROJECT_ID'], {
        FIREBASE_PROJECT_ID: config.FIREBASE_PROJECT_ID,
      }) && !!config.FIREBASE_PROJECT_ID,
    },
    gupshup: {
      userId: process.env.GUPSHUP_USERID,
      password: process.env.GUPSHUP_PASSWORD,
      appName: config.GUPSHUP_APP_NAME,
      sourceNumber: config.GUPSHUP_SOURCE_NUMBER,
      enabled: validateProvider('Gupshup', ['GUPSHUP_USERID', 'GUPSHUP_PASSWORD'], {
        GUPSHUP_USERID: process.env.GUPSHUP_USERID,
        GUPSHUP_PASSWORD: process.env.GUPSHUP_PASSWORD,
      }) && !!process.env.GUPSHUP_USERID,
    },
  };
}

export const providersConfig = getProvidersConfig();
