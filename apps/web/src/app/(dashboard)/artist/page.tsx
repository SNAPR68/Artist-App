'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiClient } from '../../../lib/api-client';

interface ArtistProfile {
  id: string;
  stage_name: string;
  bio: string;
  profile_completion_pct: number;
  total_bookings: number;
  trust_score: number;
  is_verified: boolean;
}

export default function ArtistHomePage() {
  const [profile, setProfile] = useState<ArtistProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [noProfile, setNoProfile] = useState(false);

  useEffect(() => {
    apiClient<ArtistProfile>('/v1/artists/profile')
      .then((res) => {
        if (res.success) {
          setProfile(res.data);
        } else {
          setNoProfile(true);
        }
      })
      .catch(() => setNoProfile(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (noProfile) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to ArtistBooking!</h1>
        <p className="text-gray-600 mb-6">Complete your artist profile to start receiving bookings.</p>
        <Link
          href="/artist/onboarding"
          className="inline-block bg-primary-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-600 transition-colors"
        >
          Create Your Profile
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{profile!.stage_name}</h1>
          <p className="text-gray-500">Artist Dashboard</p>
        </div>
        {profile!.is_verified && (
          <span className="bg-success/10 text-success text-sm font-medium px-3 py-1 rounded-full">
            Verified
          </span>
        )}
      </div>

      {/* Profile Completion */}
      {profile!.profile_completion_pct < 100 && (
        <div className="bg-secondary-50 border border-secondary-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-secondary-700">Profile Completion</span>
            <span className="text-sm font-bold text-secondary-700">{profile!.profile_completion_pct}%</span>
          </div>
          <div className="w-full bg-secondary-200 rounded-full h-2">
            <div
              className="bg-secondary-500 h-2 rounded-full transition-all"
              style={{ width: `${profile!.profile_completion_pct}%` }}
            />
          </div>
          <Link href="/artist/profile" className="text-sm text-secondary-600 hover:text-secondary-700 mt-2 inline-block">
            Complete your profile &rarr;
          </Link>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-sm text-gray-500">Total Bookings</p>
          <p className="text-2xl font-bold text-gray-900">{profile!.total_bookings ?? 0}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-sm text-gray-500">Trust Score</p>
          <p className="text-2xl font-bold text-gray-900">{profile!.trust_score ?? 0}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Link
          href="/artist/calendar"
          className="bg-white rounded-lg p-4 border border-gray-200 hover:border-primary-300 transition-colors text-center"
        >
          <span className="block text-lg mb-1">📅</span>
          <span className="text-sm font-medium text-gray-700">Manage Calendar</span>
        </Link>
        <Link
          href="/artist/bookings"
          className="bg-white rounded-lg p-4 border border-gray-200 hover:border-primary-300 transition-colors text-center"
        >
          <span className="block text-lg mb-1">📋</span>
          <span className="text-sm font-medium text-gray-700">Bookings</span>
        </Link>
        <Link
          href="/artist/earnings"
          className="bg-white rounded-lg p-4 border border-gray-200 hover:border-primary-300 transition-colors text-center"
        >
          <span className="block text-lg mb-1">💰</span>
          <span className="text-sm font-medium text-gray-700">Earnings</span>
        </Link>
        <Link
          href="/artist/profile"
          className="bg-white rounded-lg p-4 border border-gray-200 hover:border-primary-300 transition-colors text-center"
        >
          <span className="block text-lg mb-1">👤</span>
          <span className="text-sm font-medium text-gray-700">Edit Profile</span>
        </Link>
      </div>
    </div>
  );
}
