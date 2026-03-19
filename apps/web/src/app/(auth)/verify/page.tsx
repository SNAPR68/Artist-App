'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Card, OTPInput } from '@artist-booking/ui';
import { UserRole } from '@artist-booking/shared';
import { useAuthStore } from '@/lib/auth';
import { useI18n } from '@/i18n';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get('phone') ?? '';
  const { verifyOTP, generateOTP, isLoading, user } = useAuthStore();
  const { t } = useI18n();

  const [error, setError] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | undefined>();
  const [countdown, setCountdown] = useState(30);
  const [canResend, setCanResend] = useState(false);

  // Redirect if no phone
  useEffect(() => {
    if (!phone) router.replace('/login');
  }, [phone, router]);

  // Countdown timer for resend
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
    try {
      await verifyOTP(phone, otp, selectedRole);

      // After verifyOTP succeeds, user state is set in the store
      const currentUser = useAuthStore.getState().user;
      if (currentUser?.is_new) {
        switch (currentUser.role) {
          case UserRole.ARTIST:
            router.push('/artist/onboarding');
            break;
          case UserRole.CLIENT:
          case UserRole.EVENT_COMPANY:
            router.push('/client/onboarding');
            break;
          case UserRole.AGENT:
            router.push('/agent/onboarding');
            break;
          default:
            router.push('/');
        }
      } else {
        router.push('/');
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
    { value: UserRole.ARTIST, labelKey: 'role.artist', descKey: 'role.artist.desc' },
    { value: UserRole.CLIENT, labelKey: 'role.client', descKey: 'role.client.desc' },
    { value: UserRole.AGENT, labelKey: 'role.agent', descKey: 'role.agent.desc' },
    { value: UserRole.EVENT_COMPANY, labelKey: 'role.eventCompany', descKey: 'role.eventCompany.desc' },
  ];

  return (
    <main className="min-h-screen flex items-center justify-center bg-neutral-50 p-4">
      <Card variant="elevated" padding="lg" className="w-full max-w-md">
        <div className="flex justify-end mb-2">
          <LanguageSwitcher />
        </div>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">{t('auth.verifyOtp')}</h1>
          <p className="text-neutral-500">
            {t('auth.enterOtp')}{' '}
            <span className="font-medium text-neutral-700">+91 {maskedPhone}</span>
          </p>
        </div>

        {isNewUser && (
          <div className="mb-6">
            <p className="text-sm font-medium text-neutral-700 mb-3">{t('auth.selectRole')}</p>
            <div className="grid grid-cols-2 gap-2">
              {roles.map((role) => (
                <button
                  key={role.value}
                  onClick={() => { setSelectedRole(role.value); setError(''); }}
                  className={`p-3 rounded-lg border-2 text-left transition-colors ${
                    selectedRole === role.value
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <p className="text-sm font-medium text-neutral-900">{t(role.labelKey)}</p>
                  <p className="text-xs text-neutral-500">{t(role.descKey)}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col items-center space-y-4">
          <OTPInput
            onComplete={handleOTPComplete}
            error={error}
            disabled={isLoading}
          />

          <div className="text-center">
            {canResend ? (
              <Button variant="tertiary" size="sm" onClick={handleResend} loading={isLoading}>
                {t('auth.resendOtp')}
              </Button>
            ) : (
              <p className="text-sm text-neutral-400">
                {t('auth.resendIn')} {countdown}s
              </p>
            )}
          </div>

          <Button
            variant="tertiary"
            size="sm"
            onClick={() => router.push('/login')}
          >
            {t('auth.changePhone')}
          </Button>
        </div>
      </Card>
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyContent />
    </Suspense>
  );
}
