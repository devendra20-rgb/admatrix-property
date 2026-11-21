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
        background: "#F7F8FA",
        surface: "#FFFFFF",
        primary: {
          DEFAULT: "#635BFF",
          hover: "#5248E2",
          light: "#F0EFFF",
        },
        secondary: {
          DEFAULT: "#8B7CFF",
          hover: "#7867F5",
        },
        dark: {
          DEFAULT: "#151923",
          muted: "#737B8C",
          light: "#A0A8B8",
        },
        border: "#E8EAF0",
        success: {
          DEFAULT: "#16A36A",
          light: "#E7F7F0",
        },
        warning: {
          DEFAULT: "#E5A12B",
          light: "#FDF5E8",
        },
        danger: {
          DEFAULT: "#E05252",
          light: "#FDEEEC",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      borderRadius: {
        card: "12px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)",
        elevated: "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03)",
      },
    },
  },
  plugins: [],
};
export default config;
