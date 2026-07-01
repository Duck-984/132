/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          200: '#FECACA',
          300: '#FCA5A5',
          400: '#F87171',
          500: '#FB4A47',
          600: '#E53E3E',
          700: '#C53030',
          800: '#9B2C2C',
          900: '#111205',
          950: '#111205',
        },
        navy: {
          50: '#F7F7F7',
          100: '#EDEDED',
          200: '#D4D4D4',
          300: '#BBBBBB',
          400: '#999999',
          500: '#777777',
          600: '#555555',
          700: '#333333',
          800: '#222222',
          900: '#111205',
          950: '#111205',
        },
        surface: {
          50: '#F7F7F7',
          100: '#EDEDED',
          200: '#D4D4D4',
          300: '#BBBBBB',
          400: '#999999',
          500: '#777777',
          600: '#555555',
          700: '#333333',
          800: '#222222',
          900: '#111205',
          950: '#111205',
        },
        accent: {
          DEFAULT: '#FB4A47',
          light: '#FEF2F2',
          dark: '#E53E3E',
        },
        pink: {
          DEFAULT: '#F6C1C0',
          light: '#FDF0F0',
          dark: '#D4948F',
        },
        beige: {
          DEFAULT: '#F3EDE7',
          light: '#FDF9F6',
          dark: '#D8CFC5',
        },
        divider: '#F5F5F5',
        success: { DEFAULT: '#10B981', light: '#D1FAE5', dark: '#065F46' },
        warning: { DEFAULT: '#F59E0B', light: '#FEF3C7', dark: '#92400E' },
        danger: { DEFAULT: '#FB4A47', light: '#FEF2F2', dark: '#C53030' },
      },
      fontFamily: {
        sans: ['Poppins', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        'glow': '0 0 20px -5px rgba(251, 74, 71, 0.2)',
        'glow-lg': '0 0 40px -10px rgba(251, 74, 71, 0.25)',
        'card': '0 1px 3px rgba(17,18,5,0.04), 0 4px 12px rgba(17,18,5,0.05)',
        'card-hover': '0 4px 16px rgba(17,18,5,0.07), 0 8px 32px rgba(17,18,5,0.05)',
        'elevated': '0 8px 30px rgba(17,18,5,0.07), 0 2px 8px rgba(17,18,5,0.04)',
        'float': '0 20px 60px rgba(17,18,5,0.09), 0 4px 16px rgba(17,18,5,0.05)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'fade-in-up': 'fadeInUp 0.5s ease-out',
        'fade-in-down': 'fadeInDown 0.4s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-in-up': 'slideInUp 0.4s ease-out',
        'bounce-in': 'bounceIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'shimmer': 'shimmer 2s infinite linear',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'wiggle': 'wiggle 0.5s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(24px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInUp: {
          '0%': { opacity: '0', transform: 'translateY(100%)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0)' },
          '50%': { transform: 'scale(1.15)' },
          '100%': { transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(-3deg)' },
          '75%': { transform: 'rotate(3deg)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
