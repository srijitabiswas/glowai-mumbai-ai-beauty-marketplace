/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'glow-bg':      '#F8F5F0',
        'glow-surface': '#FFFDF9',
        'glow-gold':    '#C9A86A',
        'glow-rose':    '#D8B4A0',
        'glow-black':   '#1A1A1A',
        'glow-muted':   '#6B6B6B',
        'glow-border':  '#EAE4DA',
      },
      fontFamily: {
        playfair: ['"Playfair Display"', 'Georgia', 'serif'],
        inter:    ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        luxury:    '0 4px 24px rgba(201,168,106,0.15)',
        'luxury-lg': '0 8px 48px rgba(201,168,106,0.22)',
        card:      '0 2px 16px rgba(26,26,26,0.08)',
      },
    },
  },
  plugins: [],
}