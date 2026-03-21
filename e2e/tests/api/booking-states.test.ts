import { test, expect } from '@playwright/test';

/**
 * API integration tests for booking state machine
 * Tests all 12 booking states and transitions
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const TEST_TOKEN = 'test-auth-token';

interface Booking {
  id: string;
  status: string;
  artistId: string;
  clientId: string;
  eventDate: string;
  amount: number;
  createdAt: string;
}

// 12 Booking States:
// 1. DRAFT - Initial state
// 2. PENDING_CONFIRMATION - Awaiting artist confirmation
// 3. CONFIRMED - Artist confirmed, payment pending
// 4. PAYMENT_PENDING - Awaiting customer payment
// 5. PAYMENT_RECEIVED - Payment confirmed
// 6. ACCEPTED - Artist accepted final booking
// 7. REJECTED - Artist rejected booking
// 8. CANCELLED - Customer cancelled
// 9. COMPLETED - Event completed
// 10. NO_SHOW - Artist didn't show up
// 11. DISPUTE - Dispute raised
// 12. ARCHIVED - Archived/Historical

test.describe('Booking State Machine API Tests', () => {
  let bookingId: string;

  // Test 1: Create booking (DRAFT state)
  test('POST /v1/bookings - should create booking in DRAFT state', async ({ request }) => {
    const payload = {
      artistId: 'artist-123',
      eventDate: '2025-06-15',
      eventType: 'wedding',
      duration: 2,
      location: 'Delhi',
      notes: 'Test booking',
      estimatedAmount: 50000,
    };

    const response = await request.post(`${API_BASE_URL}/v1/bookings`, {
      headers: {
        Authorization: `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json',
      },
      data: payload,
    });

    expect(response.status()).toBe(201);
    const booking = (await response.json()) as Booking;
    expect(booking.status).toBe('DRAFT');
    bookingId = booking.id;
  });

  // Test 2: Submit booking (DRAFT -> PENDING_CONFIRMATION)
  test('POST /v1/bookings/:id/submit - transition DRAFT to PENDING_CONFIRMATION', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/v1/bookings/${bookingId}/submit`, {
      headers: {
        Authorization: `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json',
      },
      data: { notes: 'Booking submitted for confirmation' },
    });

    expect(response.status()).toBe(200);
    const booking = (await response.json()) as Booking;
    expect(booking.status).toBe('PENDING_CONFIRMATION');
  });

  // Test 3: Artist confirms booking (PENDING_CONFIRMATION -> CONFIRMED)
  test('POST /v1/bookings/:id/confirm - transition to CONFIRMED', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/v1/bookings/${bookingId}/confirm`, {
      headers: {
        Authorization: `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json',
      },
      data: {
        artistNotes: 'Ready to perform',
        requirements: ['Sound system available'],
      },
    });

    expect(response.status()).toBe(200);
    const booking = (await response.json()) as Booking;
    expect(booking.status).toBe('CONFIRMED');
  });

  // Test 4: Request payment (CONFIRMED -> PAYMENT_PENDING)
  test('POST /v1/bookings/:id/request-payment - transition to PAYMENT_PENDING', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/v1/bookings/${bookingId}/request-payment`, {
      headers: {
        Authorization: `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json',
      },
      data: {
        amount: 50000,
        paymentDeadline: '2025-06-10',
      },
    });

    expect(response.status()).toBe(200);
    const booking = (await response.json()) as Booking;
    expect(booking.status).toBe('PAYMENT_PENDING');
  });

  // Test 5: Mark payment received (PAYMENT_PENDING -> PAYMENT_RECEIVED)
  test('POST /v1/bookings/:id/payment-received - transition to PAYMENT_RECEIVED', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/v1/bookings/${bookingId}/payment-received`, {
      headers: {
        Authorization: `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json',
      },
      data: {
        paymentId: 'pay_123',
        transactionId: 'txn_123',
        amount: 50000,
      },
    });

    expect(response.status()).toBe(200);
    const booking = (await response.json()) as Booking;
    expect(booking.status).toBe('PAYMENT_RECEIVED');
  });

  // Test 6: Accept final booking (PAYMENT_RECEIVED -> ACCEPTED)
  test('POST /v1/bookings/:id/accept - transition to ACCEPTED', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/v1/bookings/${bookingId}/accept`, {
      headers: {
        Authorization: `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json',
      },
      data: {
        confirmationCode: 'CONF-123',
        additionalRequirements: [],
      },
    });

    expect(response.status()).toBe(200);
    const booking = (await response.json()) as Booking;
    expect(booking.status).toBe('ACCEPTED');
  });

  // Test 7: Complete booking (ACCEPTED -> COMPLETED)
  test('POST /v1/bookings/:id/complete - transition to COMPLETED', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/v1/bookings/${bookingId}/complete`, {
      headers: {
        Authorization: `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json',
      },
      data: {
        feedback: 'Great performance',
        rating: 5,
      },
    });

    expect(response.status()).toBe(200);
    const booking = (await response.json()) as Booking;
    expect(booking.status).toBe('COMPLETED');
  });

  // Test 8: Archive booking (COMPLETED -> ARCHIVED)
  test('POST /v1/bookings/:id/archive - transition to ARCHIVED', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/v1/bookings/${bookingId}/archive`, {
      headers: {
        Authorization: `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json',
      },
      data: {},
    });

    expect(response.status()).toBe(200);
    const booking = (await response.json()) as Booking;
    expect(booking.status).toBe('ARCHIVED');
  });

  // Test 9: Rejection flow (PENDING_CONFIRMATION -> REJECTED)
  test('POST /v1/bookings/:id/reject - transition to REJECTED', async ({ request }) => {
    // Create new booking for rejection test
    const createResp = await request.post(`${API_BASE_URL}/v1/bookings`, {
      headers: {
        Authorization: `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json',
      },
      data: {
        artistId: 'artist-456',
        eventDate: '2025-07-20',
        eventType: 'corporate',
        duration: 3,
        location: 'Mumbai',
      },
    });

    const newBooking = (await createResp.json()) as Booking;

    // Submit it
    await request.post(`${API_BASE_URL}/v1/bookings/${newBooking.id}/submit`, {
      headers: {
        Authorization: `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json',
      },
      data: {},
    });

    // Reject it
    const rejectResp = await request.post(`${API_BASE_URL}/v1/bookings/${newBooking.id}/reject`, {
      headers: {
        Authorization: `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json',
      },
      data: {
        reason: 'Date conflict',
        message: 'Already booked on that date',
      },
    });

    expect(rejectResp.status()).toBe(200);
    const rejectedBooking = (await rejectResp.json()) as Booking;
    expect(rejectedBooking.status).toBe('REJECTED');
  });

  // Test 10: Cancellation flow
  test('POST /v1/bookings/:id/cancel - transition to CANCELLED', async ({ request }) => {
    // Create new booking for cancellation test
    const createResp = await request.post(`${API_BASE_URL}/v1/bookings`, {
      headers: {
        Authorization: `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json',
      },
      data: {
        artistId: 'artist-789',
        eventDate: '2025-08-15',
        eventType: 'concert',
        duration: 4,
        location: 'Bangalore',
      },
    });

    const newBooking = (await createResp.json()) as Booking;

    // Cancel it
    const cancelResp = await request.post(`${API_BASE_URL}/v1/bookings/${newBooking.id}/cancel`, {
      headers: {
        Authorization: `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json',
      },
      data: {
        reason: 'Event postponed',
        refundAmount: 0,
      },
    });

    expect(cancelResp.status()).toBe(200);
    const cancelledBooking = (await cancelResp.json()) as Booking;
    expect(cancelledBooking.status).toBe('CANCELLED');
  });

  // Test 11: No-show marking
  test('POST /v1/bookings/:id/mark-no-show - transition to NO_SHOW', async ({ request }) => {
    // Create and accept a booking first
    const createResp = await request.post(`${API_BASE_URL}/v1/bookings`, {
      headers: {
        Authorization: `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json',
      },
      data: {
        artistId: 'artist-no-show',
        eventDate: '2025-09-01',
        eventType: 'wedding',
        duration: 2,
        location: 'Delhi',
      },
    });

    const newBooking = (await createResp.json()) as Booking;

    // Mark as no-show
    const noShowResp = await request.post(`${API_BASE_URL}/v1/bookings/${newBooking.id}/mark-no-show`, {
      headers: {
        Authorization: `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json',
      },
      data: {
        notes: 'Artist did not appear at event',
        reportedAt: new Date().toISOString(),
      },
    });

    expect(noShowResp.status()).toBe(200);
    const noShowBooking = (await noShowResp.json()) as Booking;
    expect(noShowBooking.status).toBe('NO_SHOW');
  });

  // Test 12: Dispute handling
  test('POST /v1/bookings/:id/raise-dispute - transition to DISPUTE', async ({ request }) => {
    // Create and setup a booking
    const createResp = await request.post(`${API_BASE_URL}/v1/bookings`, {
      headers: {
        Authorization: `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json',
      },
      data: {
        artistId: 'artist-dispute',
        eventDate: '2025-10-05',
        eventType: 'corporate',
        duration: 3,
        location: 'Pune',
      },
    });

    const newBooking = (await createResp.json()) as Booking;

    // Raise dispute
    const disputeResp = await request.post(`${API_BASE_URL}/v1/bookings/${newBooking.id}/raise-dispute`, {
      headers: {
        Authorization: `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json',
      },
      data: {
        reason: 'Quality of performance',
        description: 'Performance did not meet expectations',
        evidence: [],
      },
    });

    expect(disputeResp.status()).toBe(200);
    const disputeBooking = (await disputeResp.json()) as Booking;
    expect(disputeBooking.status).toBe('DISPUTE');
  });

  // Test 13: Get booking status
  test('GET /v1/bookings/:id - should return booking with current status', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/v1/bookings/${bookingId}`, {
      headers: {
        Authorization: `Bearer ${TEST_TOKEN}`,
      },
    });

    expect(response.status()).toBe(200);
    const booking = (await response.json()) as Booking;
    expect(booking.id).toBe(bookingId);
    expect(booking).toHaveProperty('status');
    expect(booking).toHaveProperty('createdAt');
  });

  // Test 14: List bookings with status filter
  test('GET /v1/bookings - should list bookings with status filter', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/v1/bookings`, {
      headers: {
        Authorization: `Bearer ${TEST_TOKEN}`,
      },
      params: {
        status: 'ACCEPTED',
        limit: 10,
      },
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data.bookings)).toBe(true);

    // All returned bookings should have ACCEPTED status
    if (data.bookings.length > 0) {
      data.bookings.forEach((booking: Booking) => {
        expect(booking.status).toBe('ACCEPTED');
      });
    }
  });

  // Test 15: Invalid state transition should fail
  test('POST /v1/bookings/:id/invalid-action - should reject invalid transitions', async ({ request }) => {
    // Try to transition from DRAFT to an invalid state
    const response = await request.post(`${API_BASE_URL}/v1/bookings/${bookingId}/invalid-transition`, {
      headers: {
        Authorization: `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json',
      },
      data: {},
    });

    expect(response.status()).toBe(400); // Should be bad request
  });
});
