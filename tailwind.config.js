/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e9fbf6',
          100: '#c8f4e7',
          300: '#5bd0b0',
          500: '#0f9f7f',
          600: '#087f68',
          700: '#075f51',
        },
        accent: {
          50: '#fff7ed',
          400: '#f59e0b',
          500: '#d97706',
          700: '#92400e',
        },
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #064e3b 0%, #0f9f7f 56%, #f59e0b 100%)',
        'gradient-hero': 'linear-gradient(180deg, #f6fbf8 0%, #f8fafc 42%, #ffffff 100%)',
        'hero-panel': 'linear-gradient(135deg, rgba(255,255,255,0.96) 0%, rgba(236,253,245,0.88) 52%, rgba(255,247,237,0.78) 100%)',
        'grid-pattern': 'linear-gradient(rgba(15, 159, 127, 0.09) 1px, transparent 1px), linear-gradient(90deg, rgba(15, 159, 127, 0.09) 1px, transparent 1px)',
      },
      backgroundSize: {
        'grid-pattern': '28px 28px',
      },
      boxShadow: {
        brand: '0 10px 24px rgba(15, 159, 127, 0.18)',
        soft: '0 22px 48px rgba(15, 23, 42, 0.08)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in',
        'scale-in': 'scaleIn 0.5s ease-out',
        'glow': 'glow 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(15, 159, 127, 0.24)' },
          '50%': { boxShadow: '0 0 40px rgba(245, 158, 11, 0.28)' },
        },
      },
    },
  },
  plugins: [],
}
