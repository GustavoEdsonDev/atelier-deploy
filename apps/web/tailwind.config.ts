import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        atelier: {
          mustard: '#CDBB22',
          burnt: '#F06A00',
          lime: '#8FE65C',
          sand: '#D8D3C7',
          paper: '#E5DFD3',
          ink: '#14110F',
          muted: '#6D675E',
        },
      },
      boxShadow: {
        soft: '0 20px 50px rgba(20, 17, 15, 0.08)',
      },
      backgroundImage: {
        'studio-radial': 'linear-gradient(180deg, #ddd7ca 0%, #d8d3c7 100%)',
      },
    },
  },
  plugins: [],
} satisfies Config
