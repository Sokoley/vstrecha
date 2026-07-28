import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f7f4",
          100: "#dceee5",
          200: "#bbddd0",
          300: "#8dc5b3",
          400: "#5da692",
          500: "#3f8a77",
          600: "#2f6e60",
          700: "#28594e",
          800: "#234840",
          900: "#1f3c36",
          950: "#0f221f",
        },
        ink: {
          50: "#f6f5f1",
          100: "#eae7dc",
          200: "#d5d0bb",
          900: "#1c1a16",
          950: "#12110e",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
