/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#bc000a',
          container: '#e2241f',
          fixed: '#ffdad5',
          light: '#ff3b30',
          dark: '#930005',
        },
        secondary: {
          DEFAULT: '#006591',
          container: '#39b8fd',
          light: '#0284c7',
        },
        surface: {
          DEFAULT: '#f9f9ff',
          dim: '#cfdaf2',
          bright: '#ffffff',
          container: '#e7eeff',
          'container-low': '#f0f3ff',
          'container-high': '#dee8ff',
          'container-lowest': '#ffffff',
        },
        'on-surface': '#111c2d',
        'on-surface-variant': '#5d3f3b',
        'obsidian-bg': '#080c14',
        'obsidian-surface': '#0e1524',
        'obsidian-card': 'rgba(17, 24, 39, 0.75)',
        'obsidian-border': 'rgba(255, 255, 255, 0.08)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'neumorphic': '5px 5px 12px rgba(30, 41, 59, 0.06), -5px -5px 12px #FFFFFF',
        'neumorphic-pressed': 'inset 3px 3px 6px rgba(30, 41, 59, 0.08), inset -3px -3px 6px #FFFFFF',
        'neumorphic-dark': '5px 5px 15px rgba(0, 0, 0, 0.4), -3px -3px 10px rgba(255, 255, 255, 0.03)',
        'glow-primary': '0 0 25px rgba(188, 0, 10, 0.45)',
        'glow-emerald': '0 0 20px rgba(16, 185, 129, 0.4)',
        'glow-cyan': '0 0 20px rgba(6, 182, 212, 0.4)',
      },
      animation: {
        'pulse-ring': 'pulseRing 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite',
        'pulse-sos': 'pulseSos 1.8s infinite',
        'radar-sweep': 'radarSweep 3s linear infinite',
      },
      keyframes: {
        pulseRing: {
          '0%': { transform: 'scale(0.9)', opacity: '0.8' },
          '100%': { transform: 'scale(2.2)', opacity: '0' },
        },
        pulseSos: {
          '0%, 100%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(188, 0, 10, 0.5)' },
          '50%': { transform: 'scale(1.03)', boxShadow: '0 0 0 22px rgba(188, 0, 10, 0)' },
        },
        radarSweep: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
    },
  },
  plugins: [],
};
