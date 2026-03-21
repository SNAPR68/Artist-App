/**
 * Logger utility that wraps console methods and sends errors to Sentry.
 * Provides consistent logging across the application with optional Sentry integration.
 */

function sendToSentry(level: string, message: string, context?: any) {
  try {
    const Sentry = require('@sentry/node');
    if (context instanceof Error) {
      Sentry.captureException(context, {
        tags: { logger: level },
      });
    } else if (context) {
      Sentry.captureMessage(message, level as any);
      Sentry.setContext('additional', context);
    } else {
      Sentry.captureMessage(message, level as any);
    }
  } catch (err) {
    // Sentry not available
  }
}

export const logger = {
  /**
   * Log debug-level messages
   */
  debug: (message: string, data?: Record<string, any>) => {
    // eslint-disable-next-line no-console
    console.debug(message, data);
  },

  /**
   * Log info-level messages
   */
  info: (message: string, data?: Record<string, any>) => {
    // eslint-disable-next-line no-console
    console.info(message, data);
  },

  /**
   * Log warning-level messages
   */
  warn: (message: string, data?: Record<string, any>) => {
    // eslint-disable-next-line no-console
    console.warn(message, data);
    sendToSentry('warning', message, data);
  },

  /**
   * Log error-level messages and capture in Sentry
   */
  error: (message: string, error?: Error | Record<string, any>) => {
    // eslint-disable-next-line no-console
    console.error(message, error);
    sendToSentry('error', message, error);
  },

  /**
   * Log fatal errors and capture in Sentry
   */
  fatal: (message: string, error?: Error | Record<string, any>) => {
    // eslint-disable-next-line no-console
    console.error('FATAL:', message, error);
    sendToSentry('fatal', message, error);
  },

  /**
   * Capture an exception with optional context
   */
  captureException: (error: Error, context?: Record<string, any>) => {
    // eslint-disable-next-line no-console
    console.error('Exception:', error.message);
    sendToSentry('error', error.message, error);
    if (context) {
      try {
        const Sentry = require('@sentry/node');
        Sentry.setContext('additional', context);
      } catch (err) {
        // Sentry not available
      }
    }
  },

  /**
   * Capture a message with severity level
   */
  captureMessage: (message: string, level: 'fatal' | 'error' | 'warning' | 'info' = 'info') => {
    const logMethod = level === 'fatal' ? 'error' : level;
    // eslint-disable-next-line no-console
    (console as any)[logMethod](message);
    sendToSentry(level, message);
  },
};

export type Logger = typeof logger;
