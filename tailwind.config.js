/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        pink: {
          DEFAULT: '#ff2c91',
          light: '#ff6bb5',
          dark: '#cc1f6e',
          muted: '#ffe0f1',
        },
        navy: {
          DEFAULT: '#081a3d',
          light: '#0f2860',
          mid: '#0d2150',
          muted: '#e8edf7',
        },
        gold: {
          DEFAULT: '#f4c14d',
          light: '#f8d47a',
          dark: '#d4a030',
        },
        surface: '#f8f8fb',
        cream: '#fdf8ff',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Bebas Neue"', 'Impact', 'sans-serif'],
      },
      maxWidth: {
        container: '1280px',
        tight: '1024px',
      },
      fontSize: {
        'display-sm': ['clamp(2.5rem, 5vw, 4rem)', { lineHeight: '0.92', letterSpacing: '-0.02em' }],
        'display-md': ['clamp(3.5rem, 7vw, 6rem)', { lineHeight: '0.9', letterSpacing: '-0.03em' }],
        'display-lg': ['clamp(5rem, 10vw, 9rem)', { lineHeight: '0.88', letterSpacing: '-0.04em' }],
        'display-xl': ['clamp(6rem, 13vw, 13rem)', { lineHeight: '0.85', letterSpacing: '-0.04em' }],
      },
      animation: {
        'gradient-shift': 'gradientShift 8s ease infinite',
        'float': 'float 6s ease-in-out infinite',
        'pulse-pink': 'pulsePink 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s infinite',
        'ticker': 'ticker 25s linear infinite',
      },
      keyframes: {
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        pulsePink: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(255,44,145,0.4)' },
          '50%': { boxShadow: '0 0 0 20px rgba(255,44,145,0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        ticker: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      boxShadow: {
        'pink': '0 20px 60px rgba(255,44,145,0.25)',
        'pink-lg': '0 30px 80px rgba(255,44,145,0.35)',
        'navy': '0 20px 60px rgba(8,26,61,0.25)',
        'glass': '0 8px 32px rgba(8,26,61,0.12)',
        'glow-pink': '0 0 40px rgba(255,44,145,0.4)',
      },
    },
  },
  plugins: [],
}


