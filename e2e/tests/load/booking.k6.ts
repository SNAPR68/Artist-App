import http from 'k6/http';
import { check, sleep, group } from 'k6';

/**
 * Load testing script for concurrent booking operations
 * Simulates realistic booking flow with ramp-up and soak testing
 * Run with: k6 run e2e/tests/load/booking.k6.ts
 */

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const TEST_TOKEN = __ENV.TEST_TOKEN || 'test-auth-token';

export const options = {
  stages: [
    // Ramp-up: gradually increase load
    { duration: '30s', target: 10 },
    { duration: '1m30s', target: 50 },
    { duration: '20s', target: 100 },

    // Sustain: hold peak load
    { duration: '2m', target: 100 },

    // Ramp-down: gradually decrease load
    { duration: '30s', target: 50 },
    { duration: '30s', target: 10 },
    { duration: '30s', target: 0 },
  ],

  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.1'],
    'group_duration{group:::booking_flow}': ['p(95)<2000'],
  },
};

interface Booking {
  id: string;
  status: string;
  amount: number;
}

export default function () {
  const artistId = `artist-${Math.floor(Math.random() * 1000)}`;
  const customerId = `customer-${Math.floor(Math.random() * 1000)}`;
  const eventDate = getRandomEventDate();

  // Booking creation flow
  group('booking_flow', () => {
    // Step 1: Create booking
    const createPayload = {
      artistId,
      eventDate,
      eventType: randomEventType(),
      duration: Math.floor(Math.random() * 4) + 1,
      location: randomLocation(),
      estimatedAmount: Math.floor(Math.random() * 100000) + 10000,
      notes: 'Load test booking',
    };

    const createRes = http.post(`${BASE_URL}/v1/bookings`, JSON.stringify(createPayload), {
      headers: {
        Authorization: `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    check(createRes, {
      'booking creation status is 201': (r) => r.status === 201,
      'booking has ID': (r) => {
        try {
          const booking = JSON.parse(r.body) as Booking;
          return !!booking.id;
        } catch {
          return false;
        }
      },
    });

    if (createRes.status !== 201) {
      return; // Skip rest of flow if creation failed
    }

    const booking = JSON.parse(createRes.body) as Booking;
    const bookingId = booking.id;
    sleep(1);

    // Step 2: Submit booking for confirmation
    const submitRes = http.post(`${BASE_URL}/v1/bookings/${bookingId}/submit`, JSON.stringify({}), {
      headers: {
        Authorization: `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    check(submitRes, {
      'booking submit status is 200': (r) => r.status === 200,
      'booking status is PENDING_CONFIRMATION': (r) => {
        try {
          const b = JSON.parse(r.body) as Booking;
          return b.status === 'PENDING_CONFIRMATION';
        } catch {
          return false;
        }
      },
    });

    sleep(0.5);

    // Step 3: Confirm booking (as artist)
    const confirmRes = http.post(
      `${BASE_URL}/v1/bookings/${bookingId}/confirm`,
      JSON.stringify({ artistNotes: 'Ready to perform' }),
      {
        headers: {
          Authorization: `Bearer ${TEST_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    check(confirmRes, {
      'booking confirm status is 200': (r) => r.status === 200,
      'booking status is CONFIRMED': (r) => {
        try {
          const b = JSON.parse(r.body) as Booking;
          return b.status === 'CONFIRMED';
        } catch {
          return false;
        }
      },
    });

    sleep(0.5);

    // Step 4: Request payment
    const paymentReqRes = http.post(
      `${BASE_URL}/v1/bookings/${bookingId}/request-payment`,
      JSON.stringify({
        amount: booking.amount,
        paymentDeadline: eventDate,
      }),
      {
        headers: {
          Authorization: `Bearer ${TEST_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    check(paymentReqRes, {
      'payment request status is 200': (r) => r.status === 200,
      'booking status is PAYMENT_PENDING': (r) => {
        try {
          const b = JSON.parse(r.body) as Booking;
          return b.status === 'PAYMENT_PENDING';
        } catch {
          return false;
        }
      },
    });

    sleep(0.5);

    // Step 5: Mark payment received
    const paymentRecvRes = http.post(
      `${BASE_URL}/v1/bookings/${bookingId}/payment-received`,
      JSON.stringify({
        paymentId: `pay_${Math.random().toString(36).substring(7)}`,
        transactionId: `txn_${Math.random().toString(36).substring(7)}`,
        amount: booking.amount,
      }),
      {
        headers: {
          Authorization: `Bearer ${TEST_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    check(paymentRecvRes, {
      'payment received status is 200': (r) => r.status === 200,
      'booking status is PAYMENT_RECEIVED': (r) => {
        try {
          const b = JSON.parse(r.body) as Booking;
          return b.status === 'PAYMENT_RECEIVED';
        } catch {
          return false;
        }
      },
    });

    sleep(0.5);

    // Step 6: Accept booking
    const acceptRes = http.post(
      `${BASE_URL}/v1/bookings/${bookingId}/accept`,
      JSON.stringify({ confirmationCode: `CONF_${Date.now()}` }),
      {
        headers: {
          Authorization: `Bearer ${TEST_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    check(acceptRes, {
      'booking accept status is 200': (r) => r.status === 200,
      'booking status is ACCEPTED': (r) => {
        try {
          const b = JSON.parse(r.body) as Booking;
          return b.status === 'ACCEPTED';
        } catch {
          return false;
        }
      },
    });
  });

  // Concurrent search operations
  group('artist_search', () => {
    const searchRes = http.get(`${BASE_URL}/v1/artists/search`, {
      headers: {
        Authorization: `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json',
      },
      params: {
        q: randomEventType(),
        limit: '20',
      },
    });

    check(searchRes, {
      'search status is 200': (r) => r.status === 200,
      'search returns results': (r) => {
        try {
          const data = JSON.parse(r.body) as { artists?: unknown[] };
          return Array.isArray(data.artists);
        } catch {
          return false;
        }
      },
    });
  });

  sleep(Math.random() * 3);
}

// Helper functions
function getRandomEventDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + Math.floor(Math.random() * 30) + 1);
  return date.toISOString().split('T')[0];
}

function randomEventType(): string {
  const types = ['wedding', 'corporate', 'concert', 'party', 'festival', 'conference'];
  return types[Math.floor(Math.random() * types.length)];
}

function randomLocation(): string {
  const locations = [
    'Delhi',
    'Mumbai',
    'Bangalore',
    'Hyderabad',
    'Pune',
    'Chennai',
    'Kolkata',
  ];
  return locations[Math.floor(Math.random() * locations.length)];
}

// Soak test configuration
export function handleSummary(data: unknown) {
  return {
    'summary.json': data,
    stdout: JSON.stringify(data, null, 2),
  };
}
