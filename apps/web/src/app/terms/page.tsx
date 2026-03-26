import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service | Artist Booking Platform',
};

export default function TermsOfServicePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <Link href="/" className="text-primary-500 text-sm hover:underline">&larr; Back to Home</Link>
      <h1 className="text-3xl font-bold text-nocturne-text-primary mt-4 mb-8">Terms of Service</h1>
      <p className="text-sm text-nocturne-text-tertiary mb-6">Last updated: March 2026</p>

      <div className="prose prose-sm prose-gray max-w-none space-y-6">
        <section>
          <h2 className="text-lg font-semibold text-nocturne-text-primary">1. Acceptance of Terms</h2>
          <p className="text-nocturne-text-secondary">By accessing or using ArtistBooking Platform (&quot;Platform&quot;), you agree to be bound by these Terms of Service. If you do not agree, do not use the Platform.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-nocturne-text-primary">2. Definitions</h2>
          <ul className="list-disc pl-5 text-nocturne-text-secondary space-y-1">
            <li><strong>Artist:</strong> A performer or entertainer registered on the Platform.</li>
            <li><strong>Client:</strong> An individual or organization booking an Artist.</li>
            <li><strong>Agent:</strong> A representative managing one or more Artists.</li>
            <li><strong>Booking:</strong> A confirmed engagement between a Client and an Artist.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-nocturne-text-primary">3. Account Registration</h2>
          <p className="text-nocturne-text-secondary">Users must provide a valid Indian mobile number for OTP-based authentication. You are responsible for maintaining the confidentiality of your account. Multiple accounts per phone number are not permitted.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-nocturne-text-primary">4. Booking & Payment</h2>
          <p className="text-nocturne-text-secondary">All payments are processed through Razorpay. Funds are held in escrow until 3 business days after event completion, at which point the Artist payout is released. The Platform charges a 10% service fee plus applicable GST (18%).</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-nocturne-text-primary">5. Cancellation Policy</h2>
          <ul className="list-disc pl-5 text-nocturne-text-secondary space-y-1">
            <li>30+ days before event: 100% refund</li>
            <li>15-30 days before event: 75% refund</li>
            <li>7-14 days before event: 50% refund</li>
            <li>Less than 7 days: No refund</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-nocturne-text-primary">6. Tax Deduction at Source (TDS)</h2>
          <p className="text-nocturne-text-secondary">TDS at 10% under Section 194J of the Income Tax Act, 1961 is deducted from artist payouts and deposited with the Government of India. TDS certificates are available upon request.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-nocturne-text-primary">7. Content & Conduct</h2>
          <p className="text-nocturne-text-secondary">Users must not upload inappropriate, misleading, or copyrighted content. The Platform reserves the right to remove content and suspend accounts that violate these terms.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-nocturne-text-primary">8. Limitation of Liability</h2>
          <p className="text-nocturne-text-secondary">The Platform acts as a marketplace connecting Artists and Clients. We are not liable for the quality of performances, venue issues, or disputes between parties beyond the scope of our escrow service.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-nocturne-text-primary">9. Dispute Resolution</h2>
          <p className="text-nocturne-text-secondary">All disputes shall be subject to arbitration under the Indian Arbitration and Conciliation Act, 1996, with the seat of arbitration in Mumbai, Maharashtra.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-nocturne-text-primary">10. Governing Law</h2>
          <p className="text-nocturne-text-secondary">These Terms are governed by the laws of India. Courts in Mumbai, Maharashtra shall have exclusive jurisdiction.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-nocturne-text-primary">11. Intellectual Property</h2>
          <p className="text-nocturne-text-secondary">All content on the Platform, including logos, designs, and software, is owned by or licensed to Artist Booking Platform. Artists retain ownership of their performance videos and audio recordings. Clients may not download, reproduce, or distribute artist content without explicit permission.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-nocturne-text-primary">12. Rating & Review System</h2>
          <p className="text-nocturne-text-secondary">Both Artists and Clients can leave ratings and reviews after a booking is completed. Reviews must be truthful and relate to the actual performance or booking experience. We reserve the right to remove reviews that are defamatory, offensive, or unrelated to the service. Artists and Clients may dispute reviews through our support system.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-nocturne-text-primary">13. Booking Modifications</h2>
          <ul className="list-disc pl-5 text-nocturne-text-secondary space-y-1">
            <li>Artist can request modifications (date, time, scope) before acceptance with Client approval</li>
            <li>Client can request modifications within 24 hours of booking confirmation</li>
            <li>Modifications may result in price adjustments, agreed upon by both parties</li>
            <li>After 24 hours, modifications require both parties' written consent</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-nocturne-text-primary">14. Performance Standards for Artists</h2>
          <p className="text-nocturne-text-secondary">Artists agree to:</p>
          <ul className="list-disc pl-5 text-nocturne-text-secondary space-y-1">
            <li>Arrive 15 minutes before the scheduled event time</li>
            <li>Perform for the agreed duration with professionalism</li>
            <li>Bring necessary equipment unless specified otherwise</li>
            <li>Maintain appropriate conduct and language at all times</li>
            <li>Comply with Client's reasonable requests regarding performance type</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-nocturne-text-primary">15. Client Responsibilities</h2>
          <p className="text-nocturne-text-secondary">Clients agree to:</p>
          <ul className="list-disc pl-5 text-nocturne-text-secondary space-y-1">
            <li>Provide accurate event details and venue information</li>
            <li>Arrange safe, appropriate venue for the performance</li>
            <li>Ensure timely payment and no payment disputes after satisfaction</li>
            <li>Treat Artists with respect and professionalism</li>
            <li>Not record performances without written consent (exceptions for personal use)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-nocturne-text-primary">16. Account Suspension & Termination</h2>
          <p className="text-nocturne-text-secondary">We reserve the right to suspend or terminate accounts that:</p>
          <ul className="list-disc pl-5 text-nocturne-text-secondary space-y-1">
            <li>Violate these Terms or our conduct guidelines</li>
            <li>Have multiple payment defaults or chargebacks</li>
            <li>Have ratings consistently below 2.5 stars due to performance issues</li>
            <li>Engage in fraudulent or abusive behavior</li>
            <li>Breach confidentiality or use the Platform to solicit off-platform bookings</li>
          </ul>
          <p className="text-nocturne-text-secondary mt-2">Suspended accounts will be notified with reason and may appeal within 30 days.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-nocturne-text-primary">17. Amendments to Terms</h2>
          <p className="text-nocturne-text-secondary">We may update these Terms at any time. Changes take effect 30 days after posting. Continued use of the Platform after 30 days constitutes acceptance of updated Terms. For material changes, we will provide additional notice via email.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-nocturne-text-primary">18. Severability</h2>
          <p className="text-nocturne-text-secondary">If any provision of these Terms is found invalid or unenforceable by a court of law, that provision will be severed and the remaining provisions will continue in full force and effect.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-nocturne-text-primary">19. Entire Agreement</h2>
          <p className="text-nocturne-text-secondary">These Terms, together with our Privacy Policy, constitute the entire agreement between you and Artist Booking Platform regarding your use of the Platform and supersede all prior or contemporaneous agreements.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-nocturne-text-primary">20. Contact & Support</h2>
          <p className="text-nocturne-text-secondary">For questions or disputes regarding these Terms, contact us at:</p>
          <ul className="list-disc pl-5 text-nocturne-text-secondary space-y-1">
            <li>Email: <strong>legal@artistbooking.in</strong></li>
            <li>Support Portal: Available 24/7 in the Platform</li>
            <li>Postal Address: Artist Booking Platform, 123 Tech Street, Mumbai, Maharashtra 400001, India</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
