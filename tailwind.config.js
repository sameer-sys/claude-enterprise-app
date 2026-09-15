/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#18181b",
        foreground: "#f4f4f5",
        muted: "#27272a",
        "muted-foreground": "#a1a1aa",
        border: "#3f3f46",
        primary: {
          DEFAULT: "#d97706",
          foreground: "#ffffff",
        },
        card: {
          DEFAULT: "#202023",
          foreground: "#f4f4f5",
        },
      },
    },
  },
  plugins: [],
};
