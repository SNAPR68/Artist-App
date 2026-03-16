import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service | Artist Booking Platform',
};

export default function TermsOfServicePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <Link href="/" className="text-primary-500 text-sm hover:underline">&larr; Back to Home</Link>
      <h1 className="text-3xl font-bold text-gray-900 mt-4 mb-8">Terms of Service</h1>
      <p className="text-sm text-gray-500 mb-6">Last updated: March 2026</p>

      <div className="prose prose-sm prose-gray max-w-none space-y-6">
        <section>
          <h2 className="text-lg font-semibold text-gray-900">1. Acceptance of Terms</h2>
          <p className="text-gray-700">By accessing or using ArtistBooking Platform (&quot;Platform&quot;), you agree to be bound by these Terms of Service. If you do not agree, do not use the Platform.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">2. Definitions</h2>
          <ul className="list-disc pl-5 text-gray-700 space-y-1">
            <li><strong>Artist:</strong> A performer or entertainer registered on the Platform.</li>
            <li><strong>Client:</strong> An individual or organization booking an Artist.</li>
            <li><strong>Agent:</strong> A representative managing one or more Artists.</li>
            <li><strong>Booking:</strong> A confirmed engagement between a Client and an Artist.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">3. Account Registration</h2>
          <p className="text-gray-700">Users must provide a valid Indian mobile number for OTP-based authentication. You are responsible for maintaining the confidentiality of your account. Multiple accounts per phone number are not permitted.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">4. Booking & Payment</h2>
          <p className="text-gray-700">All payments are processed through Razorpay. Funds are held in escrow until 3 business days after event completion, at which point the Artist payout is released. The Platform charges a 10% service fee plus applicable GST (18%).</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">5. Cancellation Policy</h2>
          <ul className="list-disc pl-5 text-gray-700 space-y-1">
            <li>30+ days before event: 100% refund</li>
            <li>15-30 days before event: 75% refund</li>
            <li>7-14 days before event: 50% refund</li>
            <li>Less than 7 days: No refund</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">6. Tax Deduction at Source (TDS)</h2>
          <p className="text-gray-700">TDS at 10% under Section 194J of the Income Tax Act, 1961 is deducted from artist payouts and deposited with the Government of India. TDS certificates are available upon request.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">7. Content & Conduct</h2>
          <p className="text-gray-700">Users must not upload inappropriate, misleading, or copyrighted content. The Platform reserves the right to remove content and suspend accounts that violate these terms.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">8. Limitation of Liability</h2>
          <p className="text-gray-700">The Platform acts as a marketplace connecting Artists and Clients. We are not liable for the quality of performances, venue issues, or disputes between parties beyond the scope of our escrow service.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">9. Dispute Resolution</h2>
          <p className="text-gray-700">All disputes shall be subject to arbitration under the Indian Arbitration and Conciliation Act, 1996, with the seat of arbitration in Mumbai, Maharashtra.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">10. Governing Law</h2>
          <p className="text-gray-700">These Terms are governed by the laws of India. Courts in Mumbai, Maharashtra shall have exclusive jurisdiction.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">11. Contact</h2>
          <p className="text-gray-700">For questions about these Terms, email us at <strong>legal@artistbooking.in</strong>.</p>
        </section>
      </div>
    </div>
  );
}
