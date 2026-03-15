/**
 * Hold Expiry Worker
 *
 * Runs every 5 minutes to:
 * 1. Release expired calendar holds (48h timeout)
 * 2. Transition associated bookings to 'expired' state
 *
 * In production, runs as a separate ECS task.
 * For dev: `tsx src/workers/hold-expiry.worker.ts`
 */

import { db } from '../infrastructure/database.js';
import { calendarRepository } from '../modules/calendar/calendar.repository.js';
import { BookingState } from '@artist-booking/shared';

async function processExpiredHolds() {
  // Find all expired holds
  const expiredHolds = await db('availability_calendar')
    .where('status', 'held')
    .where('hold_expires_at', '<', new Date())
    .select('*');

  if (expiredHolds.length === 0) return;

  console.log(`Processing ${expiredHolds.length} expired hold(s)...`);

  for (const hold of expiredHolds) {
    try {
      // Release the calendar date
      await calendarRepository.releaseDate(hold.artist_id, hold.date);

      // If there's an associated booking, expire it
      if (hold.booking_id) {
        const booking = await db('bookings').where({ id: hold.booking_id }).first();

        if (booking && ['inquiry', 'shortlisted', 'quoted', 'negotiating'].includes(booking.status)) {
          await db('bookings')
            .where({ id: hold.booking_id })
            .update({ status: BookingState.EXPIRED, updated_at: new Date() });

          await db('booking_events').insert({
            booking_id: hold.booking_id,
            from_status: booking.status,
            to_status: BookingState.EXPIRED,
            triggered_by: 'system:hold_expiry',
            metadata: JSON.stringify({ reason: 'Hold expired after 48 hours' }),
          });

          console.log(`Booking ${hold.booking_id} expired (hold timeout)`);
        }
      }
    } catch (err) {
      console.error(`Error processing expired hold for date ${hold.date}:`, err);
    }
  }
}

async function startExpiryLoop() {
  console.log('Starting hold expiry worker...');

  // Run immediately
  await processExpiredHolds();

  // Then every 5 minutes
  setInterval(async () => {
    try {
      await processExpiredHolds();
    } catch (err) {
      console.error('Hold expiry error:', err);
    }
  }, 5 * 60 * 1000);
}

startExpiryLoop().catch((err) => {
  console.error('Failed to start hold expiry worker:', err);
  process.exit(1);
});
