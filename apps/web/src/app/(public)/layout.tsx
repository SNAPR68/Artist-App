'use client';

import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0e0e0f]">
      <Navbar />
      <main className="pt-[66px]">
        {children}
      </main>
      <Footer />
    </div>
  );
}
