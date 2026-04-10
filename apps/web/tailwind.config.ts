import type { Config } from "tailwindcss";

const config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#24151C",
        plum: "#6B3955",
        mauve: "#8B5873",
        blush: "#F2C4CE",
        cream: "#FFF8F5",
        mist: "#F7EEF1",
        rose: "#E6AAB8",
        gold: "#D7B26D"
      },
      boxShadow: {
        card: "0 24px 80px rgba(51, 24, 37, 0.16)"
      },
      backgroundImage: {
        "brand-glow": "radial-gradient(circle at top, rgba(230, 170, 184, 0.42), transparent 42%), radial-gradient(circle at bottom left, rgba(107, 57, 85, 0.18), transparent 36%)"
      },
      fontFamily: {
        display: [
          "var(--font-display)"
        ],
        sans: [
          "var(--font-sans)"
        ]
      }
    }
  },
  plugins: []
} satisfies Config;

export default config;
