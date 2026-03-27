'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { OTPInput } from '@artist-booking/ui';
import { UserRole } from '@artist-booking/shared';
import { useAuthStore } from '@/lib/auth';
import { useI18n } from '@/i18n';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Mic2, Users, Briefcase, Building2 } from 'lucide-react';

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get('phone') ?? '';
  const redirectTo = searchParams.get('redirect') || '';
  const { verifyOTP, generateOTP, isLoading } = useAuthStore();
  const { t } = useI18n();

  const [error, setError] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | undefined>();
  const [countdown, setCountdown] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [lastOtp, setLastOtp] = useState('');

  useEffect(() => {
    if (!phone) router.replace('/login');
  }, [phone, router]);

  useEffect(() => {
    if (countdown <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleOTPComplete = async (otp: string) => {
    setError('');
    setLastOtp(otp);
    try {
      await verifyOTP(phone, otp, selectedRole);

      const currentUser = useAuthStore.getState().user;
      if (currentUser?.is_new) {
        // New users always go to onboarding regardless of redirect param
        switch (currentUser.role) {
          case UserRole.ARTIST: router.push('/artist/onboarding'); break;
          case UserRole.EVENT_COMPANY: router.push('/event-company/onboarding'); break;
          case UserRole.CLIENT: router.push('/client/onboarding'); break;
          case UserRole.AGENT: router.push('/agent/onboarding'); break;
          default: router.push('/');
        }
      } else if (redirectTo) {
        // Returning user with a redirect param — go back to where they were
        router.push(redirectTo);
      } else {
        // Returning user — go to role dashboard
        switch (currentUser?.role) {
          case UserRole.ARTIST: router.push('/artist'); break;
          case UserRole.EVENT_COMPANY: router.push('/event-company'); break;
          case UserRole.CLIENT: router.push('/client'); break;
          case UserRole.AGENT: router.push('/agent'); break;
          case UserRole.ADMIN: router.push('/admin'); break;
          default: router.push('/');
        }
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('Role is required')) {
        setIsNewUser(true);
        setError(t('auth.selectRolePrompt'));
      } else {
        setError(err instanceof Error ? err.message : t('auth.verifyFailed'));
      }
    }
  };

  const handleResend = async () => {
    try {
      await generateOTP(phone);
      setCountdown(30);
      setCanResend(false);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.otpFailed'));
    }
  };

  const maskedPhone = phone ? `${phone.slice(0, 3)}****${phone.slice(7)}` : '';

  const roles = [
    { value: UserRole.ARTIST, labelKey: 'role.artist', descKey: 'role.artist.desc', icon: Mic2 },
    { value: UserRole.CLIENT, labelKey: 'role.client', descKey: 'role.client.desc', icon: Users },
    { value: UserRole.AGENT, labelKey: 'role.agent', descKey: 'role.agent.desc', icon: Briefcase },
    { value: UserRole.EVENT_COMPANY, labelKey: 'role.eventCompany', descKey: 'role.eventCompany.desc', icon: Building2 },
  ];

  return (
    <div className="space-y-8">
      {/* Language Switcher */}
      <div className="flex justify-end mb-2 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
        <LanguageSwitcher />
      </div>

      {/* Header */}
      <div className="text-center space-y-2 animate-fade-in-up" style={{ animationDelay: '0.28s' }}>
        <div className="inline-block px-4 py-1 rounded-full border border-[#c39bff]/20 bg-[#c39bff]/5 text-[#c39bff] text-[10px] font-bold tracking-[0.2em] uppercase mb-4">
          Step 02 / 02
        </div>
        <h2 className="text-2xl lg:text-3xl font-display font-extrabold tracking-tighter text-white">
          {isNewUser ? t('auth.selectRole') : t('auth.verifyOtp')}
        </h2>
        <p className="text-sm text-white/60">
          {isNewUser ? (
            <span className="flex items-center justify-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-500/20 text-green-400">✓</span>
              {t('auth.otpVerified') || 'OTP verified'} · +91 {maskedPhone}
            </span>
          ) : (
            <>
              {t('auth.enterOtp')}{' '}
              <span className="font-medium text-white/80">+91 {maskedPhone}</span>
            </>
          )}
        </p>
      </div>

      {/* Role Selection (New Users Only) */}
      {isNewUser && (
        <div className="space-y-4 animate-fade-in-up" style={{ animationDelay: '0.36s' }}>
          <p className="text-sm font-medium text-white/60">{t('auth.selectRole')}</p>
          <div className="grid grid-cols-2 gap-3">
            {roles.map((role) => (
              <button
                key={role.value}
                onClick={() => { setSelectedRole(role.value); setError(''); }}
                className={`p-4 rounded-xl border-2 text-left transition-all active:scale-[0.98] ${
                  selectedRole === role.value
                    ? 'border-[#c39bff] bg-[#c39bff]/10 shadow-[0_0_20px_rgba(195,155,255,0.2)]'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
              >
                <role.icon size={18} className={selectedRole === role.value ? 'text-[#c39bff] mb-2' : 'text-white/40 mb-2'} />
                <p className="text-sm font-semibold text-white">{t(role.labelKey)}</p>
                <p className="text-[10px] text-white/50 mt-1">{t(role.descKey)}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* OTP or Continue Section */}
      <div className="flex flex-col items-center space-y-4 animate-fade-in-up" style={{ animationDelay: '0.44s' }}>
        {isNewUser ? (
          <>
            {selectedRole && (
              <button
                onClick={() => handleOTPComplete(lastOtp)}
                disabled={isLoading}
                className="w-full py-3 bg-gradient-to-r from-[#c39bff] to-[#8A2BE2] text-white font-bold text-sm rounded-xl shadow-[0_0_20px_rgba(195,155,255,0.2)] hover:shadow-[0_0_30px_rgba(195,155,255,0.4)] disabled:opacity-50 transition-all uppercase tracking-widest"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t('auth.creatingAccount') || 'Creating account...'}
                  </span>
                ) : (
                  t('auth.createAccount') || 'Create Account'
                )}
              </button>
            )}
            {error && (
              <p className="text-sm text-red-400 text-center">{error}</p>
            )}
          </>
        ) : (
          <>
            <OTPInput
              onComplete={handleOTPComplete}
              error={error}
              disabled={isLoading}
            />

            <div className="text-center">
              {canResend ? (
                <button
                  onClick={handleResend}
                  disabled={isLoading}
                  className="text-sm text-[#a1faff] hover:text-[#c39bff] font-medium transition-colors disabled:opacity-50"
                >
                  {t('auth.resendOtp')}
                </button>
              ) : (
                <p className="text-sm text-white/60">
                  {t('auth.resendIn')} <span className="text-white/80 font-medium">{countdown}s</span>
                </p>
              )}
            </div>
          </>
        )}

        <button
          onClick={() => router.push('/login')}
          className="text-sm text-white/60 hover:text-white transition-colors"
        >
          {t('auth.changePhone')}
        </button>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyContent />
    </Suspense>
  );
}
