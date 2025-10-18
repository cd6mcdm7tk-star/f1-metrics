/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Mercedes Silver Tech Palette
        'metrik': {
          'black': '#0A0A0A',          // Noir pur premium
          'dark': '#1A1A1A',           // Gris très foncé
          'card': '#121212',           // Noir cards
          'turquoise': '#00D2BE',      // Turquoise Mercedes
          'silver': '#C0C0C0',         // Argent métallique
          'gold': '#FFD700',           // Or podium
          'text': '#FFFFFF',           // Blanc pur
          'text-secondary': '#B0B0B0', // Gris clair
          'text-tertiary': '#808080',  // Gris moyen
          'success': '#00D176',        // Vert
          'warning': '#FFB800',        // Jaune
          'error': '#FF4444',          // Rouge
        }
      },
      fontFamily: {
        'rajdhani': ['Rajdhani', 'sans-serif'],
        'inter': ['Inter', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'glow-turquoise': '0 0 20px rgba(0, 210, 190, 0.3)',
        'glow-turquoise-lg': '0 0 40px rgba(0, 210, 190, 0.4)',
        'glow-silver': '0 0 20px rgba(192, 192, 192, 0.3)',
        'cockpit': '0 4px 20px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      },
      backgroundImage: {
        'grid-pattern': 'linear-gradient(rgba(0,210,190,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,210,190,0.02) 1px, transparent 1px)',
      },
      backgroundSize: {
        'grid': '40px 40px',
      },
      animation: {
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { 
            boxShadow: '0 0 20px rgba(0, 210, 190, 0.2)',
          },
          '50%': { 
            boxShadow: '0 0 30px rgba(0, 210, 190, 0.4)',
          },
        },
      },
    },
  },
  plugins: [],
}