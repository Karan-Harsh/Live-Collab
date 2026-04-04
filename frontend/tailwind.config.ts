import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    './services/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#07111f',
        panel: '#0d1728',
        panelSoft: '#111f34',
        accent: '#2dd4bf',
        accentStrong: '#14b8a6',
        accentSky: '#38bdf8',
        text: '#e6eef8',
        muted: '#8ba3c7',
        border: 'rgba(148, 163, 184, 0.18)',
      },
      boxShadow: {
        glow: '0 20px 60px rgba(45, 212, 191, 0.15)',
      },
      backgroundImage: {
        grid: 'linear-gradient(rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.08) 1px, transparent 1px)',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '"Segoe UI"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', '"SFMono-Regular"', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
