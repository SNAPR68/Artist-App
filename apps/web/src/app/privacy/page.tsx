import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy | Artist Booking Platform',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <Link href="/" className="text-primary-500 text-sm hover:underline">&larr; Back to Home</Link>
      <h1 className="text-3xl font-bold text-gray-900 mt-4 mb-8">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-6">Last updated: March 2026</p>

      <div className="prose prose-sm prose-gray max-w-none space-y-6">
        <section>
          <h2 className="text-lg font-semibold text-gray-900">1. Information We Collect</h2>
          <p className="text-gray-700">We collect the following categories of personal information:</p>
          <ul className="list-disc pl-5 text-gray-700 space-y-1">
            <li><strong>Account Data:</strong> Phone number, name, role (artist/client/agent).</li>
            <li><strong>Profile Data:</strong> Stage name, city, genres, bio, photos, videos.</li>
            <li><strong>Booking Data:</strong> Event details, dates, venues, amounts, payment records.</li>
            <li><strong>Usage Data:</strong> IP address, device info, pages visited, search queries.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">2. How We Protect Your Data</h2>
          <p className="text-gray-700">Sensitive personal information (phone numbers, email addresses) is encrypted using AES-256-GCM encryption at rest. Searchable fields use HMAC-SHA256 hashing. All data transmission uses TLS 1.2+.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">3. How We Use Your Information</h2>
          <ul className="list-disc pl-5 text-gray-700 space-y-1">
            <li>To authenticate your identity via OTP verification.</li>
            <li>To facilitate bookings between Artists and Clients.</li>
            <li>To process payments through our payment partner (Razorpay).</li>
            <li>To send booking notifications via SMS, WhatsApp, email, or push notifications.</li>
            <li>To generate GST-compliant invoices and tax documents.</li>
            <li>To improve the Platform through analytics and usage patterns.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">4. Third-Party Services</h2>
          <p className="text-gray-700">We share data with the following third parties as necessary:</p>
          <ul className="list-disc pl-5 text-gray-700 space-y-1">
            <li><strong>Razorpay:</strong> Payment processing (PCI-DSS compliant).</li>
            <li><strong>Supabase:</strong> Database hosting and file storage.</li>
            <li><strong>MSG91:</strong> SMS delivery for OTP and notifications.</li>
            <li><strong>Gupshup:</strong> WhatsApp business messaging.</li>
            <li><strong>Resend:</strong> Transactional email delivery.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">5. Data Retention</h2>
          <p className="text-gray-700">Account data is retained for as long as your account is active. Booking and payment records are retained for 8 years as required by Indian tax law (GST compliance). Artist performance data, ratings, and reviews are retained indefinitely to maintain platform integrity. You may request deletion of your account, after which personal data will be anonymized within 30 days (except records required by law, tax compliance, or settlement disputes).</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">5A. Cross-Border Data Transfers</h2>
          <p className="text-gray-700">While the Artist Booking Platform is operated within India, certain data processing may occur through our cloud infrastructure partners located outside India. We ensure all such transfers comply with applicable data protection requirements and are governed by appropriate safeguards and standard contractual clauses.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">6. Your Rights</h2>
          <p className="text-gray-700">Under applicable Indian data protection law, you have the right to:</p>
          <ul className="list-disc pl-5 text-gray-700 space-y-1">
            <li>Access the personal data we hold about you.</li>
            <li>Correct inaccurate or incomplete data.</li>
            <li>Request deletion of your data (subject to legal obligations).</li>
            <li>Withdraw consent for notifications at any time.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">7. Cookies</h2>
          <p className="text-gray-700">We use essential cookies for authentication (JWT tokens stored in localStorage). We do not use third-party tracking cookies.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">8. Children&apos;s Privacy</h2>
          <p className="text-gray-700">The Platform is not intended for users under 18 years of age. We do not knowingly collect personal information from minors.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">9. Changes to This Policy</h2>
          <p className="text-gray-700">We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated revision date. Continued use of the Platform constitutes acceptance of the updated policy.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">10. International Data Transfers</h2>
          <p className="text-gray-700">If you are accessing the Platform from outside India, please note that your data may be transferred to, stored in, and processed in India. By using the Platform, you consent to such transfer and processing under the laws of India.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">11. Data Breach Notification</h2>
          <p className="text-gray-700">In the event of a data breach involving your personal information, we will notify you within 72 hours of discovering the breach, as required by applicable law. We will provide details of what data was compromised and the steps you should take to protect yourself.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">12. Our Data Protection Officer</h2>
          <p className="text-gray-700">We have appointed a Data Protection Officer to oversee our privacy practices. You can contact our DPO at <strong>dpo@artistbooking.in</strong> for any privacy-related concerns or to exercise your data rights.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">13. Contact Us</h2>
          <p className="text-gray-700">For privacy-related inquiries, you may contact us through:</p>
          <ul className="list-disc pl-5 text-gray-700 space-y-1">
            <li>Email: <strong>privacy@artistbooking.in</strong></li>
            <li>Postal Address: Artist Booking Platform, 123 Tech Street, Mumbai, Maharashtra 400001, India</li>
            <li>In-app Support: Use the Help feature within the Platform</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
