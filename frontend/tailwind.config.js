/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'deep-black': '#0A0A0F',
        charcoal: '#12121A',
        'neon-green': '#00FF88',
        'electric-cyan': '#00D4FF',
        'soft-red': '#FF4472',
        'amber-warning': '#FFB444',
        'white-text': '#F0F0F5',
        muted: '#8888AA',
      },
      fontFamily: {
        sans: ['Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        float: 'float 6s ease-in-out infinite',
        'scan-line': 'scanLine 2s linear infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'count-up': 'countUp 1.5s ease-out',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 10px rgba(0,255,136,0.15)' },
          '50%': { boxShadow: '0 0 25px rgba(0,255,136,0.35)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        scanLine: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      backdropBlur: { xs: '2px' },
      boxShadow: {
        'neon-sm': '0 0 10px rgba(0, 255, 136, 0.15)',
        'neon-md': '0 0 20px rgba(0, 255, 136, 0.22)',
        'neon-lg': '0 0 40px rgba(0, 255, 136, 0.35)',
        'neon-xl': '0 0 60px rgba(0, 255, 136, 0.4)',
      },
      backgroundImage: {
        'radial-neon': 'radial-gradient(ellipse at top, rgba(0,255,136,0.05) 0%, transparent 60%), radial-gradient(ellipse at bottom, rgba(0,212,255,0.03) 0%, transparent 60%)',
      },
    },
  },
  plugins: [],
}
