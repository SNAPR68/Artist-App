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
    <div className="space-y-8">
      {/* Language Switcher */}
      <div className="flex justify-end mb-2 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
        <LanguageSwitcher />
      </div>

      {/* Header */}
      <div className="text-center space-y-2 animate-fade-in-up" style={{ animationDelay: '0.28s' }}>
        <div className="inline-block px-4 py-1 rounded-full border border-[#c39bff]/20 bg-[#c39bff]/5 text-[#c39bff] text-[10px] font-bold tracking-[0.2em] uppercase mb-4">
          Step 01 / 02
        </div>
        <h2 className="text-2xl lg:text-3xl font-display font-extrabold tracking-tighter text-white">
          {t('auth.welcome')}
        </h2>
        <p className="text-sm text-white/60">{t('auth.enterPhone')}</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5 animate-fade-in-up" style={{ animationDelay: '0.36s' }}>
        {/* Phone Input with +91 Code */}
        <div className="flex items-center gap-3">
          <div className="flex items-center h-12 px-4 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm font-medium">
            +91
          </div>
          <div className="flex-1 relative">
            <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
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
              className="input-nocturne pl-10"
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <p className="text-xs text-red-400 px-1 animate-fade-in-up">
            {error}
          </p>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 bg-gradient-to-r from-[#c39bff] to-[#8A2BE2] text-white font-bold text-sm rounded-xl shadow-[0_0_20px_rgba(195,155,255,0.2)] hover:shadow-[0_0_30px_rgba(195,155,255,0.4)] disabled:opacity-50 transition-all uppercase tracking-widest"
        >
          {isLoading ? 'Sending...' : t('auth.sendOtp')}
        </button>
      </form>

      {/* Terms Notice */}
      <p className="text-[10px] text-white/40 text-center leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.44s' }}>
        {t('auth.termsNotice')}
      </p>
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
