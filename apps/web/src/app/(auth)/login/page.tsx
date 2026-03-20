'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Phone } from 'lucide-react';
import { useAuthStore } from '@/lib/auth';
import { useI18n } from '@/i18n';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } },
};

const item = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function LoginPage() {
  const router = useRouter();
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
      router.push(`/verify?phone=${encodeURIComponent(phone)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.otpFailed'));
    }
  };

  return (
    <div className="glass-card p-8">
      <motion.div variants={container} initial="hidden" animate="show">
        <motion.div variants={item} className="flex justify-end mb-2">
          <LanguageSwitcher />
        </motion.div>

        <motion.div variants={item} className="text-center mb-8">
          <h1 className="text-h3 font-heading font-bold text-text-primary mb-2">{t('auth.welcome')}</h1>
          <p className="text-sm text-text-muted">{t('auth.enterPhone')}</p>
        </motion.div>

        <motion.form variants={item} onSubmit={handleSubmit} className="space-y-4">
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
            <motion.p
              className="text-xs text-red-400 px-1"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-gradient-accent hover:bg-gradient-accent-hover disabled:opacity-50 text-white font-semibold rounded-xl transition-all hover-glow hover:scale-[1.01] active:scale-[0.99]"
          >
            {isLoading ? 'Sending...' : t('auth.sendOtp')}
          </button>
        </motion.form>

        <motion.p variants={item} className="text-[10px] text-text-muted text-center mt-6 leading-relaxed">
          {t('auth.termsNotice')}
        </motion.p>
      </motion.div>
    </div>
  );
}
