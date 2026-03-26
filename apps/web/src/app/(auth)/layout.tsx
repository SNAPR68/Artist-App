'use client';

import Link from 'next/link';
import { GradientMeshBg } from '@/components/shared/GradientMeshBg';
import { FloatingBlob } from '@/components/shared/FloatingBlob';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-nocturne-base overflow-hidden p-4">
      {/* Animated background */}
      <GradientMeshBg />
      <FloatingBlob color="rgba(59,130,246,0.08)" size={350} top="10%" left="5%" delay={0} />
      <FloatingBlob color="rgba(139,92,246,0.06)" size={300} bottom="10%" right="10%" delay={3} />

      <div className="relative z-10 w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-display font-bold text-gradient-nocturne inline-block">
            ArtistBook
          </Link>
        </div>

        {children}
      </div>
    </div>
  );
}
