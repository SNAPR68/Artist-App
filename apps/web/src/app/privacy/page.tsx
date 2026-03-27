import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy | ArtistBook Platform',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-nocturne-base">
      {/* Ambient glows */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#c39bff]/5 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#a1faff]/5 blur-3xl rounded-full pointer-events-none" />

      <div className="max-w-3xl mx-auto px-4 py-16 relative z-10">
        <Link href="/" className="text-[#c39bff] hover:text-[#a1faff] text-sm font-medium mb-8 inline-block">← Back to Home</Link>

        <div className="glass-card rounded-2xl border border-white/10 p-12 space-y-8">
          <div className="space-y-3 mb-8">
            <h1 className="text-5xl font-display font-extrabold tracking-tighter text-white">Privacy Policy</h1>
            <p className="text-[10px] uppercase tracking-widest font-bold text-white/50">Last updated: March 2026</p>
          </div>

          <div className="space-y-8 text-white/70 leading-relaxed">
            <section>
              <h2 className="text-xl font-display font-bold text-white mb-4">1. Information We Collect</h2>
              <p className="mb-3">We collect the following categories of personal information:</p>
              <ul className="list-disc pl-6 space-y-2 text-white/70">
                <li><strong className="text-white">Account Data:</strong> Phone number, name, role (artist/client/agent).</li>
                <li><strong className="text-white">Profile Data:</strong> Stage name, city, genres, bio, photos, videos.</li>
                <li><strong className="text-white">Booking Data:</strong> Event details, dates, venues, amounts, payment records.</li>
                <li><strong className="text-white">Usage Data:</strong> IP address, device info, pages visited, search queries.</li>
              </ul>
            </section>

            <section className="border-t border-white/10 pt-8">
              <h2 className="text-xl font-display font-bold text-white mb-4">2. How We Protect Your Data</h2>
              <p>Sensitive personal information (phone numbers, email addresses) is encrypted using AES-256-GCM encryption at rest. Searchable fields use HMAC-SHA256 hashing. All data transmission uses TLS 1.2+.</p>
            </section>

            <section className="border-t border-white/10 pt-8">
              <h2 className="text-xl font-display font-bold text-white mb-4">3. How We Use Your Information</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>To authenticate your identity via OTP verification.</li>
                <li>To facilitate bookings between Artists and Clients.</li>
                <li>To process payments through our payment partner (Razorpay).</li>
                <li>To send booking notifications via SMS, WhatsApp, email, or push notifications.</li>
                <li>To generate GST-compliant invoices and tax documents.</li>
                <li>To improve the Platform through analytics and usage patterns.</li>
              </ul>
            </section>

            <section className="border-t border-white/10 pt-8">
              <h2 className="text-xl font-display font-bold text-white mb-4">4. Third-Party Services</h2>
              <p className="mb-3">We share data with the following third parties as necessary:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong className="text-white">Razorpay:</strong> Payment processing (PCI-DSS compliant).</li>
                <li><strong className="text-white">Supabase:</strong> Database hosting and file storage.</li>
                <li><strong className="text-white">MSG91:</strong> SMS delivery for OTP and notifications.</li>
                <li><strong className="text-white">Gupshup:</strong> WhatsApp business messaging.</li>
                <li><strong className="text-white">Resend:</strong> Transactional email delivery.</li>
              </ul>
            </section>

            <section className="border-t border-white/10 pt-8">
              <h2 className="text-xl font-display font-bold text-white mb-4">5. Data Retention</h2>
              <p>Account data is retained for as long as your account is active. Booking and payment records are retained for 8 years as required by Indian tax law (GST compliance). Artist performance data, ratings, and reviews are retained indefinitely to maintain platform integrity. You may request deletion of your account, after which personal data will be anonymized within 30 days (except records required by law, tax compliance, or settlement disputes).</p>
            </section>

            <section className="border-t border-white/10 pt-8">
              <h2 className="text-xl font-display font-bold text-white mb-4">6. Your Rights</h2>
              <p className="mb-3">Under applicable Indian data protection law, you have the right to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Access the personal data we hold about you.</li>
                <li>Correct inaccurate or incomplete data.</li>
                <li>Request deletion of your data (subject to legal obligations).</li>
                <li>Withdraw consent for notifications at any time.</li>
              </ul>
            </section>

            <section className="border-t border-white/10 pt-8">
              <h2 className="text-xl font-display font-bold text-white mb-4">7. Cookies</h2>
              <p>We use essential cookies for authentication (JWT tokens stored in localStorage). We do not use third-party tracking cookies.</p>
            </section>

            <section className="border-t border-white/10 pt-8">
              <h2 className="text-xl font-display font-bold text-white mb-4">8. Contact Us</h2>
              <p className="mb-3">For privacy-related inquiries, you may contact us through:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Email: <strong className="text-[#c39bff]">privacy@artistbooking.in</strong></li>
                <li>Postal Address: ArtistBook Platform, 123 Tech Street, Mumbai, Maharashtra 400001, India</li>
                <li>In-app Support: Use the Help feature within the Platform</li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
