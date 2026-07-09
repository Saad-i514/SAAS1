/** @type {import('tailwindcss').Config} */

// Warm ink → cream ramp. Black + cream visual identity: every accent utility
// (violet-/indigo-/purple-/brand-) is remapped onto this single scale.
const ink = {
  50:  '#f7f2e8',
  100: '#efe6d4',
  200: '#e3d7c0',
  300: '#cdbda0',
  400: '#a89a80',
  500: '#6f6353',
  600: '#2a241d',
  700: '#1c1815',
  800: '#14110e',
  900: '#100d0b',
  950: '#0a0806',
};

export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ink,
        violet: ink,
        indigo: ink,
        purple: ink,
        brand: ink,
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['10px', { lineHeight: '14px' }],
      },
      boxShadow: {
        'xs':    '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'card':  '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        'modal': '0 20px 60px -10px rgb(0 0 0 / 0.25)',
        'glow':  '0 0 0 3px rgb(99 102 241 / 0.15)',
      },
      borderRadius: {
        'xl':  '10px',
        '2xl': '14px',
        '3xl': '18px',
      },
      spacing: {
        '4.5': '18px',
        '13':  '52px',
        '15':  '60px',
        '18':  '72px',
      },
      transitionDuration: {
        '150': '150ms',
      },
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'fade-in': {
          '0%':   { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%':   { opacity: '0', transform: 'scale(0.97)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in':   'fade-in 0.2s ease-out',
        'slide-up':  'slide-up 0.25s ease-out',
        'scale-in':  'scale-in 0.2s ease-out',
        'shimmer':   'shimmer 2s linear infinite',
        'spin-slow': 'spin 2s linear infinite',
      },
    },
  },
  plugins: [],
}
