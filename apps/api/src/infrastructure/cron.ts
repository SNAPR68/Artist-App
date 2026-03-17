import { db } from './database.js';
import { reviewService } from '../modules/review/review.service.js';
import { paymentService } from '../modules/payment/payment.service.js';
import { disputeService } from '../modules/dispute/dispute.service.js';
import { coordinationService } from '../modules/coordination/coordination.service.js';
import { eventDayService } from '../modules/event-day/event-day.service.js';
import { trustService } from '../modules/trust/trust.service.js';
import { priceIntelligenceService } from '../modules/analytics/price-intelligence.service.js';
import { calendarIntelligenceService } from '../modules/analytics/calendar-intelligence.service.js';
import { pricingBrainService } from '../modules/pricing-brain/pricing-brain.service.js';
import { whatsAppConversationService } from '../modules/whatsapp/whatsapp-conversation.service.js';

const HOLD_EXPIRY_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const REVIEW_PUBLISH_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const SETTLEMENT_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
const COORDINATION_ESCALATION_INTERVAL_MS = 2 * 60 * 60 * 1000; // 2 hours
const EVENT_DAY_TRANSITION_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const TRUST_RECOMPUTE_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
const PRICE_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const DEMAND_AGGREGATION_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
const ALERT_GENERATION_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 hours
const VENUE_STATS_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const PRICING_BRAIN_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const WHATSAPP_CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

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
        .whereIn('state', ['inquiry', 'quoted'])
        .where('updated_at', '<', new Date(Date.now() - 48 * 60 * 60 * 1000))
        .update({ state: 'expired', updated_at: new Date() });

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

  // 4. Auto-close dispute evidence windows past 48h deadline (every hour)
  setInterval(async () => {
    try {
      const count = await disputeService.autoCloseEvidenceWindows();
      if (count > 0) {
        console.log(`[CRON] Auto-closed ${count} dispute evidence windows`);
      }
    } catch (err) {
      console.error('[CRON] Dispute evidence window check failed:', err);
    }
  }, 60 * 60 * 1000); // 1 hour

  // 5. Coordination escalation — flag overdue pre-event checkpoints (every 2h)
  setInterval(async () => {
    try {
      const count = await coordinationService.checkEscalations();
      if (count > 0) {
        console.log(`[CRON] Escalated ${count} overdue coordination checkpoints`);
      }
    } catch (err) {
      console.error('[CRON] Coordination escalation check failed:', err);
    }
  }, COORDINATION_ESCALATION_INTERVAL_MS);

  // 6. Event-day auto-transition — move pre_event → event_day on event date (every 30min)
  setInterval(async () => {
    try {
      const count = await eventDayService.autoTransitionToEventDay();
      if (count > 0) {
        console.log(`[CRON] Auto-transitioned ${count} bookings to event_day`);
      }
    } catch (err) {
      console.error('[CRON] Event-day transition check failed:', err);
    }
  }, EVENT_DAY_TRANSITION_INTERVAL_MS);

  // 7. Trust score recomputation — recalculate for artists with recent completions (every 6h)
  setInterval(async () => {
    try {
      const count = await trustService.recomputeRecent();
      if (count > 0) {
        console.log(`[CRON] Recomputed trust scores for ${count} artists`);
      }
    } catch (err) {
      console.error('[CRON] Trust recomputation failed:', err);
    }
  }, TRUST_RECOMPUTE_INTERVAL_MS);

  // 8. Price intelligence refresh — refresh materialized view (every 24h)
  setInterval(async () => {
    try {
      await priceIntelligenceService.refreshStats();
      console.log('[CRON] Price intelligence materialized view refreshed');
    } catch (err) {
      console.error('[CRON] Price intelligence refresh failed:', err);
    }
  }, PRICE_REFRESH_INTERVAL_MS);

  // 9. Demand signal aggregation — aggregate search/inquiry/booking data (every 6h)
  setInterval(async () => {
    try {
      const count = await calendarIntelligenceService.aggregateDemandSignals();
      if (count > 0) {
        console.log(`[CRON] Aggregated ${count} demand signals`);
      }
    } catch (err) {
      console.error('[CRON] Demand signal aggregation failed:', err);
    }
  }, DEMAND_AGGREGATION_INTERVAL_MS);

  // 10. Calendar intelligence alert generation (every 12h)
  setInterval(async () => {
    try {
      const count = await calendarIntelligenceService.generateAlertsBatch();
      if (count > 0) {
        console.log(`[CRON] Generated ${count} calendar intelligence alerts`);
      }
    } catch (err) {
      console.error('[CRON] Alert generation failed:', err);
    }
  }, ALERT_GENERATION_INTERVAL_MS);

  // 11. Venue stats refresh — update aggregate stats from event context data (every 24h)
  setInterval(async () => {
    try {
      await db.raw(`
        UPDATE venue_profiles vp SET
          total_events_hosted = sub.event_count,
          avg_crowd_rating = sub.avg_crowd,
          acoustics_rating = sub.avg_acoustics,
          updated_at = NOW()
        FROM (
          SELECT
            vah.venue_id,
            COUNT(*)::int as event_count,
            AVG(ecd.venue_crowd_flow_rating) as avg_crowd,
            AVG(ecd.venue_acoustics_rating) as avg_acoustics
          FROM venue_artist_history vah
          LEFT JOIN event_context_data ecd ON ecd.booking_id = vah.booking_id
          GROUP BY vah.venue_id
        ) sub
        WHERE vp.id = sub.venue_id
      `);
      console.log('[CRON] Venue stats refreshed');
    } catch (err) {
      console.error('[CRON] Venue stats refresh failed:', err);
    }
  }, VENUE_STATS_REFRESH_INTERVAL_MS);

  // 12. Pricing brain — compute market positions and recommendations (every 24h)
  setInterval(async () => {
    try {
      const positions = await pricingBrainService.batchComputePositions();
      console.log(`[CRON] Computed ${positions} market positions`);

      const recs = await pricingBrainService.batchGenerateRecommendations();
      if (recs > 0) {
        console.log(`[CRON] Generated ${recs} pricing recommendations`);
      }
    } catch (err) {
      console.error('[CRON] Pricing brain batch failed:', err);
    }
  }, PRICING_BRAIN_INTERVAL_MS);

  // 13. WhatsApp conversation cleanup — expire old sessions (every 6h)
  setInterval(async () => {
    try {
      const count = await whatsAppConversationService.expireConversations();
      if (count > 0) {
        console.log(`[CRON] Expired ${count} WhatsApp conversations`);
      }
    } catch (err) {
      console.error('[CRON] WhatsApp cleanup failed:', err);
    }
  }, WHATSAPP_CLEANUP_INTERVAL_MS);
}
