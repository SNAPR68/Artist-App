'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '../../../lib/auth';

const NAV_ITEMS = [
  { href: '/client', label: 'Dashboard', icon: '🏠' },
  { href: '/search', label: 'Find Artists', icon: '🔍' },
  { href: '/client/shortlists', label: 'Shortlists', icon: '⭐' },
];

export default function ClientDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <Link href="/client" className="text-xl font-bold text-primary-500">
          ArtistBooking
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">{user?.phone}</span>
          <button onClick={() => logout()} className="text-sm text-gray-500 hover:text-gray-700">
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-2 desktop:hidden">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center text-xs ${isActive ? 'text-primary-500' : 'text-gray-500'}`}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
