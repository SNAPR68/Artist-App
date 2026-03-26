import type { Metadata } from 'next';
import { Inter, Plus_Jakarta_Sans, Manrope } from 'next/font/google';
import '@/styles/globals.css';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { ToastProvider } from '@/components/ui/Toast';
import { I18nProvider } from '@/i18n';
import { AuthInitializer } from '@/components/AuthInitializer';
import { SessionExpiredModal } from '@/components/SessionExpiredModal';
import { VoiceAssistant } from '@/components/voice/VoiceAssistant';
import { AnalyticsProvider } from '@/components/AnalyticsProvider';
import { PushNotificationPrompt } from '@/components/PushNotificationPrompt';
import { CookieConsent } from '@/components/CookieConsent';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-inter',
  display: 'swap',
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-manrope',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Artist Booking Platform',
  description: 'Book live artists for your events — weddings, corporate events, concerts & more.',
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/icon-192x192.png',
    apple: '/icons/icon-192x192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Artist Booking',
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${plusJakarta.variable} ${manrope.variable} theme-nocturne`}>
      {/* Inline auth loading skeleton — prevents white flash while JS boots.
          The AuthInitializer component removes this class once auth state resolves. */}
      <head>
        <style dangerouslySetInnerHTML={{ __html: `
          .auth-loading body::before {
            content: '';
            position: fixed;
            inset: 0;
            z-index: 9999;
            background: #0E0E0F;
            transition: opacity 0.3s ease;
          }
          .auth-loading body::after {
            content: '';
            position: fixed;
            top: 50%;
            left: 50%;
            z-index: 10000;
            width: 2rem;
            height: 2rem;
            margin: -1rem 0 0 -1rem;
            border: 2px solid #242428;
            border-top-color: #8A2BE2;
            border-radius: 50%;
            animation: auth-spin 0.6s linear infinite;
          }
          @keyframes auth-spin {
            to { transform: rotate(360deg); }
          }
          .auth-ready body::before,
          .auth-ready body::after {
            opacity: 0;
            pointer-events: none;
          }
        `}} />
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            try {
              var t = localStorage.getItem('access_token');
              if (t) document.documentElement.classList.add('auth-loading');
            } catch(e) {}
          })();
        `}} />
      </head>
      <body>
        <ErrorBoundary>
          <I18nProvider>
            <ToastProvider>
              <AnalyticsProvider />
              <AuthInitializer />
              <SessionExpiredModal />
              {children}
              <VoiceAssistant />
              <PushNotificationPrompt />
              <CookieConsent />
            </ToastProvider>
          </I18nProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
