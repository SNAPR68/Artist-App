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
          <p className="text-gray-700">Account data is retained for as long as your account is active. Booking and payment records are retained for 8 years as required by Indian tax law. You may request deletion of your account, after which personal data will be anonymized within 30 days (except records required by law).</p>
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
          <h2 className="text-lg font-semibold text-gray-900">10. Contact Us</h2>
          <p className="text-gray-700">For privacy-related inquiries, contact us at <strong>privacy@artistbooking.in</strong>.</p>
        </section>
      </div>
    </div>
  );
}
