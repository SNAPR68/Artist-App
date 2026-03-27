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
    <div className="max-w-2xl mx-auto py-12 px-4">
      <h1 className="text-2xl font-display font-extrabold tracking-tighter text-white mb-2">Agency Onboarding</h1>
      <p className="text-nocturne-text-tertiary mb-8">Set up your agency profile to start managing artist rosters and bookings.</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-nocturne-error/15 border border-red-200 text-nocturne-error px-4 py-3 rounded-lg text-sm">{error}</div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-nocturne-text-secondary mb-1">Agency Name *</label>
            <input
              type="text"
              required
              value={form.agency_name}
              onChange={(e) => setForm({ ...form, agency_name: e.target.value })}
              className="w-full border border-white/10 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Star Entertainment Agency"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-nocturne-text-secondary mb-1">Contact Person *</label>
            <input
              type="text"
              required
              value={form.contact_person}
              onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
              className="w-full border border-white/10 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Rahul Sharma"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-nocturne-text-secondary mb-1">Phone *</label>
            <input
              type="tel"
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full border border-white/10 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="9876543210"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-nocturne-text-secondary mb-1">Email *</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full border border-white/10 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="agent@example.com"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-nocturne-text-secondary mb-1">City *</label>
            <input
              type="text"
              required
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="w-full border border-white/10 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Mumbai"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-nocturne-text-secondary mb-1">Commission %</label>
            <input
              type="number"
              min={0}
              max={50}
              value={form.commission_pct}
              onChange={(e) => setForm({ ...form, commission_pct: Number(e.target.value) })}
              className="w-full border border-white/10 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-nocturne-text-secondary mb-1">Bio</label>
          <textarea
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            rows={3}
            className="w-full border border-white/10 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Tell us about your agency..."
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-nocturne-primary text-white py-3 rounded-lg font-medium hover:bg-nocturne-primary disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Agency Profile'}
        </button>
      </form>
    </div>
  );
}
