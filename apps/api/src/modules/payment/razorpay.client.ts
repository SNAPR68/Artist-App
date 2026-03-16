import Razorpay from 'razorpay';
import crypto from 'crypto';
import { config } from '../../config/index.js';

const isMockMode = !config.RAZORPAY_KEY_ID || config.RAZORPAY_KEY_ID === 'rzp_test_placeholder';

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
      console.log(`[RAZORPAY MOCK] Creating order: ₹${params.amount_paise / 100} (${params.receipt})`);
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
