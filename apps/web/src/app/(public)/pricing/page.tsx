'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronDown, Star, Calendar, MessageSquare } from 'lucide-react';
import { analytics } from '@/lib/analytics';
import { apiClient } from '@/lib/api-client';

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
    cta: 'Book a Demo',
    ctaHref: '#demo',
    highlight: false,
  },
];

const TESTIMONIALS = [
  {
    quote: "We used to spend 3 days shortlisting artists for a corporate event. GRID cuts that to 20 minutes. The proposal PDFs alone are worth the subscription.",
    name: 'Priya Sharma',
    role: 'Founder, Eventique India',
    city: 'Mumbai',
    rating: 5,
  },
  {
    quote: "The deal vault is something we didn't know we needed. Being able to pull up exactly what we paid an artist two years ago — that's changed how we negotiate.",
    name: 'Rahul Menon',
    role: 'MD, Stage & Screen Events',
    city: 'Bangalore',
    rating: 5,
  },
  {
    quote: "Concierge saved a client event when our headline act dropped out 48 hours before. GRID found a replacement, negotiated, and confirmed — we just forwarded the proposal.",
    name: 'Deepika Nair',
    role: 'Senior Producer, Spectacle Corp',
    city: 'Delhi',
    rating: 5,
  },
];

const FAQS = [
  {
    q: 'Can I try Pro features before paying?',
    a: 'Yes — every Pro plan starts with a 14-day free trial. No credit card required until the trial ends.',
  },
  {
    q: 'What counts as a "brief"?',
    a: 'Each time you submit an event description to the decision engine (via the chat box, voice, or API), that counts as one brief.',
  },
  {
    q: 'Can I switch plans later?',
    a: 'Yes. Upgrade, downgrade, or cancel anytime from your billing dashboard. Your data stays yours.',
  },
  {
    q: 'Do you support Razorpay / UPI payments?',
    a: 'Yes. We accept UPI, cards, net banking, and wallets via Razorpay. GST invoices are generated automatically after each payment.',
  },
  {
    q: 'How does the concierge work on Pro?',
    a: 'Submit a request from your dashboard. Our team responds within 24h — we can source artists, run negotiations, or manage a live deal end-to-end on your behalf.',
  },
  {
    q: 'Is my client data safe?',
    a: 'All data is encrypted at rest (AES-256) and in transit (TLS 1.3). We\'re hosted on Supabase (AWS Sydney) with daily backups. We never share your data with artists or third parties.',
  },
];

const STATS = [
  { value: '₹2Cr+', label: 'Bookings processed' },
  { value: '50+', label: 'Agencies onboarded' },
  { value: '1,000+', label: 'Artists in network' },
  { value: '24h', label: 'Concierge response SLA' },
];

type CheckoutResp = {
  subscription_id: string;
  razorpay_subscription_id: string;
  razorpay_key_id: string;
  short_url?: string;
  amount_paise: number;
  plan: string;
};

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between p-5 text-left gap-4 group"
      >
        <span className="text-sm font-semibold text-white group-hover:text-[#c39bff] transition-colors">{q}</span>
        <ChevronDown
          className={`w-4 h-4 text-white/30 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="px-5 pb-5">
          <p className="text-xs text-white/40 leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}

export default function PricingPage() {
  const router = useRouter();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [demoName, setDemoName] = useState('');
  const [demoPhone, setDemoPhone] = useState('');
  const [demoSubmitted, setDemoSubmitted] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  useEffect(() => {
    analytics.trackEvent('pricing_viewed', { source: 'marketing' });
  }, []);

  const isLoggedIn = () =>
    typeof window !== 'undefined' && !!localStorage.getItem('grid_access_token');

  const startCheckout = async (plan: 'pro' | 'enterprise') => {
    if (!isLoggedIn()) {
      router.push(`/agency/join?plan=${plan}`);
      return;
    }
    setLoadingPlan(plan);
    setError(null);
    const res = await apiClient<CheckoutResp>('/v1/subscription/checkout', {
      method: 'POST',
      body: JSON.stringify({ plan }),
    });
    setLoadingPlan(null);
    if (!res.success) {
      setError(res.errors?.[0]?.message ?? 'Checkout failed — please try again');
      return;
    }
    analytics.trackEvent('subscription_checkout_started', { plan, amount_paise: res.data.amount_paise });
    if (res.data.short_url) {
      window.location.href = res.data.short_url;
    } else {
      setError('Checkout link unavailable — our team will reach out.');
    }
  };

  const submitDemo = async () => {
    if (!demoName || !demoPhone) return;
    setDemoLoading(true);
    analytics.trackEvent('demo_requested', { name: demoName, phone: demoPhone });
    // Fire and forget to a simple lead capture endpoint or just analytics
    await apiClient('/v1/concierge/requests', {
      method: 'POST',
      body: JSON.stringify({
        workspace_id: '00000000-0000-0000-0000-000000000000', // placeholder for unauthed
        topic: 'other',
        notes: `Demo request from pricing page. Name: ${demoName}, Phone: ${demoPhone}`,
      }),
    }).catch(() => {});
    setDemoLoading(false);
    setDemoSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#0e0e0f] px-6 py-20">

      {/* Nav */}
      <div className="max-w-5xl mx-auto text-center mb-16">
        <Link href="/" className="text-xl font-sans font-black tracking-[0.3em] text-white mb-8 block">GRID</Link>
        <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-4">
          Simple pricing. No surprises.
        </h1>
        <p className="text-white/40 text-base max-w-xl mx-auto">
          Start free. Upgrade when your agency needs team collaboration, branded proposals, and unlimited briefs.
        </p>
      </div>

      {/* Stats bar */}
      <div className="max-w-3xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-px bg-white/5 rounded-2xl overflow-hidden mb-16 border border-white/5">
        {STATS.map((s) => (
          <div key={s.label} className="bg-[#0e0e0f] px-6 py-5 text-center">
            <div className="text-2xl font-extrabold text-white font-display">{s.value}</div>
            <div className="text-[11px] text-white/30 mt-0.5 tracking-wide">{s.label}</div>
          </div>
        ))}
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
            {plan.highlight && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#c39bff] text-[#0e0e0f] text-[10px] font-bold uppercase tracking-widest">
                Most Popular
              </div>
            )}
            <div className="mb-6">
              <h3 className="text-lg font-bold text-white mb-1">{plan.name}</h3>
              <p className="text-white/30 text-xs mb-4">{plan.description}</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-white">{plan.price}</span>
                {plan.period && <span className="text-white/30 text-sm">{plan.period}</span>}
              </div>
            </div>
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
            <button
              disabled={loadingPlan === plan.name.toLowerCase()}
              onClick={() => {
                analytics.trackEvent('pricing_cta_clicked', { plan: plan.name, price: plan.price });
                const key = plan.name.toLowerCase();
                if (key === 'pro') {
                  startCheckout('pro');
                } else if (key === 'enterprise') {
                  document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' });
                } else {
                  router.push(plan.ctaHref);
                }
              }}
              className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 ${
                plan.highlight
                  ? 'bg-white text-[#0e0e0f] hover:bg-white/90'
                  : 'border border-white/15 text-white/60 hover:text-white hover:border-white/30'
              }`}
            >
              {loadingPlan === plan.name.toLowerCase() ? 'Opening checkout…' : plan.cta}
            </button>
          </div>
        ))}
      </div>

      {error && (
        <div className="max-w-2xl mx-auto mb-8 text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-center">
          {error}
        </div>
      )}

      {/* Testimonials */}
      <div className="max-w-5xl mx-auto mb-20">
        <h2 className="text-lg font-bold text-white text-center mb-10">
          Agencies running on GRID
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="rounded-2xl border border-white/8 bg-white/[0.02] p-6 flex flex-col gap-4">
              <div className="flex gap-0.5">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-[#ffbf00] text-[#ffbf00]" />
                ))}
              </div>
              <p className="text-sm text-white/60 leading-relaxed flex-1">&ldquo;{t.quote}&rdquo;</p>
              <div>
                <p className="text-sm font-semibold text-white">{t.name}</p>
                <p className="text-xs text-white/30">{t.role} · {t.city}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Book a Demo */}
      <div id="demo" className="max-w-2xl mx-auto mb-20">
        <div className="rounded-2xl border border-[#c39bff]/20 bg-[#c39bff]/5 p-8 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#c39bff]/10 blur-[80px] rounded-full pointer-events-none" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#c39bff]/20 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-[#c39bff]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Book a 20-min demo</h2>
                <p className="text-xs text-white/40">We&apos;ll walk through the platform and answer any questions.</p>
              </div>
            </div>

            {demoSubmitted ? (
              <div className="flex items-center gap-3 py-4">
                <MessageSquare className="w-5 h-5 text-[#a1faff]" />
                <p className="text-sm text-white/70">Got it — we&apos;ll WhatsApp you within a few hours to schedule.</p>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Your name"
                  value={demoName}
                  onChange={(e) => setDemoName(e.target.value)}
                  className="input-nocturne text-sm flex-1"
                />
                <input
                  type="tel"
                  placeholder="WhatsApp number"
                  value={demoPhone}
                  onChange={(e) => setDemoPhone(e.target.value)}
                  className="input-nocturne text-sm flex-1"
                />
                <button
                  onClick={submitDemo}
                  disabled={demoLoading || !demoName || !demoPhone}
                  className="px-5 py-2.5 rounded-xl bg-[#c39bff] text-black text-sm font-bold hover:bg-[#b48af0] disabled:opacity-40 transition-colors whitespace-nowrap"
                >
                  {demoLoading ? 'Sending…' : 'Request demo'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FAQ Accordion */}
      <div className="max-w-2xl mx-auto mb-16">
        <h2 className="text-lg font-bold text-white text-center mb-8">Frequently asked questions</h2>
        <div className="space-y-2">
          {FAQS.map((faq) => (
            <FaqItem key={faq.q} q={faq.q} a={faq.a} />
          ))}
        </div>
      </div>

      {/* Footer note */}
      <div className="text-center">
        <p className="text-white/20 text-xs">
          Questions? Email{' '}
          <a href="mailto:raj@thesingularitycovenant.com" className="text-[#c39bff]/50 hover:text-[#c39bff]">
            raj@thesingularitycovenant.com
          </a>
        </p>
      </div>
    </div>
  );
}
