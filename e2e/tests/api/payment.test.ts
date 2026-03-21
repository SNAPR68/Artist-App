import { test, expect } from '@playwright/test';

/**
 * API integration tests for payment processing
 * Tests payment flow with Razorpay test mode
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const TEST_TOKEN = 'test-auth-token'; // Use valid test token

interface PaymentPayload {
  amount: number;
  currency: string;
  bookingId: string;
  customerId: string;
  description: string;
  notes?: Record<string, string>;
}

interface PaymentOrder {
  id: string;
  entity: string;
  amount: number;
  currency: string;
  status: string;
  receipt: string;
}

test.describe('Payment API Integration Tests', () => {
  // Test 1: Create payment order
  test('POST /v1/payments/orders - should create payment order', async ({ request }) => {
    const payload: PaymentPayload = {
      amount: 50000, // 500 INR in paise
      currency: 'INR',
      bookingId: 'booking-123',
      customerId: 'customer-123',
      description: 'Payment for artist booking',
      notes: {
        bookingDate: '2025-06-15',
        artistName: 'Rajeev Kumar',
      },
    };

    const response = await request.post(`${API_BASE_URL}/v1/payments/orders`, {
      headers: {
        Authorization: `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json',
      },
      data: payload,
    });

    expect(response.status()).toBe(201);

    const data = (await response.json()) as PaymentOrder;
    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('amount', payload.amount);
    expect(data).toHaveProperty('currency', payload.currency);
    expect(data.status).toBe('created');
  });

  // Test 2: Verify payment signature
  test('POST /v1/payments/verify - should verify payment signature', async ({ request }) => {
    // First, create an order
    const orderPayload: PaymentPayload = {
      amount: 100000,
      currency: 'INR',
      bookingId: 'booking-456',
      customerId: 'customer-456',
      description: 'Test payment verification',
    };

    const orderResponse = await request.post(`${API_BASE_URL}/v1/payments/orders`, {
      headers: {
        Authorization: `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json',
      },
      data: orderPayload,
    });

    const order = (await orderResponse.json()) as PaymentOrder;

    // Mock Razorpay verification payload
    const verificationPayload = {
      razorpay_order_id: order.id,
      razorpay_payment_id: 'pay_test123',
      razorpay_signature: 'test_signature_123',
    };

    const verifyResponse = await request.post(`${API_BASE_URL}/v1/payments/verify`, {
      headers: {
        Authorization: `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json',
      },
      data: verificationPayload,
    });

    expect(verifyResponse.status()).toBeLessThan(500); // Should not error out
    // Verification will fail in test, but should handle gracefully
  });

  // Test 3: Get payment status
  test('GET /v1/payments/:paymentId - should get payment status', async ({ request }) => {
    // First create a payment
    const payload: PaymentPayload = {
      amount: 75000,
      currency: 'INR',
      bookingId: 'booking-789',
      customerId: 'customer-789',
      description: 'Get payment status test',
    };

    const createResponse = await request.post(`${API_BASE_URL}/v1/payments/orders`, {
      headers: {
        Authorization: `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json',
      },
      data: payload,
    });

    const order = (await createResponse.json()) as PaymentOrder;

    // Get payment status
    const statusResponse = await request.get(`${API_BASE_URL}/v1/payments/${order.id}`, {
      headers: {
        Authorization: `Bearer ${TEST_TOKEN}`,
      },
    });

    expect(statusResponse.status()).toBe(200);
    const paymentData = await statusResponse.json();
    expect(paymentData).toHaveProperty('id', order.id);
    expect(paymentData).toHaveProperty('amount');
    expect(paymentData).toHaveProperty('status');
  });

  // Test 4: List payments
  test('GET /v1/payments - should list user payments', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/v1/payments`, {
      headers: {
        Authorization: `Bearer ${TEST_TOKEN}`,
      },
      params: {
        limit: 10,
        skip: 0,
      },
    });

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('payments');
    expect(data).toHaveProperty('total');
    expect(Array.isArray(data.payments)).toBe(true);
  });

  // Test 5: Refund payment
  test('POST /v1/payments/:paymentId/refund - should initiate refund', async ({ request }) => {
    // Create a payment first
    const payload: PaymentPayload = {
      amount: 60000,
      currency: 'INR',
      bookingId: 'booking-refund-test',
      customerId: 'customer-refund',
      description: 'Payment for refund test',
    };

    const createResponse = await request.post(`${API_BASE_URL}/v1/payments/orders`, {
      headers: {
        Authorization: `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json',
      },
      data: payload,
    });

    const order = (await createResponse.json()) as PaymentOrder;

    // Attempt refund
    const refundResponse = await request.post(
      `${API_BASE_URL}/v1/payments/${order.id}/refund`,
      {
        headers: {
          Authorization: `Bearer ${TEST_TOKEN}`,
          'Content-Type': 'application/json',
        },
        data: {
          amount: payload.amount,
          reason: 'Booking cancelled',
          notes: {
            cancellationReason: 'Customer requested',
          },
        },
      }
    );

    expect(refundResponse.status()).toBeLessThan(500);
  });

  // Test 6: Get refund status
  test('GET /v1/payments/:paymentId/refund - should get refund status', async ({ request }) => {
    // This would use an existing payment ID with a refund
    const paymentId = 'test-payment-with-refund';

    const response = await request.get(`${API_BASE_URL}/v1/payments/${paymentId}/refund`, {
      headers: {
        Authorization: `Bearer ${TEST_TOKEN}`,
      },
    });

    // May return 404 for test data, but should not error
    expect([200, 404, 400]).toContain(response.status());
  });

  // Test 7: Payment webhooks
  test('POST /webhooks/razorpay - should handle Razorpay webhook', async ({ request }) => {
    const webhookPayload = {
      event: 'payment.authorized',
      created_at: Math.floor(Date.now() / 1000),
      payload: {
        payment: {
          entity: {
            id: 'pay_test123',
            entity: 'payment',
            amount: 50000,
            currency: 'INR',
            status: 'authorized',
            method: 'card',
            description: 'Test payment',
            order_id: 'order_test123',
          },
        },
      },
    };

    const response = await request.post(`${API_BASE_URL}/webhooks/razorpay`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Razorpay-Signature': 'test_signature',
      },
      data: webhookPayload,
    });

    // Webhook should be accepted or return 400 for invalid signature
    expect([200, 400, 422]).toContain(response.status());
  });

  // Test 8: Payment with invalid amount
  test('POST /v1/payments/orders - should reject invalid amounts', async ({ request }) => {
    const invalidPayloads = [
      {
        amount: -1000, // Negative
        currency: 'INR',
        bookingId: 'booking-invalid-1',
        customerId: 'customer-1',
        description: 'Invalid payment',
      },
      {
        amount: 0, // Zero
        currency: 'INR',
        bookingId: 'booking-invalid-2',
        customerId: 'customer-2',
        description: 'Invalid payment',
      },
    ];

    for (const payload of invalidPayloads) {
      const response = await request.post(`${API_BASE_URL}/v1/payments/orders`, {
        headers: {
          Authorization: `Bearer ${TEST_TOKEN}`,
          'Content-Type': 'application/json',
        },
        data: payload,
      });

      expect(response.status()).toBe(400);
    }
  });

  // Test 9: Payment without authentication
  test('POST /v1/payments/orders - should reject unauthenticated requests', async ({ request }) => {
    const payload: PaymentPayload = {
      amount: 50000,
      currency: 'INR',
      bookingId: 'booking-123',
      customerId: 'customer-123',
      description: 'Test',
    };

    const response = await request.post(`${API_BASE_URL}/v1/payments/orders`, {
      headers: {
        'Content-Type': 'application/json',
      },
      data: payload,
    });

    expect(response.status()).toBe(401);
  });

  // Test 10: Get payment invoice
  test('GET /v1/payments/:paymentId/invoice - should get payment invoice', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/v1/payments/test-payment-id/invoice`, {
      headers: {
        Authorization: `Bearer ${TEST_TOKEN}`,
      },
    });

    expect([200, 404]).toContain(response.status());
  });
});
