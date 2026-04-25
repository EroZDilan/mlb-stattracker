/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "#080810",
          card: "#0f1022",
          accent: "#131a36",
          deep: "#050508",
        },
        mlb: {
          red: "#e94560",
          win: "#4caf50",
          loss: "#f44336",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["'Barlow Condensed'", "sans-serif"],
      },
    },
  },
  plugins: [],
};

