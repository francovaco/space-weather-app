import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Design system — dark space theme
        background: {
          DEFAULT: '#060a12',
          secondary: '#0c1220',
          tertiary: '#111827',
          card: '#0e1624',
        },
        border: {
          DEFAULT: '#1e2d42',
          accent: '#1e3a5f',
        },
        primary: {
          DEFAULT: '#3b82f6',
          foreground: '#ffffff',
          muted: '#1d4ed8',
          glow: 'rgba(59,130,246,0.15)',
        },
        accent: {
          cyan: '#06b6d4',
          teal: '#14b8a6',
          amber: '#f59e0b',
          red: '#ef4444',
          orange: '#f97316',
          green: '#22c55e',
          purple: '#a855f7',
        },
        text: {
          primary: '#e2e8f0',
          secondary: '#94a3b8',
          muted: '#64748b',
          dim: '#475569',
        },
        // Instrument-specific colors (matching SWPC charts)
        flux: {
          xray_short: '#ff4444',
          xray_long: '#4488ff',
          proton_10: '#ff8800',
          proton_50: '#ffcc00',
          proton_100: '#ff4488',
          electron_gt2: '#00ccff',
          electron_gt4: '#00ff88',
          mag_hp: '#ff6644',
          mag_he: '#44aaff',
          mag_hn: '#44ff88',
          mag_total: '#ffffff',
        },
        // Alert level colors (NOAA standard)
        alert: {
          g1: '#ffff00',
          g2: '#ffa500',
          g3: '#ff4500',
          g4: '#ff0000',
          g5: '#800000',
          none: '#22c55e',
        },
      },
      fontFamily: {
        sans: ['var(--font-space-mono)', 'Space Mono', 'monospace'],
        display: ['var(--font-orbitron)', 'Orbitron', 'sans-serif'],
        mono: ['var(--font-space-mono)', 'Space Mono', 'monospace'],
        data: ['var(--font-jetbrains)', 'JetBrains Mono', 'monospace'],
      },
      fontSize: {
        '2xs': '0.625rem',
        xs: '0.75rem',
        sm: '0.8125rem',
      },
      backgroundImage: {
        'grid-pattern':
          'linear-gradient(rgba(30,45,66,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(30,45,66,0.4) 1px, transparent 1px)',
        'radial-glow':
          'radial-gradient(ellipse at center, rgba(59,130,246,0.08) 0%, transparent 70%)',
        'scan-lines':
          'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)',
      },
      backgroundSize: {
        'grid-sm': '20px 20px',
        'grid-md': '40px 40px',
        'grid-lg': '60px 60px',
      },
      boxShadow: {
        'glow-blue': '0 0 20px rgba(59,130,246,0.3), 0 0 40px rgba(59,130,246,0.1)',
        'glow-cyan': '0 0 20px rgba(6,182,212,0.3), 0 0 40px rgba(6,182,212,0.1)',
        'glow-red': '0 0 20px rgba(239,68,68,0.4)',
        'inner-glow': 'inset 0 0 30px rgba(59,130,246,0.05)',
        card: '0 4px 24px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.03)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 8s linear infinite',
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        blink: 'blink 1s step-end infinite',
        scan: 'scan 3s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
      },
      borderRadius: {
        DEFAULT: '6px',
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
    },
  },
  plugins: [],
}

export default config
