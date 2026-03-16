import Link from 'next/link';

const CATEGORIES = [
  { name: 'Singers', icon: '🎤', count: '2,500+' },
  { name: 'Bands', icon: '🎸', count: '800+' },
  { name: 'DJs', icon: '🎧', count: '1,200+' },
  { name: 'Comedians', icon: '😂', count: '400+' },
  { name: 'Dancers', icon: '💃', count: '900+' },
  { name: 'Anchors', icon: '🎙️', count: '600+' },
];

const STEPS = [
  { step: '01', title: 'Search & Discover', desc: 'Browse artists by genre, city, budget, and availability. Compare profiles side by side.' },
  { step: '02', title: 'Send Inquiry', desc: 'Share your event details. Get a quote within hours, not days.' },
  { step: '03', title: 'Book & Pay Securely', desc: 'Confirm with escrow-protected payments. Your money is safe until the event.' },
];

const STATS = [
  { value: '5,000+', label: 'Verified Artists' },
  { value: '<24hrs', label: 'Average Booking Time' },
  { value: '₹0', label: 'Platform Fee for Artists' },
  { value: '100%', label: 'Secure Payments' },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-neutral-100 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-primary-500">
            ArtistBook
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link href="/search" className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors">
              Find Artists
            </Link>
            <Link href="/artist/onboarding" className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors">
              List as Artist
            </Link>
            <Link href="/login" className="text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 px-5 py-2.5 rounded-lg transition-colors">
              Get Started
            </Link>
          </div>
          <Link href="/login" className="md:hidden text-sm font-medium text-primary-500">
            Login
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block bg-secondary-50 text-secondary-600 text-xs font-semibold px-3 py-1 rounded-full mb-6">
            India&apos;s #1 Artist Booking Platform
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-neutral-900 leading-tight mb-6">
            Book the perfect artist
            <br />
            <span className="text-primary-500">for your event</span>
          </h1>
          <p className="text-lg text-neutral-500 max-w-2xl mx-auto mb-10">
            Weddings, corporate events, house parties, concerts — find and book verified artists
            in under 24 hours. Secure payments, transparent pricing, zero hassle.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/search"
              className="inline-flex items-center justify-center px-8 py-4 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-xl transition-colors text-base"
            >
              Find Artists
              <svg className="ml-2 w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </Link>
            <Link
              href="/artist/onboarding"
              className="inline-flex items-center justify-center px-8 py-4 bg-white border-2 border-neutral-200 hover:border-primary-300 text-neutral-700 font-semibold rounded-xl transition-colors text-base"
            >
              Join as Artist
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-primary-500 py-8">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-white">{stat.value}</div>
              <div className="text-sm text-primary-100 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-neutral-900 text-center mb-3">
            Browse by Category
          </h2>
          <p className="text-neutral-500 text-center mb-12">
            Find the right entertainment for any occasion
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.name}
                href={`/search?genre=${cat.name.toLowerCase()}`}
                className="group flex flex-col items-center p-6 bg-neutral-50 hover:bg-primary-50 rounded-2xl transition-colors"
              >
                <span className="text-4xl mb-3">{cat.icon}</span>
                <span className="font-semibold text-neutral-900 group-hover:text-primary-600 text-sm">
                  {cat.name}
                </span>
                <span className="text-xs text-neutral-400 mt-1">{cat.count}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6 bg-neutral-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-neutral-900 text-center mb-3">
            How It Works
          </h2>
          <p className="text-neutral-500 text-center mb-16">
            Book an artist in 3 simple steps
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((s) => (
              <div key={s.step} className="relative">
                <div className="text-6xl font-black text-primary-100 mb-4">{s.step}</div>
                <h3 className="text-xl font-bold text-neutral-900 mb-2">{s.title}</h3>
                <p className="text-neutral-500 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Artists CTA */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto bg-gradient-to-br from-primary-500 to-primary-700 rounded-3xl p-10 md:p-16 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Are you an artist?
          </h2>
          <p className="text-primary-100 text-lg max-w-xl mx-auto mb-8">
            Join thousands of artists getting discovered and booked. No listing fees,
            instant payments, and a dedicated profile to showcase your talent.
          </p>
          <Link
            href="/artist/onboarding"
            className="inline-flex items-center px-8 py-4 bg-white hover:bg-neutral-50 text-primary-600 font-bold rounded-xl transition-colors text-base"
          >
            Create Your Profile
            <svg className="ml-2 w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Trust Signals */}
      <section className="py-16 px-6 border-t border-neutral-100">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="font-bold text-neutral-900 mb-1">Escrow Protection</h3>
              <p className="text-sm text-neutral-500">Your payment is held securely until the event is completed</p>
            </div>
            <div>
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <h3 className="font-bold text-neutral-900 mb-1">Verified Artists</h3>
              <p className="text-sm text-neutral-500">Every artist is ID-verified with ratings and reviews</p>
            </div>
            <div>
              <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-bold text-neutral-900 mb-1">Book in 24 Hours</h3>
              <p className="text-sm text-neutral-500">No more weeks of back-and-forth. Get confirmed fast.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-neutral-900 text-neutral-400 py-12 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-4 gap-8">
          <div>
            <div className="text-xl font-bold text-white mb-4">ArtistBook</div>
            <p className="text-sm">India&apos;s live entertainment marketplace. Book artists for weddings, corporate events, and more.</p>
          </div>
          <div>
            <div className="font-semibold text-white text-sm mb-3">For Clients</div>
            <div className="space-y-2 text-sm">
              <div><Link href="/search" className="hover:text-white transition-colors">Find Artists</Link></div>
              <div><Link href="/search?event_type=wedding" className="hover:text-white transition-colors">Wedding Artists</Link></div>
              <div><Link href="/search?event_type=corporate" className="hover:text-white transition-colors">Corporate Events</Link></div>
            </div>
          </div>
          <div>
            <div className="font-semibold text-white text-sm mb-3">For Artists</div>
            <div className="space-y-2 text-sm">
              <div><Link href="/artist/onboarding" className="hover:text-white transition-colors">Join as Artist</Link></div>
              <div><Link href="/login" className="hover:text-white transition-colors">Artist Login</Link></div>
            </div>
          </div>
          <div>
            <div className="font-semibold text-white text-sm mb-3">Company</div>
            <div className="space-y-2 text-sm">
              <div><Link href="/help" className="hover:text-white transition-colors">Help & FAQ</Link></div>
              <div><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></div>
              <div><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></div>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-10 pt-6 border-t border-neutral-800 text-sm text-center">
          &copy; {new Date().getFullYear()} ArtistBook. All rights reserved.
        </div>
      </footer>
    </main>
  );
}
