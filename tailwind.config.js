/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Noto Sans', 'sans-serif'],
        display: ['Raleway', 'sans-serif'],
      },
      colors: {
        wood: {
          50: '#fdf8ee', 100: '#f9efd0', 200: '#f2da9d', 300: '#eabe62',
          400: '#e3a232', 500: '#d99c0b', 600: '#b87d08', 700: '#8a610a',
          800: '#6b4b0d', 900: '#3d2f05',
        },
        danger: '#dc2626',
      },
    },
  },
  plugins: [],
};
