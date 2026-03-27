'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Search } from 'lucide-react';

interface FAQItem {
  q: string;
  a: string;
}

const FAQ_SECTIONS: { title: string; items: FAQItem[] }[] = [
  {
    title: 'For Artists',
    items: [
      {
        q: 'How do I get started as an artist?',
        a: 'Sign up with your phone number, complete your artist profile with photos, videos, and set your pricing. Once verified by our team, you\'ll appear in search results and start receiving booking inquiries.',
      },
      {
        q: 'How does payment work?',
        a: 'When a client confirms a booking, payment is held in escrow. After the event is completed and a 3-day review window passes, the amount is settled to your account minus platform fee (10%) and TDS (10% under Section 194J).',
      },
      {
        q: 'What are the cancellation charges?',
        a: 'Cancellation refunds depend on timing: 30+ days before event = 100% refund, 15-30 days = 75%, 7-14 days = 50%, less than 7 days = no refund. This protects both artists and clients.',
      },
      {
        q: 'How do I manage my calendar?',
        a: 'Use the Calendar page to mark dates as available, blocked, or set custom pricing for peak dates. Clients can only inquire for dates you\'ve marked available.',
      },
      {
        q: 'How do I download my invoices?',
        a: 'Go to Earnings, find your settled transactions, and click the download icon next to any settled payment to get a GST-compliant invoice PDF.',
      },
    ],
  },
  {
    title: 'For Clients',
    items: [
      {
        q: 'How do I book an artist?',
        a: 'Search for artists by category, city, or budget. Send a booking inquiry with your event details. The artist will respond with a quote, and once you accept and pay, the booking is confirmed.',
      },
      {
        q: 'Is my payment secure?',
        a: 'Yes. All payments are processed through Razorpay and held in escrow until the event is completed. Your money is protected until you\'re satisfied with the performance.',
      },
      {
        q: 'Can I negotiate the price?',
        a: 'Yes! After receiving a quote, you can counter-offer. Both parties can negotiate until a price is agreed upon or the inquiry expires.',
      },
      {
        q: 'How do reviews work?',
        a: 'After a booking is completed, both the artist and client can leave reviews. Reviews are published after a short moderation period to ensure quality.',
      },
    ],
  },
  {
    title: 'For Agents',
    items: [
      {
        q: 'How do I manage multiple artists?',
        a: 'Create an agent profile, then add artists to your roster. You can manage bookings, respond to inquiries, and track earnings for all your artists from one dashboard.',
      },
      {
        q: 'What commission do agents earn?',
        a: 'Commission rates are set in your agent profile and agreed upon with each artist. The platform facilitates the arrangement but does not enforce specific rates.',
      },
    ],
  },
  {
    title: 'General',
    items: [
      {
        q: 'What cities do you operate in?',
        a: 'We operate across India. Artists and clients from any city can use the platform. Our strongest presence is in Mumbai, Delhi, Bangalore, Hyderabad, and Chennai.',
      },
      {
        q: 'How do I contact support?',
        a: 'Email us at support@artistbooking.in or use the chat widget on the bottom right. We respond within 24 hours on business days.',
      },
      {
        q: 'Is GST included in the pricing?',
        a: 'Platform fee attracts 18% GST. Artist quotes are inclusive of their charges. A detailed tax breakdown is shown on every invoice with CGST/SGST or IGST split.',
      },
    ],
  },
];

export default function HelpPage() {
  const [openIndex, setOpenIndex] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const toggle = (key: string) => {
    setOpenIndex(openIndex === key ? null : key);
  };

  // Filter FAQs based on search query
  const filteredSections = FAQ_SECTIONS.map(section => ({
    ...section,
    items: section.items.filter(item =>
      item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.a.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(section => section.items.length > 0);

  return (
    <div className="min-h-screen bg-nocturne-base">
      {/* Ambient glows */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#c39bff]/5 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#a1faff]/5 blur-3xl rounded-full pointer-events-none" />

      <div className="max-w-3xl mx-auto px-4 py-16 relative z-10">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl font-display font-extrabold tracking-tighter text-white mb-3">Help & FAQ</h1>
          <p className="text-white/50 text-lg">
            Find answers to common questions about using ArtistBook.
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-12">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
            <input
              type="text"
              placeholder="Search FAQs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-nocturne w-full pl-12 pr-4 py-3 rounded-lg"
            />
          </div>
        </div>

        {/* FAQ Sections */}
        {searchQuery && filteredSections.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center border border-white/10">
            <p className="text-white mb-2">No results found</p>
            <p className="text-white/50">Try searching for different keywords</p>
          </div>
        ) : (
          <div className="space-y-8">
            {(searchQuery ? filteredSections : FAQ_SECTIONS).map((section, si) => (
              <div key={section.title}>
                <h2 className="text-2xl font-display font-bold text-white mb-4">{section.title}</h2>
                <div className="glass-card rounded-2xl border border-white/10 divide-y divide-white/5 overflow-hidden">
                  {section.items.map((item, ii) => {
                    const key = `${si}-${ii}`;
                    const isOpen = openIndex === key;
                    return (
                      <div key={key}>
                        <button
                          onClick={() => toggle(key)}
                          className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
                        >
                          <span className="text-base font-semibold text-white flex-1">{item.q}</span>
                          <ChevronDown
                            className={`w-5 h-5 text-white/50 transition-transform flex-shrink-0 ml-4 ${
                              isOpen ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                        {isOpen && (
                          <div className="px-6 pb-4 text-base text-white/70 leading-relaxed border-t border-white/5">
                            {item.a}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Contact Section */}
        <div className="mt-16 glass-card rounded-2xl border border-white/10 p-8 text-center space-y-4">
          <h3 className="font-display font-bold text-white text-xl">Still need help?</h3>
          <p className="text-white/50">
            Our support team is here to assist you.
          </p>
          <a
            href="mailto:support@artistbooking.in"
            className="inline-block btn-nocturne-primary px-8 py-3 rounded-lg font-semibold"
          >
            Contact Support
          </a>
        </div>

        {/* Footer Links */}
        <div className="mt-12 text-center space-x-6 text-sm text-white/50">
          <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
          <span>•</span>
          <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
        </div>
      </div>
    </div>
  );
}
