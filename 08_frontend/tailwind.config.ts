import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        // ─── Institutional electric blue ───
        brand: {
          DEFAULT: '#3B7BFF',
          50:  'rgba(59, 123, 255, 0.05)',
          100: 'rgba(59, 123, 255, 0.10)',
          200: 'rgba(59, 123, 255, 0.20)',
          300: 'rgba(59, 123, 255, 0.35)',
          400: '#3B7BFF',
          500: '#2563EB',
        },
        // ─── Platform surfaces — deep navy ───
        surface: {
          0: '#080E1C',
          1: '#0B1325',
          2: '#0F1A35',
          3: '#162040',
        },
        // ─── Corporate Light Theme (Risk Dashboard) ───
        corp: {
          bg: '#F8FAFC',
          card: '#FFFFFF',
          border: '#E5E7EB',
          sidebar: '#052C73',
          primary: '#1D4ED8',
          success: '#16A34A',
          warning: '#F59E0B',
          danger: '#DC2626',
          textPrimary: '#0F172A',
          textSecondary: '#64748B',
        },
      },
      letterSpacing: {
        tightest: '-0.04em',
        tighter:  '-0.03em',
        tight:    '-0.02em',
        snug:     '-0.01em',
      },
      fontWeight: {
        black: '900',
      },
      boxShadow: {
        brand:   '0 0 28px rgba(59, 123, 255, 0.25)',
        'brand-lg': '0 0 48px rgba(59, 123, 255, 0.2)',
        card:    '0 4px 24px rgba(0, 0, 0, 0.4)',
      },
      borderRadius: {
        DEFAULT: '10px',
        sm: '6px',
        md: '10px',
        lg: '14px',
        xl: '18px',
        '2xl': '24px',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #3B7BFF 0%, #2563EB 100%)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulse_brand: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
      animation: {
        shimmer: 'shimmer 2s infinite linear',
        pulse_brand: 'pulse_brand 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
export default config
