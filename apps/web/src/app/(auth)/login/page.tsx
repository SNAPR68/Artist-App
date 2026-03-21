'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Phone } from 'lucide-react';
import { useAuthStore } from '@/lib/auth';
import { useI18n } from '@/i18n';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '';
  const { generateOTP, isLoading } = useAuthStore();
  const { t } = useI18n();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!/^[6-9]\d{9}$/.test(phone)) {
      setError(t('auth.invalidPhone'));
      return;
    }

    try {
      await generateOTP(phone);
      const verifyUrl = `/verify?phone=${encodeURIComponent(phone)}${redirectTo ? `&redirect=${encodeURIComponent(redirectTo)}` : ''}`;
      router.push(verifyUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.otpFailed'));
    }
  };

  return (
    <div className="glass-card p-8">
      <div>
        <div className="flex justify-end mb-2 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <LanguageSwitcher />
        </div>

        <div className="text-center mb-8 animate-fade-in-up" style={{ animationDelay: '0.28s' }}>
          <h1 className="text-h3 font-heading font-bold text-text-primary mb-2">{t('auth.welcome')}</h1>
          <p className="text-sm text-text-muted">{t('auth.enterPhone')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in-up" style={{ animationDelay: '0.36s' }}>
          <div className="flex items-center gap-2">
            <div className="flex items-center h-12 px-3 rounded-xl bg-glass-light border border-glass-border text-text-muted text-sm">
              +91
            </div>
            <div className="flex-1 relative">
              <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="tel"
                placeholder={t('auth.phonePlaceholder')}
                value={phone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setPhone(val);
                  setError('');
                }}
                autoFocus
                inputMode="numeric"
                autoComplete="tel"
                className="w-full pl-10 pr-4 py-3 bg-glass-light border border-glass-border rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/20 transition-all"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400 px-1 animate-fade-in-up">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-gradient-accent hover:bg-gradient-accent-hover disabled:opacity-50 text-white font-semibold rounded-xl transition-all hover-glow hover:scale-[1.01] active:scale-[0.99]"
          >
            {isLoading ? 'Sending...' : t('auth.sendOtp')}
          </button>
        </form>

        <p className="text-[10px] text-text-muted text-center mt-6 leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.44s' }}>
          {t('auth.termsNotice')}
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
