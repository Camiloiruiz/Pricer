import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Sertch brand palette
        brand: {
          50:  "#f0fdf4",
          100: "#dcfce7",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          900: "#14532d",
        },
        confidence: {
          high:   "#22c55e", // S ≥ 0.85
          medium: "#eab308", // 0.70 ≤ S < 0.85
          low:    "#ef4444", // S < 0.70
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      screens: {
        // Mobile-first; add only what's needed
        xs: "375px",
      },
    },
  },
  plugins: [],
};

export default config;
