import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        testrail: {
          header: "#1d2d3e",
          headerHover: "#2b3d51",
          headerActive: "#141f2b",
          green: "#48a43f",
          greenHover: "#3c8b34",
          blue: "#276fbf",
          blueHover: "#1d5ea8",
          dark: "#1e293b",
          light: "#f5f7f9",
          border: "#d8dee4",
          passed: "#3c763d",
          passedBg: "#dff0d8",
          passedBorder: "#d6e9c6",
          failed: "#a94442",
          failedBg: "#f2dede",
          failedBorder: "#ebccd1",
          blocked: "#8a6d3b",
          blockedBg: "#fcf8e3",
          blockedBorder: "#faebcc",
          retest: "#7e22ce",
          retestBg: "#f3e8ff",
          retestBorder: "#e9d5ff",
          untested: "#5e6c84",
          untestedBg: "#f4f5f7",
          untestedBorder: "#dfe1e6",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "Oxygen",
          "Ubuntu",
          "Cantarell",
          '"Fira Sans"',
          '"Droid Sans"',
          '"Helvetica Neue"',
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
export default config;
