'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { analytics } from '@/lib/analytics';

const PLANS = [
  {
    name: 'Free',
    price: '₹0',
    period: 'forever',
    description: 'For solo planners getting started',
    features: [
      '5 briefs per month',
      '1 team member',
      'AI decision engine',
      'Basic recommendations',
      'Email support',
    ],
    cta: 'Get Started Free',
    ctaHref: '/agency/join',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '₹15,000',
    period: '/month',
    description: 'For agencies running real deal flow',
    features: [
      'Unlimited briefs',
      'Up to 10 team members',
      'AI decision engine + clarifying flow',
      'Branded proposal PDFs',
      'Deal pipeline Kanban',
      'Team collaboration',
      'Deal history vault + search',
      'GST invoice generation',
      'CSV/Tally export',
      'Priority concierge support',
    ],
    cta: 'Start 14-Day Free Trial',
    ctaHref: '/agency/join',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For multi-city agencies and brands',
    features: [
      'Everything in Pro',
      'Unlimited team members',
      'Multi-workspace support',
      'Custom API integrations',
      'Dedicated account manager',
      'SLA + priority support',
      'White-label proposals',
      'Custom analytics dashboard',
    ],
    cta: 'Contact Sales',
    ctaHref: 'mailto:raj@thesingularitycovenant.com',
    highlight: false,
  },
];

export default function PricingPage() {
  const router = useRouter();

  useEffect(() => {
    analytics.trackEvent('pricing_viewed', { source: 'marketing' });
  }, []);

  return (
    <div className="min-h-screen bg-[#0e0e0f] px-6 py-20">
      {/* Header */}
      <div className="max-w-5xl mx-auto text-center mb-16">
        <Link href="/" className="text-xl font-sans font-black tracking-[0.3em] text-white mb-8 block">GRID</Link>
        <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-4">
          Simple pricing. No surprises.
        </h1>
        <p className="text-white/40 text-base max-w-xl mx-auto">
          Start free. Upgrade when your agency needs team collaboration, branded proposals, and unlimited briefs.
        </p>
      </div>

      {/* Plans Grid */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={`relative rounded-2xl p-8 flex flex-col ${
              plan.highlight
                ? 'border-2 border-[#c39bff]/50 bg-[#c39bff]/5'
                : 'border border-white/10 bg-white/[0.02]'
            }`}
          >
            {/* Popular badge */}
            {plan.highlight && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#c39bff] text-[#0e0e0f] text-[10px] font-bold uppercase tracking-widest">
                Most Popular
              </div>
            )}

            {/* Plan header */}
            <div className="mb-6">
              <h3 className="text-lg font-bold text-white mb-1">{plan.name}</h3>
              <p className="text-white/30 text-xs mb-4">{plan.description}</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-white">{plan.price}</span>
                {plan.period && <span className="text-white/30 text-sm">{plan.period}</span>}
              </div>
            </div>

            {/* Features */}
            <ul className="space-y-2.5 mb-8 flex-1">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-sm">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={plan.highlight ? '#c39bff' : '#ffffff40'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  <span className="text-white/50 text-xs">{feature}</span>
                </li>
              ))}
            </ul>

            {/* CTA */}
            <button
              onClick={() => {
                analytics.trackEvent('pricing_cta_clicked', {
                  plan: plan.name,
                  price: plan.price,
                  destination: plan.ctaHref,
                });
                if (plan.ctaHref.startsWith('mailto:')) {
                  window.location.href = plan.ctaHref;
                } else {
                  router.push(plan.ctaHref);
                }
              }}
              className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors ${
                plan.highlight
                  ? 'bg-white text-[#0e0e0f] hover:bg-white/90'
                  : 'border border-white/15 text-white/60 hover:text-white hover:border-white/30'
              }`}
            >
              {plan.cta}
            </button>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div className="max-w-2xl mx-auto">
        <h2 className="text-lg font-bold text-white text-center mb-8">Frequently asked questions</h2>
        <div className="space-y-4">
          {[
            {
              q: 'Can I try Pro features before paying?',
              a: 'Yes — every Pro plan starts with a 14-day free trial. No credit card required.',
            },
            {
              q: 'What counts as a "brief"?',
              a: 'Each time you submit an event description to the decision engine (via the chat box, voice, or API), that counts as one brief.',
            },
            {
              q: 'Can I switch plans later?',
              a: 'Yes. Upgrade, downgrade, or cancel anytime. Your data stays yours.',
            },
            {
              q: 'Do you support Razorpay / UPI payments?',
              a: 'Yes. We accept UPI, cards, net banking, and wallets via Razorpay. GST invoices are generated automatically.',
            },
          ].map((faq) => (
            <div key={faq.q} className="rounded-xl border border-white/8 p-5" style={{ background: 'rgba(255,255,255,0.02)' }}>
              <h3 className="text-sm font-semibold text-white mb-1.5">{faq.q}</h3>
              <p className="text-xs text-white/35 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="text-center mt-16">
        <p className="text-white/20 text-xs">
          Questions? Email <a href="mailto:raj@thesingularitycovenant.com" className="text-[#c39bff]/50 hover:text-[#c39bff]">raj@thesingularitycovenant.com</a>
        </p>
      </div>
    </div>
  );
}
