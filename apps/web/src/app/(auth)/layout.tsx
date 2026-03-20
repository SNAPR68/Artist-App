'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { GradientMeshBg } from '@/components/shared/GradientMeshBg';
import { FloatingBlob } from '@/components/shared/FloatingBlob';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-surface-bg overflow-hidden p-4">
      {/* Animated background */}
      <GradientMeshBg />
      <FloatingBlob color="rgba(59,130,246,0.08)" size={350} top="10%" left="5%" delay={0} />
      <FloatingBlob color="rgba(139,92,246,0.06)" size={300} bottom="10%" right="10%" delay={3} />

      <motion.div
        className="relative z-10 w-full max-w-md"
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.25, 0.4, 0.25, 1] }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-heading font-bold text-gradient inline-block">
            ArtistBook
          </Link>
        </div>

        {children}
      </motion.div>
    </div>
  );
}
