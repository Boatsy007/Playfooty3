/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        pink: {
          50: '#FEF0F7',
          100: '#FDD9ED',
          200: '#FBB3DB',
          300: '#F87DC1',
          400: '#F03FA0',
          500: '#E8157A',
          600: '#C90F66',
          700: '#A00C52',
        },
        navy: {
          50: '#E8EEF5',
          100: '#C5D3E3',
          200: '#8EA8C7',
          300: '#587DAB',
          400: '#2D5690',
          500: '#1A3A6B',
          600: '#0F2347',
          700: '#0A1A35',
          800: '#071228',
          900: '#040C1A',
        },
        gold: {
          400: '#F5C842',
          500: '#E8B830',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        container: '1200px',
      },
    },
  },
  plugins: [],
}


