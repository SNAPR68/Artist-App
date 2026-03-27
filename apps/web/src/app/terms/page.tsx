import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service | ArtistBook Platform',
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-nocturne-base">
      {/* Ambient glows */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#c39bff]/5 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#a1faff]/5 blur-3xl rounded-full pointer-events-none" />

      <div className="max-w-3xl mx-auto px-4 py-16 relative z-10">
        <Link href="/" className="text-[#c39bff] hover:text-[#a1faff] text-sm font-medium mb-8 inline-block">← Back to Home</Link>

        <div className="glass-card rounded-2xl border border-white/10 p-12 space-y-8">
          <div className="space-y-3 mb-8">
            <h1 className="text-5xl font-display font-extrabold tracking-tighter text-white">Terms of Service</h1>
            <p className="text-[10px] uppercase tracking-widest font-bold text-white/50">Last updated: March 2026</p>
          </div>

          <div className="space-y-8 text-white/70 leading-relaxed">
            <section>
              <h2 className="text-xl font-display font-bold text-white mb-4">1. Acceptance of Terms</h2>
              <p>By accessing or using ArtistBook Platform ("Platform"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Platform.</p>
            </section>

            <section className="border-t border-white/10 pt-8">
              <h2 className="text-xl font-display font-bold text-white mb-4">2. Definitions</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong className="text-white">Artist:</strong> A performer or entertainer registered on the Platform.</li>
                <li><strong className="text-white">Client:</strong> An individual or organization booking an Artist.</li>
                <li><strong className="text-white">Agent:</strong> A representative managing one or more Artists.</li>
                <li><strong className="text-white">Booking:</strong> A confirmed engagement between a Client and an Artist.</li>
              </ul>
            </section>

            <section className="border-t border-white/10 pt-8">
              <h2 className="text-xl font-display font-bold text-white mb-4">3. Account Registration</h2>
              <p>Users must provide a valid Indian mobile number for OTP-based authentication. You are responsible for maintaining the confidentiality of your account. Multiple accounts per phone number are not permitted.</p>
            </section>

            <section className="border-t border-white/10 pt-8">
              <h2 className="text-xl font-display font-bold text-white mb-4">4. Booking & Payment</h2>
              <p>All payments are processed through Razorpay. Funds are held in escrow until 3 business days after event completion, at which point the Artist payout is released. The Platform charges a 10% service fee plus applicable GST (18%).</p>
            </section>

            <section className="border-t border-white/10 pt-8">
              <h2 className="text-xl font-display font-bold text-white mb-4">5. Cancellation Policy</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>30+ days before event: 100% refund</li>
                <li>15-30 days before event: 75% refund</li>
                <li>7-14 days before event: 50% refund</li>
                <li>Less than 7 days: No refund</li>
              </ul>
            </section>

            <section className="border-t border-white/10 pt-8">
              <h2 className="text-xl font-display font-bold text-white mb-4">6. Tax Deduction at Source (TDS)</h2>
              <p>TDS at 10% under Section 194J of the Income Tax Act, 1961 is deducted from artist payouts and deposited with the Government of India. TDS certificates are available upon request.</p>
            </section>

            <section className="border-t border-white/10 pt-8">
              <h2 className="text-xl font-display font-bold text-white mb-4">7. Content & Conduct</h2>
              <p>Users must not upload inappropriate, misleading, or copyrighted content. The Platform reserves the right to remove content and suspend accounts that violate these terms.</p>
            </section>

            <section className="border-t border-white/10 pt-8">
              <h2 className="text-xl font-display font-bold text-white mb-4">8. Limitation of Liability</h2>
              <p>The Platform acts as a marketplace connecting Artists and Clients. We are not liable for the quality of performances, venue issues, or disputes between parties beyond the scope of our escrow service.</p>
            </section>

            <section className="border-t border-white/10 pt-8">
              <h2 className="text-xl font-display font-bold text-white mb-4">9. Dispute Resolution</h2>
              <p>All disputes shall be subject to arbitration under the Indian Arbitration and Conciliation Act, 1996, with the seat of arbitration in Mumbai, Maharashtra.</p>
            </section>

            <section className="border-t border-white/10 pt-8">
              <h2 className="text-xl font-display font-bold text-white mb-4">10. Governing Law</h2>
              <p>These Terms are governed by the laws of India. Courts in Mumbai, Maharashtra shall have exclusive jurisdiction.</p>
            </section>

            <section className="border-t border-white/10 pt-8">
              <h2 className="text-xl font-display font-bold text-white mb-4">11. Performance Standards for Artists</h2>
              <p className="mb-3">Artists agree to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Arrive 15 minutes before the scheduled event time</li>
                <li>Perform for the agreed duration with professionalism</li>
                <li>Bring necessary equipment unless specified otherwise</li>
                <li>Maintain appropriate conduct and language at all times</li>
                <li>Comply with Client's reasonable requests regarding performance type</li>
              </ul>
            </section>

            <section className="border-t border-white/10 pt-8">
              <h2 className="text-xl font-display font-bold text-white mb-4">12. Client Responsibilities</h2>
              <p className="mb-3">Clients agree to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Provide accurate event details and venue information</li>
                <li>Arrange safe, appropriate venue for the performance</li>
                <li>Ensure timely payment and no payment disputes after satisfaction</li>
                <li>Treat Artists with respect and professionalism</li>
                <li>Not record performances without written consent (exceptions for personal use)</li>
              </ul>
            </section>

            <section className="border-t border-white/10 pt-8">
              <h2 className="text-xl font-display font-bold text-white mb-4">13. Account Suspension & Termination</h2>
              <p className="mb-3">We reserve the right to suspend or terminate accounts that:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Violate these Terms or our conduct guidelines</li>
                <li>Have multiple payment defaults or chargebacks</li>
                <li>Have ratings consistently below 2.5 stars due to performance issues</li>
                <li>Engage in fraudulent or abusive behavior</li>
                <li>Breach confidentiality or use the Platform to solicit off-platform bookings</li>
              </ul>
              <p className="mt-3">Suspended accounts will be notified with reason and may appeal within 30 days.</p>
            </section>

            <section className="border-t border-white/10 pt-8">
              <h2 className="text-xl font-display font-bold text-white mb-4">14. Contact & Support</h2>
              <p className="mb-3">For questions or disputes regarding these Terms, contact us at:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Email: <strong className="text-[#c39bff]">legal@artistbooking.in</strong></li>
                <li>Support Portal: Available 24/7 in the Platform</li>
                <li>Postal Address: ArtistBook Platform, 123 Tech Street, Mumbai, Maharashtra 400001, India</li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
