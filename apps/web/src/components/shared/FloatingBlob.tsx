'use client';

interface FloatingBlobProps {
  color?: string;
  size?: number;
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  delay?: number;
}

export function FloatingBlob({
  color = 'rgba(99, 102, 241, 0.15)',
  size = 300,
  top,
  left,
  right,
  bottom,
  delay = 0,
}: FloatingBlobProps) {
  return (
    <div
      className="absolute animate-blob pointer-events-none animate-pulse-scale"
      style={{
        width: size,
        height: size,
        background: color,
        filter: `blur(${size * 0.3}px)`,
        top,
        left,
        right,
        bottom,
        animationDelay: `${delay}s`,
      }}
    />
  );
}
