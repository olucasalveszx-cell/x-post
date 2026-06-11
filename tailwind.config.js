/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#eff2ff",
          100: "#e0e7ff",
          400: "#818cf8",
          500: "#4c6ef5",
          600: "#3b5bdb",
          700: "#2d3fe0",
        }
      }
    },
  },
  plugins: [],
};
