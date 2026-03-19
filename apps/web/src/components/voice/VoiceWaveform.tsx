'use client';

import { useEffect, useRef, useState } from 'react';

export function VoiceWaveform({ isActive }: { isActive: boolean }) {
  const [heights, setHeights] = useState([8, 8, 8, 8, 8]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!isActive) {
      setHeights([8, 8, 8, 8, 8]);
      return;
    }

    function animate() {
      const now = Date.now();
      setHeights(
        [0, 1, 2, 3, 4].map(
          (i) => 12 + Math.sin(now / 200 + i * 1.2) * 14
        )
      );
      rafRef.current = requestAnimationFrame(animate);
    }

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isActive]);

  return (
    <div className="flex items-end justify-center gap-1 h-12">
      {heights.map((h, i) => (
        <div
          key={i}
          className="w-1.5 rounded-full bg-blue-500 transition-all duration-100"
          style={{ height: `${h}px` }}
        />
      ))}
    </div>
  );
}
