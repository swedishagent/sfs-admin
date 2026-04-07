/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#006aa7',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#fecc00',
          foreground: '#1a1a1a',
        },
        destructive: {
          DEFAULT: '#dc3545',
          foreground: '#ffffff',
        },
        success: {
          DEFAULT: '#28a745',
          foreground: '#ffffff',
        },
        warning: {
          DEFAULT: '#ffc107',
          foreground: '#1a1a1a',
        },
        border: '#dee2e6',
        input: '#dee2e6',
        ring: '#006aa7',
        background: '#ffffff',
        foreground: '#1a1a1a',
      },
      borderRadius: {
        lg: '0.75rem',
        md: '0.5rem',
        sm: '0.375rem',
      },
      minWidth: {
        'touch': '44px',
      },
      minHeight: {
        'touch': '44px',
      },
    },
  },
  plugins: [],
}
