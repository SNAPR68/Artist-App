// ArtistBook Design System v2 — Typography Tokens

export const typography = {
  fontFamily: {
    heading: 'Plus Jakarta Sans, Inter, system-ui, sans-serif',
    primary: 'Inter, system-ui, -apple-system, sans-serif',
    mono: 'JetBrains Mono, Menlo, Monaco, monospace',
  },
  fontSize: {
    overline: '11px',
    caption: '12px',
    body2: '14px',
    body1: '16px',
    subtitle: '18px',
    h4: '20px',
    h3: '24px',
    h2: '28px',
    h1: '32px',
    display: '40px',
    display2: '48px',
    display3: '56px',
  },
  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },
  lineHeight: {
    tight: 1.2,
    snug: 1.35,
    normal: 1.5,
  },
} as const;
