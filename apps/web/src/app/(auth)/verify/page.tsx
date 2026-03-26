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
    <div className="glass-card p-8">
      <div>
        <div className="flex justify-end mb-2 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <LanguageSwitcher />
        </div>

        <div className="text-center mb-8 animate-fade-in-up" style={{ animationDelay: '0.28s' }}>
          <h1 className="text-h3 font-display font-bold text-nocturne-text-primary mb-2">
            {isNewUser ? t('auth.selectRole') : t('auth.verifyOtp')}
          </h1>
          <p className="text-sm text-nocturne-text-secondary">
            {isNewUser ? (
              <span className="flex items-center justify-center gap-1.5">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-500/20 text-green-400">✓</span>
                {t('auth.otpVerified') || 'OTP verified'} · +91 {maskedPhone}
              </span>
            ) : (
              <>
                {t('auth.enterOtp')}{' '}
                <span className="font-medium text-nocturne-text-secondary">+91 {maskedPhone}</span>
              </>
            )}
          </p>
        </div>

        {isNewUser && (
          <div className="mb-6 animate-fade-in-up" style={{ animationDelay: '0.36s' }}>
            <p className="text-sm font-medium text-nocturne-text-secondary mb-3">{t('auth.selectRole')}</p>
            <div className="grid grid-cols-2 gap-2">
              {roles.map((role) => (
                <button
                  key={role.value}
                  onClick={() => { setSelectedRole(role.value); setError(''); }}
                  className={`p-3 rounded-xl border-2 text-left transition-all active:scale-[0.98] ${
                    selectedRole === role.value
                      ? 'border-nocturne-border bg-nocturne-primary-light shadow-nocturne-glow-sm'
                      : 'border-nocturne-border hover:border-nocturne-border bg-nocturne-surface'
                  }`}
                >
                  <role.icon size={18} className={selectedRole === role.value ? 'text-nocturne-accent mb-1' : 'text-nocturne-text-secondary mb-1'} />
                  <p className="text-sm font-medium text-nocturne-text-primary">{t(role.labelKey)}</p>
                  <p className="text-[10px] text-nocturne-text-secondary">{t(role.descKey)}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col items-center space-y-4 animate-fade-in-up" style={{ animationDelay: '0.44s' }}>
          {isNewUser ? (
            <>
              {selectedRole && (
                <button
                  onClick={() => handleOTPComplete(lastOtp)}
                  disabled={isLoading}
                  className="w-full py-3 px-6 bg-gradient-nocturne text-white rounded-xl font-medium transition-all active:scale-[0.98] disabled:opacity-50 shadow-nocturne-glow-sm"
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
                    className="text-sm text-nocturne-accent hover:text-nocturne-accent font-medium transition-colors disabled:opacity-50"
                  >
                    {t('auth.resendOtp')}
                  </button>
                ) : (
                  <p className="text-sm text-nocturne-text-secondary">
                    {t('auth.resendIn')} <span className="text-nocturne-text-secondary font-medium">{countdown}s</span>
                  </p>
                )}
              </div>
            </>
          )}

          <button
            onClick={() => router.push('/login')}
            className="text-sm text-nocturne-text-secondary hover:text-nocturne-text-primary transition-colors"
          >
            {t('auth.changePhone')}
          </button>
        </div>
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
