/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,jsx}'],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        tofu: '#00C65E', // Tofu Green: black text on it (white fails contrast)
        violet: '#5C5FEF', // Electric Purple: white text on it
        blaze: '#FF5C00', // Vibrant Orange: black text on it
        ink: '#000000',
        paper: '#F2F2F0', // Warm Off-White
      },
      fontFamily: {
        display: ['Shrikhand', '"DM Sans"', 'ui-serif', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        base: ['14px', '20px'],
      },
      borderRadius: {
        card: '24px',
        block: '32px',
      },
      keyframes: {
        'spin-slow': { to: { transform: 'rotate(360deg)' } },
        reveal: { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'none' } },
      },
      animation: {
        'spin-slow': 'spin-slow 24s linear infinite',
        reveal: 'reveal .5s cubic-bezier(.2,.7,.2,1) both',
      },
    },
  },
  plugins: [],
};
