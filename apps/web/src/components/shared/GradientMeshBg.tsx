'use client';

interface GradientMeshBgProps {
  className?: string;
}

export function GradientMeshBg({ className = '' }: GradientMeshBgProps) {
  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      {/* Base dark */}
      <div className="absolute inset-0 bg-surface-bg" />

      {/* Animated gradient orbs */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full opacity-20 animate-float-slow"
        style={{
          background: 'radial-gradient(circle, rgba(59,130,246,0.4) 0%, transparent 70%)',
          top: '-10%',
          left: '10%',
        }}
      />
      <div
        className="absolute w-[500px] h-[500px] rounded-full opacity-15 animate-float-slow-reverse"
        style={{
          background: 'radial-gradient(circle, rgba(139,92,246,0.4) 0%, transparent 70%)',
          top: '20%',
          right: '5%',
        }}
      />
      <div
        className="absolute w-[400px] h-[400px] rounded-full opacity-10 animate-float-slow"
        style={{
          background: 'radial-gradient(circle, rgba(236,72,153,0.4) 0%, transparent 70%)',
          bottom: '10%',
          left: '30%',
          animationDelay: '3s',
        }}
      />

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />
    </div>
  );
}
