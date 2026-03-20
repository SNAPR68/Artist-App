import type { Metadata } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import '@/styles/globals.css';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { ToastProvider } from '@/components/ui/Toast';
import { I18nProvider } from '@/i18n';
import { AuthInitializer } from '@/components/AuthInitializer';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-heading',
  weight: ['500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'Artist Booking Platform',
  description: 'Book live artists for your events — weddings, corporate events, concerts & more.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${plusJakarta.variable}`}>
      <body>
        <ErrorBoundary>
          <I18nProvider>
            <ToastProvider>
              <AuthInitializer />
              {children}
            </ToastProvider>
          </I18nProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
