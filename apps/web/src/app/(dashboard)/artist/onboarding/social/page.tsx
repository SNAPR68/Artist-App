'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../../../../lib/api-client';

interface ProfileData {
  username: string;
  display_name: string;
  follower_count: number;
  suggested_genres: string[];
  suggested_bio: string;
  top_content: Array<{ title: string; views: number }>;
  _stub_notice: string;
}

interface AnalysisResult {
  id: string;
  platform: string;
  profile_url: string;
  profile_data: ProfileData;
  status: string;
}

export default function SocialAnalyzerPage() {
  const router = useRouter();
  const [profileUrl, setProfileUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const detectPlatform = (url: string): string | null => {
    if (url.includes('instagram.com')) return 'instagram';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    return null;
  };

  const handleAnalyze = async () => {
    setError('');
    const platform = detectPlatform(profileUrl);

    if (!platform) {
      setError('Please enter an Instagram or YouTube URL. Other platforms are not yet supported.');
      return;
    }

    setIsAnalyzing(true);
    try {
      const res = await apiClient<AnalysisResult>('/v1/social-analyzer/analyze', {
        method: 'POST',
        body: JSON.stringify({ platform, profile_url: profileUrl }),
      });

      if (!res.success) {
        setError(res.errors[0]?.message ?? 'Analysis failed. Please try again.');
        return;
      }

      // Parse profile_data if it comes as a string
      const data = res.data;
      if (typeof data.profile_data === 'string') {
        data.profile_data = JSON.parse(data.profile_data);
      }

      setResult(data);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUseData = () => {
    if (!result) return;
    localStorage.setItem('social_prefill', JSON.stringify(result.profile_data));
    router.push('/artist/onboarding');
  };

  const profileData = result?.profile_data;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Social Media Profile Analyzer</h1>
      <p className="text-sm text-gray-500 mb-6">
        Import your profile data from Instagram or YouTube to pre-fill your artist onboarding.
      </p>

      {/* Input Section */}
      {!result && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Social Media Profile URL
            </label>
            <input
              type="url"
              value={profileUrl}
              onChange={(e) => setProfileUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="https://instagram.com/yourprofile or https://youtube.com/@yourchannel"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !profileUrl.trim()}
            className="w-full px-6 py-2.5 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isAnalyzing ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Analyzing...
              </>
            ) : (
              'Analyze Profile'
            )}
          </button>

          <div className="text-center">
            <button
              onClick={() => router.push('/artist/onboarding')}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Skip — go to onboarding directly
            </button>
          </div>
        </div>
      )}

      {/* Results Section */}
      {result && profileData && (
        <div className="space-y-6">
          {/* Stub Notice */}
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm">
            This is a preview. Full social media analysis coming soon.
          </div>

          {/* Profile Summary */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{profileData.display_name}</h2>
                <p className="text-sm text-gray-500">@{profileData.username}</p>
              </div>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 capitalize">
                {result.platform}
              </span>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-1">Followers</p>
              <p className="text-xl font-bold text-gray-900">
                {profileData.follower_count.toLocaleString('en-IN')}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-2">Suggested Genres</p>
              <div className="flex flex-wrap gap-2">
                {profileData.suggested_genres.map((genre) => (
                  <span
                    key={genre}
                    className="px-3 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-700 border border-primary-200"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-1">Suggested Bio</p>
              <p className="text-sm text-gray-700">{profileData.suggested_bio}</p>
            </div>

            {profileData.top_content && profileData.top_content.length > 0 && (
              <div>
                <p className="text-sm text-gray-500 mb-2">Top Content</p>
                <ul className="space-y-1">
                  {profileData.top_content.map((item, i) => (
                    <li key={i} className="flex justify-between text-sm">
                      <span className="text-gray-700 truncate mr-4">{item.title}</span>
                      <span className="text-gray-500 whitespace-nowrap">
                        {item.views.toLocaleString('en-IN')} views
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleUseData}
              className="flex-1 px-6 py-2.5 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600"
            >
              Use This Data
            </button>
            <button
              onClick={() => router.push('/artist/onboarding')}
              className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Skip
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
