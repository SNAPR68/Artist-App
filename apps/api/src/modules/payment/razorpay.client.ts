import Razorpay from 'razorpay';
import crypto from 'crypto';
import { config } from '../../config/index.js';

const razorpay = new Razorpay({
  key_id: config.RAZORPAY_KEY_ID ?? 'rzp_test_placeholder',
  key_secret: config.RAZORPAY_KEY_SECRET ?? 'placeholder',
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
    return razorpay.orders.create({
      amount: params.amount_paise,
      currency: params.currency,
      receipt: params.receipt,
      notes: params.notes,
    });
  }

  verifySignature(params: VerifySignatureParams): boolean {
    const secret = config.RAZORPAY_KEY_SECRET ?? '';
    const body = `${params.razorpay_order_id}|${params.razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');
    return expectedSignature === params.razorpay_signature;
  }

  verifyWebhookSignature(body: string, signature: string): boolean {
    const secret = config.RAZORPAY_WEBHOOK_SECRET ?? '';
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');
    return expectedSignature === signature;
  }

  async fetchPayment(paymentId: string) {
    return razorpay.payments.fetch(paymentId);
  }

  async initiateRefund(paymentId: string, amountPaise: number, notes?: Record<string, string>) {
    return razorpay.payments.refund(paymentId, {
      amount: amountPaise,
      notes,
    });
  }
}

export const razorpayClient = new RazorpayClient();
