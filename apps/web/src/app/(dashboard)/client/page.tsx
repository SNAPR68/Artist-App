'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiClient } from '../../../lib/api-client';

interface ClientProfile {
  id: string;
  company_name?: string;
  city: string;
}

interface Shortlist {
  id: string;
  name: string;
  created_at: string;
}

export default function ClientDashboardPage() {
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [shortlists, setShortlists] = useState<Shortlist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient<ClientProfile>('/v1/clients/profile'),
      apiClient<Shortlist[]>('/v1/shortlists'),
    ]).then(([profileRes, shortlistRes]) => {
      if (profileRes.success) setProfile(profileRes.data);
      if (shortlistRes.success) setShortlists(shortlistRes.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {profile?.company_name ? `Welcome, ${profile.company_name}` : 'Client Dashboard'}
        </h1>
        <p className="text-gray-500">Find and book artists for your events</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Link
          href="/search"
          className="bg-primary-500 text-white rounded-lg p-5 hover:bg-primary-600 transition-colors"
        >
          <span className="block text-lg mb-1">🔍</span>
          <span className="font-medium">Find Artists</span>
          <p className="text-primary-100 text-xs mt-1">Search by genre, city, budget</p>
        </Link>
        <Link
          href="/client/shortlists"
          className="bg-white rounded-lg p-5 border border-gray-200 hover:border-primary-300 transition-colors"
        >
          <span className="block text-lg mb-1">⭐</span>
          <span className="font-medium text-gray-900">My Shortlists</span>
          <p className="text-gray-500 text-xs mt-1">{shortlists.length} shortlist{shortlists.length !== 1 ? 's' : ''}</p>
        </Link>
      </div>

      {/* Recent Shortlists */}
      {shortlists.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Recent Shortlists</h2>
          <div className="space-y-2">
            {shortlists.slice(0, 5).map((sl) => (
              <Link
                key={sl.id}
                href={`/client/shortlists/${sl.id}`}
                className="block bg-white rounded-lg border border-gray-200 p-3 hover:border-primary-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{sl.name}</span>
                  <span className="text-xs text-gray-400">
                    {new Date(sl.created_at).toLocaleDateString('en-IN')}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
