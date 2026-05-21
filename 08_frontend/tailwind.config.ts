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
        // ─── Supabase brand green ───
        brand: {
          DEFAULT: '#3ECF8E',
          50:  'rgba(62, 207, 142, 0.05)',
          100: 'rgba(62, 207, 142, 0.10)',
          200: 'rgba(62, 207, 142, 0.20)',
          300: 'rgba(62, 207, 142, 0.30)',
          400: '#3ECF8E',
          500: '#3ECF8E',
        },
        // ─── Platform surfaces ───
        surface: {
          0: '#0a0a0a',
          1: '#0f0f0f',
          2: '#141414',
          3: '#1a1a1a',
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
        brand:   '0 0 28px rgba(62, 207, 142, 0.25)',
        'brand-lg': '0 0 48px rgba(62, 207, 142, 0.2)',
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
        'brand-gradient': 'linear-gradient(135deg, #3ECF8E 0%, #3b82f6 100%)',
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
