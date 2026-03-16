import { db } from './database.js';
import { reviewService } from '../modules/review/review.service.js';
import { paymentService } from '../modules/payment/payment.service.js';

const HOLD_EXPIRY_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const REVIEW_PUBLISH_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const SETTLEMENT_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

/**
 * Start background cron jobs for hold expiry and review publishing.
 */
export function startCronJobs() {
  console.log('[CRON] Starting background jobs...');

  // 1. Expire stale calendar holds (48h)
  setInterval(async () => {
    try {
      const expiredHolds = await db('availability_calendar')
        .where('status', 'held')
        .where('hold_expires_at', '<', new Date())
        .update({ status: 'available', booking_id: null, hold_expires_at: null });

      if (expiredHolds > 0) {
        console.log(`[CRON] Expired ${expiredHolds} stale calendar holds`);
      }

      // Also expire bookings stuck in inquiry/quoted state for > 48 hours
      const expiredBookings = await db('bookings')
        .whereIn('status', ['inquiry', 'quoted'])
        .where('updated_at', '<', new Date(Date.now() - 48 * 60 * 60 * 1000))
        .update({ status: 'expired', updated_at: new Date() });

      if (expiredBookings > 0) {
        console.log(`[CRON] Expired ${expiredBookings} stale bookings`);
      }
    } catch (err) {
      console.error('[CRON] Hold expiry check failed:', err);
    }
  }, HOLD_EXPIRY_INTERVAL_MS);

  // 2. Publish reviews after 48h hold period
  setInterval(async () => {
    try {
      const count = await reviewService.publishDueReviews();
      if (count > 0) {
        console.log(`[CRON] Published ${count} reviews after hold period`);
      }
    } catch (err) {
      console.error('[CRON] Review publish check failed:', err);
    }
  }, REVIEW_PUBLISH_INTERVAL_MS);

  // 3. Auto-settle payments 3 days after event completion
  setInterval(async () => {
    try {
      const count = await paymentService.autoSettleEligible();
      if (count > 0) {
        console.log(`[CRON] Auto-settled ${count} payments`);
      }
    } catch (err) {
      console.error('[CRON] Settlement check failed:', err);
    }
  }, SETTLEMENT_INTERVAL_MS);
}
