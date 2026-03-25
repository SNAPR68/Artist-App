import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // ─── Colors (Light-first, shadcn/ui inspired) ─────────
      colors: {
        // Brand — vibrant violet
        primary: {
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
          950: '#2E1065',
        },
        secondary: {
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#F97316',
          600: '#EA580C',
          700: '#C2410C',
          800: '#9A3412',
          900: '#7C2D12',
        },
        // Neutral (zinc-based for warmth)
        neutral: {
          50: '#FAFAFA',
          100: '#F4F4F5',
          200: '#E4E4E7',
          300: '#D4D4D8',
          400: '#A1A1AA',
          500: '#71717A',
          600: '#52525B',
          700: '#3F3F46',
          800: '#27272A',
          900: '#18181B',
          950: '#09090B',
        },
        // Semantic surfaces
        background: '#FFFFFF',
        foreground: '#09090B',
        card: {
          DEFAULT: '#FFFFFF',
          foreground: '#09090B',
        },
        muted: {
          DEFAULT: '#F4F4F5',
          foreground: '#71717A',
        },
        accent: {
          DEFAULT: '#F5F3FF',
          foreground: '#7C3AED',
        },
        border: '#E4E4E7',
        input: '#E4E4E7',
        ring: '#8B5CF6',
        // Status colors
        success: { DEFAULT: '#10B981', light: '#ECFDF5', foreground: '#065F46' },
        warning: { DEFAULT: '#F59E0B', light: '#FFFBEB', foreground: '#92400E' },
        error: { DEFAULT: '#EF4444', light: '#FEF2F2', foreground: '#991B1B' },
        info: { DEFAULT: '#6366F1', light: '#EEF2FF', foreground: '#3730A3' },
        // Voice widget design tokens
        'text': {
          primary: '#09090B',
          secondary: '#52525B',
          muted: '#71717A',
        },
        'surface': {
          base: '#FFFFFF',
          card: '#FFFFFF',
          elevated: '#FAFAFA',
        },
        'glass': {
          light: 'rgba(255,255,255,0.6)',
          medium: 'rgba(255,255,255,0.8)',
          heavy: 'rgba(255,255,255,0.92)',
          border: 'rgba(228,228,231,0.6)',
        },
        // ─── Nocturne Hollywood Theme ──────────────────
        nocturne: {
          base: '#0E0E0F',
          surface: '#1A1A1D',
          'surface-2': '#242428',
          primary: '#8A2BE2',
          'primary-hover': '#6A1BB2',
          'primary-light': 'rgba(138, 43, 226, 0.15)',
          accent: '#A1FAFF',
          'accent-dim': 'rgba(161, 250, 255, 0.6)',
          success: '#00E676',
          warning: '#FFD740',
          error: '#FF5252',
          info: '#448AFF',
          gold: '#FFD700',
          glass: {
            panel: 'rgba(255, 255, 255, 0.04)',
            card: 'rgba(255, 255, 255, 0.06)',
            elevated: 'rgba(255, 255, 255, 0.10)',
            floating: 'rgba(255, 255, 255, 0.12)',
          },
          border: {
            subtle: 'rgba(255, 255, 255, 0.08)',
            DEFAULT: 'rgba(255, 255, 255, 0.15)',
            strong: 'rgba(255, 255, 255, 0.25)',
          },
          text: {
            primary: '#FFFFFF',
            secondary: 'rgba(255, 255, 255, 0.65)',
            tertiary: 'rgba(255, 255, 255, 0.4)',
          },
        },
        // Booking states
        bookingStates: {
          inquiry: '#8B5CF6',
          shortlisted: '#A78BFA',
          quoted: '#06B6D4',
          negotiating: '#F59E0B',
          confirmed: '#10B981',
          pre_event: '#6366F1',
          event_day: '#EC4899',
          completed: '#059669',
          settled: '#047857',
          cancelled: '#EF4444',
          expired: '#71717A',
          disputed: '#DC2626',
        },
      },

      // ─── Typography ─────────────────────────────────────
      fontFamily: {
        heading: ['var(--font-plus-jakarta)', 'Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        sans: ['var(--font-inter)', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'monospace'],
        display: ['var(--font-manrope)', 'Manrope', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        'hero': ['4.5rem', { lineHeight: '1.05', letterSpacing: '-0.03em', fontWeight: '800' }],
        'display': ['3.5rem', { lineHeight: '1.08', letterSpacing: '-0.025em', fontWeight: '700' }],
        'h1': ['2.75rem', { lineHeight: '1.12', letterSpacing: '-0.02em', fontWeight: '700' }],
        'h2': ['2rem', { lineHeight: '1.2', letterSpacing: '-0.015em', fontWeight: '700' }],
        'h3': ['1.5rem', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '600' }],
        'h4': ['1.25rem', { lineHeight: '1.4', letterSpacing: '-0.01em', fontWeight: '600' }],
        'body-lg': ['1.125rem', { lineHeight: '1.7' }],
        'body': ['1rem', { lineHeight: '1.6' }],
        'body-sm': ['0.875rem', { lineHeight: '1.5' }],
        'caption': ['0.75rem', { lineHeight: '1.5', letterSpacing: '0.01em' }],
        'overline': ['0.6875rem', { lineHeight: '1', letterSpacing: '0.08em', fontWeight: '600' }],
      },

      // ─── Spacing (4px grid) ──────────────────────────────
      spacing: {
        '0.5': '2px',
        '1': '4px',
        '1.5': '6px',
        '2': '8px',
        '2.5': '10px',
        '3': '12px',
        '3.5': '14px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '7': '28px',
        '8': '32px',
        '9': '36px',
        '10': '40px',
        '11': '44px',
        '12': '48px',
        '14': '56px',
        '16': '64px',
        '18': '72px',
        '20': '80px',
        '24': '96px',
        '28': '112px',
        '32': '128px',
      },

      // ─── Border Radius ──────────────────────────────────
      borderRadius: {
        'xs': '4px',
        sm: '6px',
        DEFAULT: '8px',
        md: '10px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
        '3xl': '24px',
        '4xl': '32px',
        pill: '999px',
      },

      // ─── Backdrop Blur ─────────────────────────────────
      backdropBlur: {
        'glass': '8px',
        'glass-lg': '16px',
        '3xl': '64px',
        '4xl': '80px',
      },

      // ─── Box Shadows (light theme — soft, layered) ──────
      boxShadow: {
        'xs': '0 1px 2px 0 rgba(0,0,0,0.05)',
        'sm': '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)',
        'md': '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)',
        'lg': '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
        'xl': '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
        '2xl': '0 25px 50px -12px rgba(0,0,0,0.25)',
        // Card-specific
        'card': '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
        'card-hover': '0 10px 30px -5px rgba(0,0,0,0.12), 0 4px 6px -2px rgba(0,0,0,0.08)',
        'elevated': '0 4px 20px rgba(0,0,0,0.08)',
        // Brand glow
        'glow-sm': '0 0 20px -5px rgba(139,92,246,0.25)',
        'glow-md': '0 0 30px -5px rgba(139,92,246,0.35)',
        'glow-lg': '0 0 50px -10px rgba(139,92,246,0.3)',
        // Focus
        'focus': '0 0 0 3px rgba(139,92,246,0.2)',
        'focus-error': '0 0 0 3px rgba(239,68,68,0.2)',
        'glass': '0 4px 30px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05)',
        // Nocturne shadows
        'nocturne-card': '0 8px 32px rgba(0, 0, 0, 0.4)',
        'nocturne-card-hover': '0 20px 50px -10px rgba(0, 0, 0, 0.5), 0 0 30px -5px rgba(138, 43, 226, 0.3)',
        'nocturne-glow-purple': '0 0 30px -5px rgba(138, 43, 226, 0.5)',
        'nocturne-glow-cyan': '0 0 20px -5px rgba(161, 250, 255, 0.4)',
        'nocturne-glow-sm': '0 0 15px -3px rgba(138, 43, 226, 0.3)',
      },

      // ─── Gradients ──────────────────────────────────────
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
        'gradient-primary-hover': 'linear-gradient(135deg, #7C3AED, #6D28D9)',
        'gradient-accent': 'linear-gradient(135deg, #8B5CF6, #EC4899)',
        'gradient-warm': 'linear-gradient(135deg, #F97316, #EC4899)',
        'gradient-cool': 'linear-gradient(135deg, #06B6D4, #8B5CF6)',
        'gradient-hero': 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 30%, #FFF7ED 70%, #FFFFFF 100%)',
        'gradient-section': 'linear-gradient(180deg, #FFFFFF 0%, #F9FAFB 100%)',
        'gradient-dark': 'linear-gradient(135deg, #18181B 0%, #1E1B4B 50%, #18181B 100%)',
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        // Nocturne gradients
        'gradient-nocturne': 'linear-gradient(135deg, #8A2BE2, #6A1BB2)',
        'gradient-nocturne-accent': 'linear-gradient(135deg, #8A2BE2, #A1FAFF)',
        'gradient-nocturne-hero': 'radial-gradient(ellipse at 30% 20%, rgba(138,43,226,0.25) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(161,250,255,0.1) 0%, transparent 50%), #0E0E0F',
        'gradient-nocturne-card': 'linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
      },

      // ─── Z-Index ────────────────────────────────────────
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

      // ─── Animations ─────────────────────────────────────
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        'fade-in-up': 'fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in-down': 'fadeInDown 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scale-in': 'scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-up': 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-right': 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'pulse-subtle': 'pulseSubtle 3s ease-in-out infinite',
        'count-up': 'countUp 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
        'spin-slow': 'spin 8s linear infinite',
        // Nocturne animations
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        'tilt-in': 'tiltIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'voice-bar': 'voiceBar 0.8s ease-in-out infinite alternate',
      },

      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          from: { opacity: '0', transform: 'translateY(-16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.95)' },
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
          '50%': { transform: 'translateY(-8px)' },
        },
        shimmer: {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(100%)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        countUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        // Nocturne keyframes
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 20px -5px rgba(138, 43, 226, 0.3)' },
          '50%': { boxShadow: '0 0 40px -5px rgba(138, 43, 226, 0.6)' },
        },
        tiltIn: {
          from: { opacity: '0', transform: 'perspective(1000px) rotateX(10deg) translateY(20px)' },
          to: { opacity: '1', transform: 'perspective(1000px) rotateX(0) translateY(0)' },
        },
        voiceBar: {
          '0%': { transform: 'scaleY(0.3)' },
          '100%': { transform: 'scaleY(1)' },
        },
      },

      // ─── Transitions ────────────────────────────────────
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'in-out-expo': 'cubic-bezier(0.87, 0, 0.13, 1)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      transitionDuration: {
        fast: '150ms',
        normal: '200ms',
        slow: '350ms',
      },

      // ─── Screens ────────────────────────────────────────
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
