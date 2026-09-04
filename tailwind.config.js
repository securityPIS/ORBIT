/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Deep space background layers
        void: '#05070f',
        abyss: '#0a0e1a',
        panel: '#0e1524',
        'panel-2': '#121b2d',
        'panel-3': '#16203440',
        hair: '#1e293b',
        'hair-2': '#26344b',
        // Text
        ink: '#e8eefc',
        'ink-dim': '#9fb0cc',
        'ink-mute': '#5b6b88',
        // Brand accent
        brand: '#38bdf8',
        'brand-deep': '#0ea5e9',
        // Severity scale
        low: '#22c55e',
        moderate: '#f5b301',
        high: '#f97316',
        critical: '#ef4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        panel: '0 1px 0 0 rgba(255,255,255,0.03) inset, 0 8px 30px -12px rgba(0,0,0,0.6)',
        glow: '0 0 24px -4px rgba(56,189,248,0.5)',
      },
      keyframes: {
        'pulse-ring': {
          '0%': { transform: 'scale(0.6)', opacity: '0.7' },
          '100%': { transform: 'scale(2.4)', opacity: '0' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'spin-slow': {
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'pulse-ring': 'pulse-ring 2.4s cubic-bezier(0.4,0,0.2,1) infinite',
        'fade-up': 'fade-up 0.4s ease-out',
        shimmer: 'shimmer 2.2s linear infinite',
        'spin-slow': 'spin-slow 14s linear infinite',
      },
    },
  },
  plugins: [],
}
