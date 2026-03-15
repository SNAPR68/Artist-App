// 8px base grid system
export const spacing = {
  0: '0px',
  0.5: '4px',
  1: '8px',
  1.5: '12px',
  2: '16px',
  2.5: '20px',
  3: '24px',
  4: '32px',
  5: '40px',
  6: '48px',
  8: '64px',
  10: '80px',
  12: '96px',
  16: '128px',
} as const;

export const breakpoints = {
  mobile: '0px',
  tablet: '640px',
  desktop: '1024px',
  wide: '1280px',
} as const;

export const grid = {
  mobile: { columns: 4, gutter: '16px', margin: '16px' },
  tablet: { columns: 8, gutter: '24px', margin: '32px' },
  desktop: { columns: 12, gutter: '24px', margin: '32px' },
  wide: { columns: 12, gutter: '32px', margin: '64px' },
} as const;
