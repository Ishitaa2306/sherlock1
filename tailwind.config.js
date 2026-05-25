/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: {
          void: 'var(--bg-void)',
          base: 'var(--bg-base)',
          surface: 'var(--bg-surface)',
          elevated: 'var(--bg-elevated)',
          overlay: 'var(--bg-overlay)',
          card: 'var(--bg-card)',
          hover: 'var(--bg-hover)',
        },
        accent: {
          primary: 'var(--accent-primary)',
          'primary-dim': 'var(--accent-primary-dim)',
          'primary-glow': 'var(--accent-primary-glow)',
          secondary: 'var(--accent-secondary)',
          'secondary-dim': 'var(--accent-secondary-dim)',
        },
        status: {
          critical: 'var(--status-critical)',
          'critical-dim': 'var(--status-critical-dim)',
          warning: 'var(--status-warning)',
          'warning-dim': 'var(--status-warning-dim)',
          success: 'var(--status-success)',
          'success-dim': 'var(--status-success-dim)',
          info: 'var(--status-info)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
          accent: 'var(--text-accent)',
          code: 'var(--text-code)',
        },
        border: {
          subtle: 'var(--border-subtle)',
          default: 'var(--border-default)',
          emphasis: 'var(--border-emphasis)',
          critical: 'var(--border-critical)',
        }
      },
      fontFamily: {
        syne: ['Syne', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-pulse': 'glowPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        glowPulse: {
          '0%, 100%': { opacity: '0.3', filter: 'drop-shadow(0 0 4px var(--accent-primary-glow))' },
          '50%': { opacity: '0.9', filter: 'drop-shadow(0 0 16px var(--accent-primary-glow))' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
}
