/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        sherlock: {
          bg: '#09090b',
          surface: '#0f0f11',
          card: '#18181b',
          border: '#27272a',
          accent: '#6366f1',
          accentDim: '#4f46e5',
          danger: '#ef4444',
          warning: '#f59e0b',
          info: '#3b82f6',
          purple: '#8b5cf6',
          cyan: '#0ea5e9',
          text: '#f4f4f5',
          muted: '#d4d4d8',
          dim: '#a1a1aa',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'scan-line': 'scanLine 3s linear infinite',
        'blink': 'blink 1s step-end infinite',
        'slide-up': 'slideUp 0.4s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: 1, boxShadow: '0 0 5px rgba(6, 214, 160, 0.3)' },
          '50%': { opacity: 0.8, boxShadow: '0 0 20px rgba(6, 214, 160, 0.6)' },
        },
        scanLine: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        blink: {
          '50%': { opacity: 0 },
        },
        slideUp: {
          from: { transform: 'translateY(10px)', opacity: 0 },
          to: { transform: 'translateY(0)', opacity: 1 },
        },
        fadeIn: {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
      },
    },
  },
  plugins: [],
}
