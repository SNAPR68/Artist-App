'use client';

import { useState } from 'react';
import Link from 'next/link';

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

  const toggle = (key: string) => {
    setOpenIndex(openIndex === key ? null : key);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-nocturne-text-primary mb-2">Help & FAQ</h1>
      <p className="text-nocturne-text-tertiary mb-8">
        Find answers to common questions about using ArtistBooking.
      </p>

      {FAQ_SECTIONS.map((section, si) => (
        <div key={section.title} className="mb-8">
          <h2 className="text-lg font-semibold text-nocturne-text-primary mb-3">{section.title}</h2>
          <div className="bg-nocturne-surface rounded-lg border border-nocturne-border-subtle divide-y divide-gray-100">
            {section.items.map((item, ii) => {
              const key = `${si}-${ii}`;
              const isOpen = openIndex === key;
              return (
                <div key={key}>
                  <button
                    onClick={() => toggle(key)}
                    className="w-full px-4 py-3 flex items-center justify-between text-left"
                  >
                    <span className="text-sm font-medium text-nocturne-text-primary">{item.q}</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`h-4 w-4 text-nocturne-text-tertiary transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-3 text-sm text-nocturne-text-secondary leading-relaxed">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className="bg-nocturne-primary-light rounded-lg p-6 text-center">
        <h3 className="font-semibold text-nocturne-text-primary mb-2">Still need help?</h3>
        <p className="text-sm text-nocturne-text-secondary mb-4">
          Our support team is here to assist you.
        </p>
        <a
          href="mailto:support@artistbooking.in"
          className="inline-block bg-nocturne-primary text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-nocturne-primary transition-colors"
        >
          Contact Support
        </a>
      </div>

      <div className="mt-8 text-center text-sm text-nocturne-text-tertiary space-x-4">
        <Link href="/terms" className="hover:text-nocturne-text-secondary">Terms of Service</Link>
        <Link href="/privacy" className="hover:text-nocturne-text-secondary">Privacy Policy</Link>
      </div>
    </div>
  );
}
