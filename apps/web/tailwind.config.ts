import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // ─── Colors ───────────────────────────────────────
      colors: {
        primary: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
        },
        secondary: {
          50: '#F5F3FF',
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
          800: '#5B21B6',
          900: '#4C1D95',
        },
        accent: {
          blue: '#3B82F6',
          indigo: '#6366F1',
          violet: '#8B5CF6',
          purple: '#7C3AED',
          magenta: '#EC4899',
          pink: '#F472B6',
        },
        surface: {
          bg: '#030712',
          base: '#0A0F1A',
          card: '#111827',
          elevated: '#1E293B',
          overlay: '#334155',
        },
        glass: {
          light: 'rgba(255, 255, 255, 0.05)',
          medium: 'rgba(255, 255, 255, 0.08)',
          heavy: 'rgba(255, 255, 255, 0.12)',
          border: 'rgba(255, 255, 255, 0.10)',
        },
        text: {
          primary: '#F9FAFB',
          secondary: '#D1D5DB',
          muted: '#9CA3AF',
          inverse: '#030712',
        },
        success: '#059669',
        warning: '#D97706',
        error: '#DC2626',
        info: '#2563EB',
        bookingStates: {
          inquiry: '#3B82F6',
          shortlisted: '#8B5CF6',
          quoted: '#06B6D4',
          negotiating: '#F59E0B',
          confirmed: '#10B981',
          pre_event: '#6366F1',
          event_day: '#EC4899',
          completed: '#059669',
          settled: '#047857',
          cancelled: '#EF4444',
          expired: '#9CA3AF',
          disputed: '#DC2626',
        },
      },

      // ─── Typography ───────────────────────────────────
      fontFamily: {
        heading: ['var(--font-heading)', 'Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        sans: ['var(--font-sans)', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'monospace'],
      },
      fontSize: {
        'hero': ['4.5rem', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
        'display': ['3.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'h1': ['3rem', { lineHeight: '1.15', letterSpacing: '-0.02em' }],
        'h2': ['2.25rem', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
        'h3': ['1.5rem', { lineHeight: '1.3' }],
        'h4': ['1.25rem', { lineHeight: '1.4' }],
      },
      letterSpacing: {
        tighter: '-0.02em',
        tight: '-0.01em',
        wide: '0.05em',
        wider: '0.1em',
      },

      // ─── Spacing (8px grid) ───────────────────────────
      spacing: {
        '0.5': '4px',
        '1': '8px',
        '1.5': '12px',
        '2': '16px',
        '2.5': '20px',
        '3': '24px',
        '4': '32px',
        '5': '40px',
        '6': '48px',
        '8': '64px',
        '10': '80px',
      },

      // ─── Border Radius ────────────────────────────────
      borderRadius: {
        sm: '8px',
        DEFAULT: '12px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        '2xl': '24px',
        pill: '999px',
      },

      // ─── Box Shadows (Colored Glows) ──────────────────
      boxShadow: {
        'glow-sm': '0 0 15px -3px rgba(59, 130, 246, 0.3)',
        'glow-md': '0 0 25px -5px rgba(99, 102, 241, 0.3)',
        'glow-lg': '0 0 40px -10px rgba(139, 92, 246, 0.3)',
        'glow-accent': '0 0 30px -5px rgba(236, 72, 153, 0.25)',
        'glow-white': '0 0 20px -5px rgba(255, 255, 255, 0.1)',
        elevated: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.2)',
        card: '0 1px 3px rgba(0, 0, 0, 0.4), 0 1px 2px rgba(0, 0, 0, 0.3)',
        glass: '0 8px 32px rgba(0, 0, 0, 0.4)',
      },

      // ─── Backdrop Blur ────────────────────────────────
      backdropBlur: {
        glass: '20px',
        'glass-lg': '40px',
      },

      // ─── Background Images (Gradients) ────────────────
      backgroundImage: {
        'gradient-accent': 'linear-gradient(135deg, #3B82F6, #6366F1, #8B5CF6, #EC4899)',
        'gradient-accent-hover': 'linear-gradient(135deg, #2563EB, #4F46E5, #7C3AED, #DB2777)',
        'gradient-accent-subtle': 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(139,92,246,0.1), rgba(236,72,153,0.1))',
        'gradient-surface': 'linear-gradient(180deg, #0A0F1A, #030712)',
        'gradient-glow': 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.15), transparent 70%)',
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },

      // ─── Z-Index ───────────────────────────────────────
      zIndex: {
        navbar: '50',
        dropdown: '55',
        modal: '60',
        toast: '70',
        tooltip: '80',
      },

      // ─── Max Width ──────────────────────────────────────
      maxWidth: {
        'prose': '65ch',
        'section': '1200px',
        'wide': '1400px',
      },

      // ─── Animations ───────────────────────────────────
      animation: {
        'fade-in-up': 'fadeInUp 0.5s ease-out',
        'fade-in-down': 'fadeInDown 0.5s ease-out',
        'fade-in-left': 'fadeInLeft 0.5s ease-out',
        'fade-in-right': 'fadeInRight 0.5s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        float: 'float 6s ease-in-out infinite',
        shimmer: 'shimmer 2s linear infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'gradient-shift': 'gradientShift 8s ease infinite',
        'count-up': 'countUp 1s ease-out',
        blob: 'blob 7s infinite',
        'spin-slow': 'spin 8s linear infinite',
      },

      // ─── Keyframes ────────────────────────────────────
      keyframes: {
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          from: { opacity: '0', transform: 'translateY(-20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInLeft: {
          from: { opacity: '0', transform: 'translateX(-20px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        fadeInRight: {
          from: { opacity: '0', transform: 'translateX(20px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.9)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        slideUp: {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        slideInRight: {
          from: { transform: 'translateX(100%)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(100%)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(139, 92, 246, 0.6), 0 0 80px rgba(236, 72, 153, 0.2)' },
        },
        gradientShift: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        countUp: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        blob: {
          '0%, 100%': { borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%' },
          '25%': { borderRadius: '30% 60% 70% 40% / 50% 60% 30% 60%' },
          '50%': { borderRadius: '50% 60% 30% 60% / 30% 60% 70% 40%' },
          '75%': { borderRadius: '60% 40% 60% 30% / 70% 30% 50% 60%' },
        },
      },

      // ─── Transition Timing ─────────────────────────────
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      transitionDuration: {
        fast: '150ms',
        normal: '300ms',
        slow: '500ms',
      },

      // ─── Screens ──────────────────────────────────────
      screens: {
        tablet: '640px',
        desktop: '1024px',
        wide: '1280px',
      },
    },
  },
  plugins: [],
};

export default config;
