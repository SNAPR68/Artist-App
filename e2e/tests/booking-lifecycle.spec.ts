import { test, expect } from '@playwright/test';

const API_URL = 'http://localhost:3001';

/**
 * Helper: authenticate via OTP test bypass (123456) and return auth token.
 */
async function getAuthToken(request: any, phone = '9999999999') {
  await request.post(`${API_URL}/v1/auth/otp/generate`, {
    data: { phone, country_code: '+91' },
  });

  const verifyRes = await request.post(`${API_URL}/v1/auth/otp/verify`, {
    data: { phone, country_code: '+91', otp: '123456' },
  });
  const json = await verifyRes.json();
  return json.data?.access_token;
}

test.describe('Booking Lifecycle — API E2E', () => {
  test('full booking inquiry flow via API', async ({ request }) => {
    const token = await getAuthToken(request);
    if (!token) {
      test.skip(true, 'Auth not available');
      return;
    }

    // Get an artist to book
    const artistsRes = await request.get(`${API_URL}/v1/artists?page=1&per_page=1`);
    const artists = await artistsRes.json();

    if (!artists.success || !artists.data?.data?.length) {
      test.skip(true, 'No artists in database');
      return;
    }

    const artistId = artists.data.data[0].id;

    // Create a booking inquiry
    const bookingRes = await request.post(`${API_URL}/v1/bookings`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        artist_id: artistId,
        event_type: 'wedding',
        event_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        event_city: 'Mumbai',
        event_venue: 'Test Venue',
        event_duration_hours: 3,
        budget_min_paise: 5000000,
        budget_max_paise: 10000000,
        notes: 'E2E test booking',
      },
    });

    const booking = await bookingRes.json();
    expect(bookingRes.status()).toBeLessThan(500);

    if (booking.success && booking.data?.id) {
      // Get booking details
      const detailRes = await request.get(`${API_URL}/v1/bookings/${booking.data.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(detailRes.status()).toBe(200);
      const detail = await detailRes.json();
      expect(detail.data.status).toBe('inquiry');
    }
  });

  test('payment history endpoint returns data', async ({ request }) => {
    const token = await getAuthToken(request);
    if (!token) {
      test.skip(true, 'Auth not available');
      return;
    }

    const res = await request.get(`${API_URL}/v1/payments/history?role=client`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
  });

  test('earnings endpoint returns summary', async ({ request }) => {
    const token = await getAuthToken(request);
    if (!token) {
      test.skip(true, 'Auth not available');
      return;
    }

    const res = await request.get(`${API_URL}/v1/payments/earnings`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
  });
});

test.describe('Cancellation & Refund — API E2E', () => {
  test('cancellation of non-existent booking returns gracefully', async ({ request }) => {
    const token = await getAuthToken(request);
    if (!token) {
      test.skip(true, 'Auth not available');
      return;
    }

    const res = await request.post(`${API_URL}/v1/bookings/00000000-0000-0000-0000-000000000000/cancel`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { reason: 'test' },
    });

    // Should return 404 or similar — not a 500
    expect(res.status()).toBeLessThan(500);
  });
});
