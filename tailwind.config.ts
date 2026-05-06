import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    './app/**/*.{ts,tsx,mdx}',
    './components/**/*.{ts,tsx,mdx}',
    './features/**/*.{ts,tsx,mdx}',
    './lib/**/*.{ts,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eefafa',
          100: '#d7f2f2',
          200: '#b5e8e8',
          300: '#8adada',
          400: '#5ac9c9',
          500: '#23b3b3',
          600: '#169f9f',
          700: '#128282',
          800: '#126868',
          900: '#125656',
        },
        accent: {
          50: '#eff8fb',
          100: '#d7eef5',
          200: '#aedceb',
          300: '#7ec3dc',
          400: '#4aaccf',
          500: '#2aa9c1',
          600: '#2185a0',
          700: '#1f6b80',
          800: '#1f5969',
          900: '#1f4b58',
        },
        neutral: {
          0: '#ffffff',
          50: '#f4f7f8',
          100: '#e9eef1',
          200: '#d6e0e5',
          300: '#c0ced6',
          400: '#96a8b4',
          500: '#6f8493',
          600: '#526a7a',
          700: '#3d5365',
          800: '#27384a',
          900: '#13243a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Newsreader', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'soft': '0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.08)',
        'medium': '0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.08)',
        'large': '0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.08)',
        'primary': '0 4px 14px 0 rgb(99 102 241 / 0.15)',
        'accent': '0 4px 14px 0 rgb(255 107 87 / 0.15)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'pulse-subtle': 'pulseSubtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
