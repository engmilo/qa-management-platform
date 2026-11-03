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
        background: "#0A0F1C",
        foreground: "#E8ECF4",
        primary: {
          DEFAULT: "#1B3A6B",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#2D3748",
          foreground: "#E8ECF4",
        },
        muted: {
          DEFAULT: "#1E293B",
          foreground: "#8B9BB8",
        }
      }
    },
  },
  plugins: [],
};
export default config;
