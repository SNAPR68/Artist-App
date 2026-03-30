/* eslint-disable @next/next/no-page-custom-font */
export default function FontPreviewPage() {
  const fonts = [
    { name: 'Space Grotesk', weight: '700', style: 'Geometric, tech, modern', category: 'A' },
    { name: 'Outfit', weight: '800', style: 'Clean with personality', category: 'A' },
    { name: 'Syne', weight: '800', style: 'Architectural, distinctive', category: 'A' },
    { name: 'Bebas Neue', weight: '400', style: 'Tall, iconic, all-caps', category: 'B' },
    { name: 'Oswald', weight: '700', style: 'Strong, industrial', category: 'B' },
    { name: 'Big Shoulders Display', weight: '800', style: 'Wide stance, commanding', category: 'B' },
    { name: 'Playfair Display', weight: '900', style: 'Elegant serif, high contrast', category: 'C' },
    { name: 'DM Serif Display', weight: '400', style: 'Modern serif, warm', category: 'C' },
    { name: 'Cormorant Garamond', weight: '700', style: 'Refined, luxury', category: 'C' },
    { name: 'Rajdhani', weight: '700', style: 'Indian-designed, geometric', category: 'D' },
    { name: 'Teko', weight: '700', style: 'Industrial, compact power', category: 'D' },
    { name: 'Saira Stencil One', weight: '400', style: 'Stencil cuts, grid-like', category: 'D' },
    { name: 'Orbitron', weight: '900', style: 'Futuristic, sci-fi grid', category: 'D' },
    { name: 'Audiowide', weight: '400', style: 'Electronic, bold', category: 'D' },
  ];

  // Apple-style B&W palettes with accent colors
  const bwPalettes = [
    { name: 'Pure B&W', tag: 'Apple classic — zero accent', accent: '#000000', accentText: '#000', chipBorder: '#e0e0e0', ctaBg: '#000000', ctaText: '#ffffff', highlight: '#000000' },
    { name: 'B&W + Electric Blue', tag: 'Apple + tech confidence', accent: '#0071E3', accentText: '#0071E3', chipBorder: '#e0e0e0', ctaBg: '#0071E3', ctaText: '#ffffff', highlight: '#0071E3' },
    { name: 'B&W + Coral Red', tag: 'Apple + entertainment energy', accent: '#FF3B30', accentText: '#FF3B30', chipBorder: '#e0e0e0', ctaBg: '#FF3B30', ctaText: '#ffffff', highlight: '#FF3B30' },
    { name: 'B&W + Teal', tag: 'Apple + 2026 WGSN', accent: '#00B4A6', accentText: '#00B4A6', chipBorder: '#e0e0e0', ctaBg: '#00B4A6', ctaText: '#ffffff', highlight: '#00B4A6' },
    { name: 'B&W + Gold', tag: 'Apple + premium authority', accent: '#B8860B', accentText: '#B8860B', chipBorder: '#e0e0e0', ctaBg: '#B8860B', ctaText: '#ffffff', highlight: '#B8860B' },
    { name: 'B&W + Violet', tag: 'Apple + creative edge', accent: '#7C3AED', accentText: '#7C3AED', chipBorder: '#e0e0e0', ctaBg: '#7C3AED', ctaText: '#ffffff', highlight: '#7C3AED' },
    { name: 'B&W + Emerald', tag: 'Apple + trust & growth', accent: '#059669', accentText: '#059669', chipBorder: '#e0e0e0', ctaBg: '#059669', ctaText: '#ffffff', highlight: '#059669' },
    { name: 'B&W + Burnt Orange', tag: 'Apple + Indian warmth', accent: '#D97706', accentText: '#D97706', chipBorder: '#e0e0e0', ctaBg: '#D97706', ctaText: '#ffffff', highlight: '#D97706' },
  ];

  const fontQuery = fonts.map(f => f.name.replace(/ /g, '+')).join('&family=');
  const demoFont = 'Space Grotesk';

  return (
    <>
      <link href={`https://fonts.googleapis.com/css2?family=${fontQuery}&display=swap`} rel="stylesheet" />
      <div className="min-h-screen bg-[#0e0e0f] px-6 py-20">
        <div className="max-w-6xl mx-auto">

          {/* ════════════════════════════════════ */}
          {/* SECTION 1: B&W PALETTES             */}
          {/* ════════════════════════════════════ */}
          <h1 className="text-white text-2xl font-bold mb-2">1. Pick Your Color</h1>
          <p className="text-white/40 text-sm mb-12">Apple-style B&W with accent color. White background, black text, color only on CTAs and highlights.</p>

          <div className="space-y-16 mb-28">
            {bwPalettes.map((pal, idx) => (
              <div key={pal.name}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-5 h-5 rounded-full shadow-lg" style={{ background: pal.accent, boxShadow: `0 0 12px ${pal.accent}40` }} />
                  <span className="text-white font-bold text-base">Palette {idx + 1}: {pal.name}</span>
                  <span className="text-white/30 text-xs">— {pal.tag}</span>
                </div>

                <div className="flex gap-6 items-start">
                  {/* Desktop mockup — WHITE background */}
                  <div className="flex-1 rounded-2xl p-8 text-center" style={{ background: '#FFFFFF', border: '1px solid #e5e5e5' }}>
                    <p className="text-black/20 text-[10px] uppercase tracking-widest mb-4">Desktop</p>

                    {/* Navbar */}
                    <div className="flex items-center justify-between mb-8 px-2 pb-3" style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <span style={{ fontFamily: `'${demoFont}', sans-serif`, fontWeight: 700, fontSize: '16px', letterSpacing: '0.35em', color: '#000000' }}>GRID</span>
                      <div className="flex items-center gap-3">
                        <span style={{ color: pal.accentText, fontSize: '11px', fontWeight: 600 }}>Plan Event</span>
                        <span className="text-black/40 text-[11px]">Artists</span>
                        <span className="text-black/40 text-[11px]">Live Gigs</span>
                        <span className="text-[11px] font-semibold px-3 py-1 rounded-full" style={{ background: pal.ctaBg, color: pal.ctaText }}>Get Started</span>
                      </div>
                    </div>

                    {/* Headline */}
                    <h2 style={{ fontFamily: `'${demoFont}', sans-serif`, fontWeight: 700, fontSize: '28px', letterSpacing: '-0.02em', color: '#000000', marginBottom: '6px' }}>
                      Plug into India&apos;s <span style={{ color: pal.highlight }}>live entertainment grid.</span>
                    </h2>

                    {/* Subtitle */}
                    <p className="text-xs mb-6">
                      <span style={{ color: pal.accentText, fontWeight: 500 }}>Artists grow careers.</span>{' '}
                      <span className="text-black/50">Companies build events.</span>{' '}
                      <span className="text-black/30">The industry moves — all on one platform.</span>
                    </p>

                    {/* Chat box */}
                    <div className="max-w-lg mx-auto rounded-xl p-5 text-left relative" style={{ background: '#FAFAFA', border: '1px solid #e5e5e5' }}>
                      <p className="text-black/25 text-xs mb-10">Delhi wedding, 300 guests, Punjabi singer for sangeet night...</p>
                      <div className="flex items-center justify-between">
                        <span className="text-black/20 text-[10px]">Voice</span>
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: pal.ctaBg }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill={pal.ctaText}><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/></svg>
                        </div>
                      </div>
                    </div>

                    {/* Chips */}
                    <div className="flex flex-wrap justify-center gap-2 mt-3">
                      {['Wedding sangeet', 'Corporate event', 'College fest'].map(chip => (
                        <span key={chip} className="text-[10px] px-2.5 py-1 rounded-full text-black/40" style={{ border: `1px solid ${pal.chipBorder}` }}>{chip}</span>
                      ))}
                    </div>
                  </div>

                  {/* Phone mockup — WHITE background */}
                  <div className="w-[220px] shrink-0">
                    <p className="text-white/20 text-[10px] uppercase tracking-widest mb-4 text-center">Mobile</p>
                    <div
                      className="rounded-[28px] overflow-hidden relative"
                      style={{
                        width: '220px',
                        height: '440px',
                        background: '#FFFFFF',
                        border: '2px solid #d4d4d4',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                      }}
                    >
                      {/* Dynamic Island */}
                      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-10" />

                      <div className="px-4 pt-12 pb-4 h-full flex flex-col">
                        {/* Mobile navbar */}
                        <div className="flex items-center justify-between mb-5 pb-2" style={{ borderBottom: '1px solid #f0f0f0' }}>
                          <span style={{ fontFamily: `'${demoFont}', sans-serif`, fontWeight: 700, fontSize: '12px', letterSpacing: '0.3em', color: '#000000' }}>GRID</span>
                          <div className="flex flex-col gap-[3px]">
                            <div className="w-3.5 h-[1.5px] rounded-full bg-black/30" />
                            <div className="w-3.5 h-[1.5px] rounded-full bg-black/30" />
                          </div>
                        </div>

                        {/* Mobile headline */}
                        <h3 style={{ fontFamily: `'${demoFont}', sans-serif`, fontWeight: 700, fontSize: '16px', letterSpacing: '-0.01em', color: '#000000', marginBottom: '4px', lineHeight: 1.2 }}>
                          Plug into India&apos;s <span style={{ color: pal.highlight }}>live entertainment grid.</span>
                        </h3>

                        <p className="text-[8px] mb-4">
                          <span style={{ color: pal.accentText, fontWeight: 500 }}>Artists grow careers.</span>{' '}
                          <span className="text-black/30">Companies build events.</span>
                        </p>

                        {/* Mobile chat box */}
                        <div className="flex-1 rounded-xl p-3 relative" style={{ background: '#FAFAFA', border: '1px solid #e5e5e5' }}>
                          <p className="text-black/25 text-[9px] leading-relaxed">Delhi wedding, 300 guests, Punjabi singer...</p>
                          <div className="absolute bottom-2.5 right-2.5">
                            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: pal.ctaBg }}>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill={pal.ctaText}><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/></svg>
                            </div>
                          </div>
                        </div>

                        {/* Mobile chips */}
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {['Wedding', 'Corporate', 'College fest'].map(chip => (
                            <span key={chip} className="text-[8px] px-2 py-0.5 rounded-full text-black/30" style={{ border: '1px solid #e5e5e5' }}>{chip}</span>
                          ))}
                        </div>

                        {/* Home indicator */}
                        <div className="mt-auto pt-3 flex justify-center">
                          <div className="w-24 h-1 rounded-full bg-black/15" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ════════════════════════════════════ */}
          {/* SECTION 2: FONTS                    */}
          {/* ════════════════════════════════════ */}
          <h1 className="text-white text-2xl font-bold mb-2">2. Pick Your Font</h1>
          <p className="text-white/40 text-sm mb-12">14 fonts. Shown in black on white — Apple style.</p>

          {Object.entries({
            A: 'Geometric Sans — Clean, Modern, Tech',
            B: 'Extended / Wide — Power, Dominance',
            C: 'Serif / Editorial — Premium, Established',
            D: 'Stencil / Industrial — Grid Energy',
          }).map(([cat, label]) => (
            <div key={cat} className="mb-16">
              <p className="text-white/50 text-xs font-bold tracking-widest uppercase mb-6">{label}</p>
              <div className="space-y-6">
                {fonts.filter(f => f.category === cat).map((font) => (
                  <div key={font.name} className="rounded-2xl p-8 hover:shadow-lg transition-all" style={{ background: '#FFFFFF', border: '1px solid #e5e5e5' }}>
                    <p className="text-black/40 text-xs font-mono mb-6">{font.name} — {font.style}</p>
                    <div className="mb-6 flex items-center gap-6">
                      <span className="text-black/25 text-[10px] uppercase tracking-widest w-16 shrink-0">Navbar</span>
                      <span style={{ fontFamily: `'${font.name}', sans-serif`, fontWeight: font.weight, fontSize: '20px', letterSpacing: '0.35em', color: '#000000' }}>GRID</span>
                    </div>
                    <div className="flex items-center gap-6">
                      <span className="text-black/25 text-[10px] uppercase tracking-widest w-16 shrink-0">Hero</span>
                      <span style={{ fontFamily: `'${font.name}', sans-serif`, fontWeight: font.weight, fontSize: '72px', letterSpacing: '0.3em', lineHeight: 1, color: '#000000' }}>GRID</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
