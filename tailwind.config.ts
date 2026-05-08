import type { Config } from "tailwindcss";
import forms from "@tailwindcss/forms";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        black: "rgb(var(--color-ink-rgb) / <alpha-value>)",
        white: "rgb(var(--color-on-dark-rgb) / <alpha-value>)",
        uga: {
          green: "rgb(var(--color-green-rgb) / <alpha-value>)",
          dark: "rgb(var(--color-dark-rgb) / <alpha-value>)",
          lime: "rgb(var(--color-lime-rgb) / <alpha-value>)",
          mist: "rgb(var(--color-mist-rgb) / <alpha-value>)",
        },
      },
      boxShadow: {
        soft: "none",
      },
    },
  },
  plugins: [forms],
};

export default config;
