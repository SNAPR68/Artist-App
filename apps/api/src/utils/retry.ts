import { logger } from './logger.js';

/**
 * Retry strategy with exponential backoff for failed operations.
 * Automatically retries transient failures with configurable backoff.
 */

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  jitterFactor?: number;
  shouldRetry?: (error: Error, attempt: number) => boolean;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  lastError?: Error;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitterFactor: 0.1,
  shouldRetry: (error: Error) => {
    // Retry on network errors, timeout, and server errors
    const retryableErrors = ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'EHOSTUNREACH'];
    return (
      retryableErrors.some(e => error.message.includes(e))
      || error.message.includes('500')
      || error.message.includes('503')
      || error.message.includes('timeout')
    );
  },
};

/**
 * Retry a promise-returning function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<RetryResult<T>> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | undefined;
  let attempt = 0;

  for (attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      const data = await fn();
      if (attempt > 1) {
        logger.info(`Operation succeeded after ${attempt} attempts`);
      }
      return { success: true, data, attempts: attempt };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      const isLastAttempt = attempt === config.maxAttempts;
      const shouldRetry = config.shouldRetry(lastError, attempt);

      if (isLastAttempt || !shouldRetry) {
        logger.error(`Operation failed after ${attempt} attempts`, lastError);
        return {
          success: false,
          error: lastError,
          attempts: attempt,
          lastError,
        };
      }

      const delayMs = calculateBackoff(attempt - 1, config);
      logger.warn(`Retrying after ${delayMs}ms (attempt ${attempt}/${config.maxAttempts})`, {
        error: lastError.message,
      });

      await delay(delayMs);
    }
  }

  return {
    success: false,
    error: lastError,
    attempts: attempt,
    lastError,
  };
}

/**
 * Calculate exponential backoff with jitter
 */
function calculateBackoff(failureCount: number, options: Required<RetryOptions>): number {
  let delay = options.initialDelayMs * Math.pow(options.backoffMultiplier, failureCount);

  // Cap at max delay
  delay = Math.min(delay, options.maxDelayMs);

  // Add jitter
  const jitter = delay * options.jitterFactor * (Math.random() * 2 - 1);
  return Math.max(100, Math.floor(delay + jitter));
}

/**
 * Sleep for a given number of milliseconds
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function that returns a value (not a promise)
 */
export function withSyncRetry<T>(
  fn: () => T,
  options: RetryOptions = {},
): RetryResult<T> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      const data = fn();
      if (attempt > 1) {
        logger.info(`Operation succeeded after ${attempt} attempts`);
      }
      return { success: true, data, attempts: attempt };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === config.maxAttempts) {
        logger.error(`Operation failed after ${attempt} attempts`, lastError);
        return {
          success: false,
          error: lastError,
          attempts: attempt,
          lastError,
        };
      }
    }
  }

  return {
    success: false,
    error: lastError,
    attempts: config.maxAttempts,
    lastError,
  };
}

/**
 * Retry configuration for common scenarios
 */
export const retryStrategies = {
  /**
   * Strategy for API calls (network errors, temporary failures)
   */
  api: (): RetryOptions => ({
    maxAttempts: 3,
    initialDelayMs: 500,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
  }),

  /**
   * Strategy for database operations
   */
  database: (): RetryOptions => ({
    maxAttempts: 3,
    initialDelayMs: 100,
    maxDelayMs: 5000,
    backoffMultiplier: 1.5,
    shouldRetry: (error: Error) => {
      const dbErrors = ['connection', 'timeout', 'deadlock', 'busy'];
      return dbErrors.some(e => error.message.toLowerCase().includes(e));
    },
  }),

  /**
   * Strategy for long-running operations
   */
  longRunning: (): RetryOptions => ({
    maxAttempts: 5,
    initialDelayMs: 2000,
    maxDelayMs: 60000,
    backoffMultiplier: 2,
  }),

  /**
   * Strategy for notification delivery
   */
  notification: (): RetryOptions => ({
    maxAttempts: 4,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    shouldRetry: (error: Error) => {
      // Retry on network and rate limit errors
      return error.message.includes('429') || !error.message.includes('400');
    },
  }),
};
