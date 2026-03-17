import { eventDayRepository } from './event-day.repository.js';
import { bookingRepository } from '../booking/booking.repository.js';
import { db } from '../../infrastructure/database.js';
import { BookingState, ARRIVAL_VERIFICATION_RADIUS_M } from '@artist-booking/shared';

class EventDayError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = 'EventDayError';
  }
}

function haversineDistanceM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export class EventDayService {
  async initializeEventDay(bookingId: string) {
    const existing = await eventDayRepository.findByBookingId(bookingId);
    if (existing) return existing;
    return eventDayRepository.create(bookingId);
  }

  async getEventDayLog(bookingId: string, userId: string) {
    const booking = await bookingRepository.findByIdWithDetails(bookingId);
    if (!booking) {
      throw new EventDayError('NOT_FOUND', 'Booking not found', 404);
    }

    if (booking.artist_user_id !== userId && booking.client_user_id !== userId) {
      throw new EventDayError('FORBIDDEN', 'Not a participant', 403);
    }

    const log = await eventDayRepository.findByBookingId(bookingId);
    if (!log) {
      throw new EventDayError('NOT_FOUND', 'Event day log not found', 404);
    }

    return log;
  }

  async recordArrival(bookingId: string, userId: string, lat: number, lng: number) {
    const booking = await bookingRepository.findByIdWithDetails(bookingId);
    if (!booking) {
      throw new EventDayError('NOT_FOUND', 'Booking not found', 404);
    }

    if (booking.artist_user_id !== userId) {
      throw new EventDayError('FORBIDDEN', 'Only the artist can record arrival', 403);
    }

    // Calculate distance from venue
    let distance = 0;
    let verified = true; // Default to verified if no venue coords
    if (booking.venue_lat && booking.venue_lng) {
      distance = haversineDistanceM(lat, lng, Number(booking.venue_lat), Number(booking.venue_lng));
      verified = distance <= ARRIVAL_VERIFICATION_RADIUS_M;
    }

    const updated = await eventDayRepository.updateArrival(bookingId, lat, lng, verified, distance);

    await bookingRepository.addEvent(bookingId, {
      from_state: booking.state as string,
      to_state: booking.state as string,
      triggered_by: userId,
      metadata: { action: 'arrival_recorded', distance_m: distance, verified },
    });

    return updated;
  }

  async confirmSoundcheck(bookingId: string, userId: string) {
    const booking = await bookingRepository.findByIdWithDetails(bookingId);
    if (!booking) {
      throw new EventDayError('NOT_FOUND', 'Booking not found', 404);
    }

    const role = booking.artist_user_id === userId ? 'artist' : booking.client_user_id === userId ? 'client' : null;
    if (!role) {
      throw new EventDayError('FORBIDDEN', 'Not a participant', 403);
    }

    return eventDayRepository.updateSoundcheck(bookingId, role);
  }

  async startSet(bookingId: string, userId: string) {
    const booking = await bookingRepository.findByIdWithDetails(bookingId);
    if (!booking) {
      throw new EventDayError('NOT_FOUND', 'Booking not found', 404);
    }

    if (booking.artist_user_id !== userId) {
      throw new EventDayError('FORBIDDEN', 'Only the artist can start the set', 403);
    }

    return eventDayRepository.updateSetStart(bookingId);
  }

  async endSet(bookingId: string, userId: string) {
    const booking = await bookingRepository.findByIdWithDetails(bookingId);
    if (!booking) {
      throw new EventDayError('NOT_FOUND', 'Booking not found', 404);
    }

    if (booking.artist_user_id !== userId) {
      throw new EventDayError('FORBIDDEN', 'Only the artist can end the set', 403);
    }

    const log = await eventDayRepository.findByBookingId(bookingId);
    let actualDurationMin = 0;
    if (log?.set_start_at) {
      actualDurationMin = Math.round((Date.now() - new Date(log.set_start_at).getTime()) / 60000);
    }

    return eventDayRepository.updateSetEnd(bookingId, actualDurationMin);
  }

  async flagIssue(bookingId: string, userId: string, type: string, description: string) {
    const booking = await bookingRepository.findByIdWithDetails(bookingId);
    if (!booking) {
      throw new EventDayError('NOT_FOUND', 'Booking not found', 404);
    }

    if (booking.artist_user_id !== userId && booking.client_user_id !== userId) {
      throw new EventDayError('FORBIDDEN', 'Not a participant', 403);
    }

    const issue = {
      type,
      description,
      reported_by: userId,
      reported_at: new Date().toISOString(),
    };

    return eventDayRepository.appendIssue(bookingId, issue);
  }

  async confirmCompletion(bookingId: string, userId: string) {
    const booking = await bookingRepository.findByIdWithDetails(bookingId);
    if (!booking) {
      throw new EventDayError('NOT_FOUND', 'Booking not found', 404);
    }

    const role = booking.artist_user_id === userId ? 'artist' : booking.client_user_id === userId ? 'client' : null;
    if (!role) {
      throw new EventDayError('FORBIDDEN', 'Not a participant', 403);
    }

    const updated = await eventDayRepository.updateCompletion(bookingId, role);

    // If both parties confirmed, auto-transition to COMPLETED
    if (updated.completion_artist && updated.completion_client) {
      const currentState = booking.state as BookingState;
      if (currentState === BookingState.EVENT_DAY) {
        await bookingRepository.updateStatus(bookingId, BookingState.COMPLETED);
        await bookingRepository.addEvent(bookingId, {
          from_state: BookingState.EVENT_DAY,
          to_state: BookingState.COMPLETED,
          triggered_by: 'system:completion',
          metadata: {
            artist_confirmed_at: updated.completion_artist_at,
            client_confirmed_at: updated.completion_client_at,
          },
        });

        // Create venue_artist_history stub if booking has a venue
        if (booking.venue_id) {
          try {
            await db('venue_artist_history')
              .insert({
                venue_id: booking.venue_id,
                artist_id: booking.artist_id,
                booking_id: bookingId,
                event_type: booking.event_type,
                event_date: booking.event_date,
              })
              .onConflict('booking_id')
              .ignore();
          } catch {
            // Non-critical — don't fail completion
          }
        }
      }
    }

    return updated;
  }

  async autoTransitionToEventDay(): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    const pending = await eventDayRepository.findPendingEventDay(today);

    let count = 0;
    for (const booking of pending) {
      try {
        await bookingRepository.updateStatus(booking.id, BookingState.EVENT_DAY);
        await bookingRepository.addEvent(booking.id, {
          from_state: BookingState.PRE_EVENT,
          to_state: BookingState.EVENT_DAY,
          triggered_by: 'system:cron',
          metadata: { auto_transition: true },
        });
        await this.initializeEventDay(booking.id);
        count++;
      } catch (err) {
        console.error(`[EVENT_DAY] Failed to transition booking ${booking.id}:`, err);
      }
    }

    return count;
  }
}

export const eventDayService = new EventDayService();
