import Razorpay from 'razorpay';
import crypto from 'crypto';
import { config } from '../../config/index.js';

/**
 * Mask a phone number for safe logging: 98****3210
 */
function maskPhoneNumber(phone: string): string {
  if (!phone || phone.length < 4) return '****';
  return phone.slice(0, 2) + '****' + phone.slice(-4);
}

const isMockMode = config.RAZORPAY_MOCK_MODE === 'true' || (!config.RAZORPAY_KEY_ID || config.RAZORPAY_KEY_ID === 'rzp_test_placeholder');

if (isMockMode && config.NODE_ENV === 'production') {
  console.warn('[RAZORPAY] ⚠️ Running in MOCK mode in production! Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET for real payments.');
}

const razorpay = isMockMode
  ? null
  : new Razorpay({
      key_id: config.RAZORPAY_KEY_ID!,
      key_secret: config.RAZORPAY_KEY_SECRET!,
    });

export interface CreateOrderParams {
  amount_paise: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface VerifySignatureParams {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export class RazorpayClient {
  async createOrder(params: CreateOrderParams) {
    if (isMockMode) {
      // Log masked notes to avoid logging PII
      const maskedNotes = params.notes ? Object.entries(params.notes).reduce((acc, [key, value]) => {
        acc[key] = /phone|mobile|customer_phone/.test(key) ? maskPhoneNumber(value) : value;
        return acc;
      }, {} as Record<string, string>) : {};
      console.log(`[RAZORPAY MOCK] Creating order: ₹${params.amount_paise / 100} (${params.receipt})`, { notes: maskedNotes });
      return {
        id: `order_mock_${Date.now()}`,
        entity: 'order',
        amount: params.amount_paise,
        currency: params.currency,
        receipt: params.receipt,
        status: 'created',
        notes: params.notes ?? {},
      };
    }
    return razorpay!.orders.create({
      amount: params.amount_paise,
      currency: params.currency,
      receipt: params.receipt,
      notes: params.notes,
    });
  }

  verifySignature(params: VerifySignatureParams): boolean {
    if (isMockMode) {
      console.log(`[RAZORPAY MOCK] Signature verified for order ${params.razorpay_order_id}`);
      return true;
    }
    const secret = config.RAZORPAY_KEY_SECRET ?? '';
    const body = `${params.razorpay_order_id}|${params.razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');
    return expectedSignature === params.razorpay_signature;
  }

  verifyWebhookSignature(body: string, signature: string): boolean {
    if (isMockMode) {
      console.log(`[RAZORPAY MOCK] Webhook signature verified`);
      return true;
    }
    const secret = config.RAZORPAY_WEBHOOK_SECRET ?? '';
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');
    return expectedSignature === signature;
  }

  async fetchPayment(paymentId: string) {
    if (isMockMode) {
      console.log(`[RAZORPAY MOCK] Fetching payment ${paymentId}`);
      return {
        id: paymentId,
        entity: 'payment',
        amount: 10000,
        currency: 'INR',
        status: 'captured',
        method: 'upi',
      };
    }
    return razorpay!.payments.fetch(paymentId);
  }

  // ─── Subscriptions ──────────────────────────────────────
  async createPlan(params: {
    period: 'monthly' | 'yearly';
    interval: number;
    item: { name: string; amount_paise: number; currency: string; description?: string };
    notes?: Record<string, string>;
  }) {
    if (isMockMode) {
      console.log(`[RAZORPAY MOCK] Creating plan: ${params.item.name} ₹${params.item.amount_paise / 100}/${params.period}`);
      return {
        id: `plan_mock_${Date.now()}`,
        entity: 'plan',
        period: params.period,
        interval: params.interval,
        item: { ...params.item, amount: params.item.amount_paise },
      };
    }
    return (razorpay as unknown as { plans: { create: (p: unknown) => Promise<unknown> } }).plans.create({
      period: params.period,
      interval: params.interval,
      item: {
        name: params.item.name,
        amount: params.item.amount_paise,
        currency: params.item.currency,
        description: params.item.description,
      },
      notes: params.notes,
    });
  }

  async createCustomer(params: { name: string; email?: string; contact?: string; notes?: Record<string, string> }) {
    if (isMockMode) {
      console.log(`[RAZORPAY MOCK] Creating customer: ${params.name}`);
      return { id: `cust_mock_${Date.now()}`, entity: 'customer', name: params.name, email: params.email };
    }
    return (razorpay as unknown as { customers: { create: (p: unknown) => Promise<unknown> } }).customers.create({
      name: params.name,
      email: params.email,
      contact: params.contact,
      notes: params.notes,
    });
  }

  async createSubscription(params: {
    plan_id: string;
    customer_id?: string;
    total_count?: number;
    quantity?: number;
    start_at?: number;
    notes?: Record<string, string>;
  }) {
    if (isMockMode) {
      const id = `sub_mock_${Date.now()}`;
      console.log(`[RAZORPAY MOCK] Creating subscription ${id} for plan ${params.plan_id}`);
      return {
        id,
        entity: 'subscription',
        plan_id: params.plan_id,
        customer_id: params.customer_id,
        status: 'created',
        total_count: params.total_count ?? 12,
        paid_count: 0,
        short_url: `https://rzp.io/i/mock-${id}`,
      };
    }
    return (razorpay as unknown as { subscriptions: { create: (p: unknown) => Promise<unknown> } }).subscriptions.create({
      plan_id: params.plan_id,
      customer_id: params.customer_id,
      total_count: params.total_count ?? 12,
      quantity: params.quantity ?? 1,
      start_at: params.start_at,
      customer_notify: 1,
      notes: params.notes,
    });
  }

  async fetchSubscription(subscriptionId: string) {
    if (isMockMode) {
      return { id: subscriptionId, status: 'active', paid_count: 1, remaining_count: 11 };
    }
    return (razorpay as unknown as { subscriptions: { fetch: (id: string) => Promise<unknown> } }).subscriptions.fetch(subscriptionId);
  }

  async cancelSubscription(subscriptionId: string, cancelAtCycleEnd = true) {
    if (isMockMode) {
      console.log(`[RAZORPAY MOCK] Cancelling subscription ${subscriptionId} (at_cycle_end=${cancelAtCycleEnd})`);
      return { id: subscriptionId, status: cancelAtCycleEnd ? 'active' : 'cancelled', cancel_at_cycle_end: cancelAtCycleEnd };
    }
    return (razorpay as unknown as {
      subscriptions: { cancel: (id: string, cancelAtCycleEnd: boolean) => Promise<unknown> };
    }).subscriptions.cancel(subscriptionId, cancelAtCycleEnd);
  }

  async initiateRefund(paymentId: string, amountPaise: number, notes?: Record<string, string>) {
    if (isMockMode) {
      console.log(`[RAZORPAY MOCK] Refund ₹${amountPaise / 100} for payment ${paymentId}`);
      return {
        id: `rfnd_mock_${Date.now()}`,
        entity: 'refund',
        amount: amountPaise,
        payment_id: paymentId,
        status: 'processed',
        notes: notes ?? {},
      };
    }
    return razorpay!.payments.refund(paymentId, {
      amount: amountPaise,
      notes,
    });
  }
}

export const razorpayClient = new RazorpayClient();
