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
        canvas: '#050505',
        panel: '#0f0f10',
        panelSoft: '#171718',
        accent: '#f5f5f5',
        accentStrong: '#d4d4d4',
        accentSky: '#cfcfcf',
        text: '#fafafa',
        muted: '#a3a3a3',
        border: 'rgba(255, 255, 255, 0.12)',
      },
      boxShadow: {
        glow: '0 20px 60px rgba(255, 255, 255, 0.08)',
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
