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
    <div className="bg-[#0e0e0f] min-h-screen relative overflow-hidden">
      {/* Ambient Stage Lighting */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-20 w-96 h-96 bg-[#c39bff]/10 blur-[120px] rounded-full" />
        <div className="absolute top-1/3 right-0 w-80 h-80 bg-[#a1faff]/5 blur-[100px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">

          {/* LEFT: 5 cols - Brand & Features */}
          <div className="lg:col-span-5 space-y-8">
            <span className="inline-block px-4 py-1.5 rounded-full border border-[#c39bff]/20 bg-[#c39bff]/5 text-[#c39bff] text-[10px] font-bold tracking-[0.2em] uppercase">
              Optional Setup
            </span>

            <h1 className="text-4xl lg:text-5xl font-display font-extrabold tracking-tighter leading-tight text-white">
              Connect your <span className="text-transparent bg-gradient-to-r from-[#c39bff] to-[#a1faff] bg-clip-text italic">socials</span>
            </h1>

            <p className="text-white/60 text-lg leading-relaxed max-w-md">
              Let us analyze your social media profiles to pre-fill your artist profile with your existing audience, genres, and bio.
            </p>

            {/* Feature Bullets */}
            <div className="space-y-4">
              {[
                { icon: '📊', text: 'Auto-detect genres from your content' },
                { icon: '👥', text: 'Import follower count and reach' },
                { icon: '⚡', text: 'Pre-fill bio and performance history' },
              ].map((feature) => (
                <div key={feature.text} className="flex items-start gap-3">
                  <span className="text-xl flex-shrink-0">{feature.icon}</span>
                  <p className="text-white/80 text-sm">{feature.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: 7 cols - Glass Form Card */}
          <div className="lg:col-span-7">
            <div className="glass-card rounded-3xl p-8 lg:p-10 border border-white/5 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-[#c39bff]/10 blur-3xl rounded-full pointer-events-none" />

              <div className="relative z-10 space-y-6">
                {/* Input Section */}
                {!result && (
                  <div className="space-y-5">
                    <h2 className="text-2xl font-display font-extrabold tracking-tighter text-white">
                      Analyze Your Profile
                    </h2>

                    <div>
                      <label className="block text-sm font-medium text-white/60 mb-2">
                        Social Media Profile URL
                      </label>
                      <input
                        type="url"
                        value={profileUrl}
                        onChange={(e) => setProfileUrl(e.target.value)}
                        className="input-nocturne"
                        placeholder="https://instagram.com/yourprofile or https://youtube.com/@yourchannel"
                      />
                    </div>

                    {error && (
                      <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">
                        {error}
                      </div>
                    )}

                    <button
                      onClick={handleAnalyze}
                      disabled={isAnalyzing || !profileUrl.trim()}
                      className="w-full py-3 bg-gradient-to-r from-[#c39bff] to-[#8A2BE2] text-white font-bold text-sm rounded-xl shadow-[0_0_20px_rgba(195,155,255,0.2)] hover:shadow-[0_0_30px_rgba(195,155,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed transition-all uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                      {isAnalyzing ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        'Analyze Profile'
                      )}
                    </button>

                    <div className="text-center">
                      <button
                        onClick={() => router.push('/artist/onboarding')}
                        className="text-sm text-white/60 hover:text-white transition-colors"
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
                    <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 px-4 py-3 rounded-xl text-sm">
                      This is a preview. Full social media analysis coming soon.
                    </div>

                    {/* Profile Summary */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-bold text-white">{profileData.display_name}</h3>
                          <p className="text-sm text-white/50">@{profileData.username}</p>
                        </div>
                        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-[#c39bff]/20 text-[#c39bff] uppercase tracking-widest">
                          {result.platform}
                        </span>
                      </div>

                      <div className="border-t border-white/10 pt-4">
                        <p className="text-xs text-white/40 uppercase tracking-widest font-bold mb-1">Followers</p>
                        <p className="text-2xl font-display font-extrabold text-white">
                          {profileData.follower_count.toLocaleString('en-IN')}
                        </p>
                      </div>

                      {profileData.suggested_genres && profileData.suggested_genres.length > 0 && (
                        <div className="border-t border-white/10 pt-4">
                          <p className="text-xs text-white/40 uppercase tracking-widest font-bold mb-2">Suggested Genres</p>
                          <div className="flex flex-wrap gap-2">
                            {profileData.suggested_genres.map((genre) => (
                              <span
                                key={genre}
                                className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#c39bff]/20 text-[#c39bff] uppercase tracking-widest"
                              >
                                {genre}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {profileData.suggested_bio && (
                        <div className="border-t border-white/10 pt-4">
                          <p className="text-xs text-white/40 uppercase tracking-widest font-bold mb-2">Suggested Bio</p>
                          <p className="text-sm text-white/80">{profileData.suggested_bio}</p>
                        </div>
                      )}

                      {profileData.top_content && profileData.top_content.length > 0 && (
                        <div className="border-t border-white/10 pt-4">
                          <p className="text-xs text-white/40 uppercase tracking-widest font-bold mb-2">Top Content</p>
                          <ul className="space-y-2">
                            {profileData.top_content.map((item, i) => (
                              <li key={i} className="flex justify-between text-sm">
                                <span className="text-white/80 truncate mr-4">{item.title}</span>
                                <span className="text-white/40 whitespace-nowrap">
                                  {item.views.toLocaleString('en-IN')} views
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={handleUseData}
                        className="flex-1 py-3 bg-gradient-to-r from-[#c39bff] to-[#8A2BE2] text-white font-bold text-sm rounded-xl shadow-[0_0_20px_rgba(195,155,255,0.2)] hover:shadow-[0_0_30px_rgba(195,155,255,0.4)] transition-all uppercase tracking-widest"
                      >
                        Use This Data
                      </button>
                      <button
                        onClick={() => router.push('/artist/onboarding')}
                        className="py-3 text-white/60 font-bold text-sm border border-white/10 rounded-xl hover:border-white/20 hover:bg-white/5 transition-all uppercase tracking-widest"
                      >
                        Skip
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
