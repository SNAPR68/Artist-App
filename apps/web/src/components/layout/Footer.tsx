'use client';

import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-[#131314] pt-24 pb-12 px-6 border-t border-white/5">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
        {/* Brand */}
        <div className="space-y-6">
          <span className="text-lg font-black text-[#c39bff] uppercase tracking-widest font-display">ArtistBook</span>
          <p className="text-white/50 text-sm leading-relaxed">
            India&apos;s live entertainment booking platform. Find verified artists, book securely, and make every event unforgettable.
          </p>
          <div className="flex gap-4">
            {['public', 'campaign', 'brand_awareness'].map((icon) => (
              <a key={icon} href="#" className="w-10 h-10 rounded-full bg-[#201f21] flex items-center justify-center text-white/50 hover:text-[#c39bff] transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>
              </a>
            ))}
          </div>
        </div>

        {/* Platform */}
        <div>
          <h5 className="font-bold mb-6 tracking-tight text-white font-display">Platform</h5>
          <ul className="space-y-4 text-sm text-white/50">
            <li><Link href="/search" className="hover:text-[#c39bff] transition-colors">How it Works</Link></li>
            <li><Link href="/search" className="hover:text-[#c39bff] transition-colors">AI Discovery</Link></li>
            <li><Link href="/help" className="hover:text-[#c39bff] transition-colors">Escrow Protection</Link></li>
            <li><Link href="/help" className="hover:text-[#c39bff] transition-colors">PDF Generator</Link></li>
          </ul>
        </div>

        {/* Company */}
        <div>
          <h5 className="font-bold mb-6 tracking-tight text-white font-display">Company</h5>
          <ul className="space-y-4 text-sm text-white/50">
            <li><Link href="/help" className="hover:text-[#c39bff] transition-colors">About Us</Link></li>
            <li><Link href="/search" className="hover:text-[#c39bff] transition-colors">Artist Stories</Link></li>
            <li><Link href="/help" className="hover:text-[#c39bff] transition-colors">Press Room</Link></li>
            <li><Link href="/help" className="hover:text-[#c39bff] transition-colors">Contact</Link></li>
          </ul>
        </div>

        {/* Insights */}
        <div>
          <h5 className="font-bold mb-6 tracking-tight text-white font-display">Insights</h5>
          <ul className="space-y-4 text-sm text-white/50">
            <li><Link href="/help" className="hover:text-[#c39bff] transition-colors">Trend Reports</Link></li>
            <li><Link href="/help" className="hover:text-[#c39bff] transition-colors">Booking Analytics</Link></li>
            <li><Link href="/help" className="hover:text-[#c39bff] transition-colors">AI Reliability Hub</Link></li>
            <li><Link href="/help" className="hover:text-[#c39bff] transition-colors">Status</Link></li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center pt-12 border-t border-white/5 gap-6">
        <span className="text-[10px] text-white/30 tracking-widest uppercase font-bold">
          © 2026 ArtistBook. All Rights Reserved.
        </span>
        <div className="flex gap-8 text-[10px] text-white/30 tracking-widest uppercase font-bold">
          <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
          <Link href="/help" className="hover:text-white transition-colors">Cookies</Link>
        </div>
      </div>
    </footer>
  );
}
