'use client';

import { useI18n, LOCALE_LABELS, type Locale } from '@/i18n';

const locales: Locale[] = ['en', 'hi'];

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();

  return (
    <div className="flex items-center gap-1 text-sm">
      {locales.map((l, i) => (
        <span key={l} className="flex items-center">
          {i > 0 && <span className="text-gray-300 mx-0.5">|</span>}
          <button
            onClick={() => setLocale(l)}
            className={`px-1 py-0.5 rounded transition-colors ${
              locale === l
                ? 'text-primary-600 font-semibold'
                : 'text-gray-400 hover:text-gray-600'
            }`}
            aria-label={`Switch to ${l === 'en' ? 'English' : 'Hindi'}`}
          >
            {LOCALE_LABELS[l]}
          </button>
        </span>
      ))}
    </div>
  );
}
