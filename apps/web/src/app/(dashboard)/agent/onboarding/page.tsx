'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../../../lib/api-client';

export default function AgentOnboarding() {
  const router = useRouter();
  const [form, setForm] = useState({
    agency_name: '',
    contact_person: '',
    phone: '',
    email: '',
    city: '',
    commission_pct: 10,
    bio: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await apiClient('/v1/agents/profile', {
      method: 'POST',
      body: JSON.stringify(form),
    });

    if (res.success) {
      router.push('/agent');
    } else {
      setError(res.errors?.[0]?.message ?? 'Failed to create profile');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Ambient glows */}
      <div className="fixed top-0 right-0 w-96 h-96 bg-[#c39bff]/5 blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="fixed bottom-0 left-0 w-96 h-96 bg-[#a1faff]/5 blur-[120px] rounded-full pointer-events-none -z-10" />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 max-w-7xl mx-auto py-12 px-4">
        {/* Left Column: Messaging (5 cols) */}
        <div className="md:col-span-5 flex flex-col justify-center">
          <div className="glass-card rounded-2xl p-10 border border-white/10 space-y-6">
            <div>
              <span className="text-[#a1faff] font-bold text-xs tracking-widest uppercase block mb-3">Become an ArtistBook Agent</span>
              <h1 className="text-4xl font-display font-extrabold tracking-tighter text-white mb-4">Grow Your Agency</h1>
              <p className="text-white/60 text-sm leading-relaxed mb-6">Manage your artist roster, track bookings, and earn competitive commissions on every successful event.</p>
            </div>

            <div className="space-y-4 pt-6 border-t border-white/10">
              <h3 className="text-sm font-bold text-[#c39bff] uppercase tracking-widest">Key Benefits</h3>
              <ul className="space-y-3 text-sm text-white/70">
                <li className="flex gap-3">
                  <span className="text-[#c39bff] font-bold flex-shrink-0">•</span>
                  <span>Access to premium artist listings and opportunities</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#c39bff] font-bold flex-shrink-0">•</span>
                  <span>Real-time booking notifications and pipeline management</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#c39bff] font-bold flex-shrink-0">•</span>
                  <span>Automated commission tracking and payouts</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#c39bff] font-bold flex-shrink-0">•</span>
                  <span>Dedicated support from the ArtistBook team</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Right Column: Form (7 cols) */}
        <div className="md:col-span-7">
          <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-10 border border-white/10 space-y-6">
            {error && (
              <div className="bg-[#ff6b9d]/10 border border-[#ff6b9d]/30 text-[#ff6b9d] px-4 py-3 rounded-lg text-sm font-medium">{error}</div>
            )}

            <h2 className="text-lg font-bold text-white">Setup Your Agency Profile</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-[#a1faff] block mb-2">Agency Name *</label>
                <input
                  type="text"
                  required
                  value={form.agency_name}
                  onChange={(e) => setForm({ ...form, agency_name: e.target.value })}
                  className="w-full border border-white/10 rounded-xl px-4 py-3 bg-white/5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#c39bff]/50 transition-all"
                  placeholder="Star Entertainment Agency"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-[#a1faff] block mb-2">Contact Person *</label>
                <input
                  type="text"
                  required
                  value={form.contact_person}
                  onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                  className="w-full border border-white/10 rounded-xl px-4 py-3 bg-white/5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#c39bff]/50 transition-all"
                  placeholder="Rahul Sharma"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-[#a1faff] block mb-2">Phone *</label>
                <input
                  type="tel"
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full border border-white/10 rounded-xl px-4 py-3 bg-white/5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#c39bff]/50 transition-all"
                  placeholder="9876543210"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-[#a1faff] block mb-2">Email *</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full border border-white/10 rounded-xl px-4 py-3 bg-white/5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#c39bff]/50 transition-all"
                  placeholder="agent@example.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-[#a1faff] block mb-2">City *</label>
                <input
                  type="text"
                  required
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="w-full border border-white/10 rounded-xl px-4 py-3 bg-white/5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#c39bff]/50 transition-all"
                  placeholder="Mumbai"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-[#a1faff] block mb-2">Commission %</label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={form.commission_pct}
                  onChange={(e) => setForm({ ...form, commission_pct: Number(e.target.value) })}
                  className="w-full border border-white/10 rounded-xl px-4 py-3 bg-white/5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#c39bff]/50 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-[#a1faff] block mb-2">Bio</label>
              <textarea
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                rows={3}
                className="w-full border border-white/10 rounded-xl px-4 py-3 bg-white/5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#c39bff]/50 transition-all resize-none"
                placeholder="Tell us about your agency..."
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#c39bff] to-[#8A2BE2] text-white py-4 rounded-xl font-bold text-sm hover:shadow-[0_0_30px_rgba(195,155,255,0.3)] disabled:opacity-50 transition-all"
            >
              {loading ? 'Creating...' : 'Create Agency Profile'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
