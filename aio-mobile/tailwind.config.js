/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#0F2238',
        background: '#FAFAFA',
      },
      fontFamily: {
        sans: ['Roboto', 'sans-serif'],
      },
      borderRadius: {
        xl: '1rem',
      },
    },
  },
  plugins: [],
};
