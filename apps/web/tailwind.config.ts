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
        // checkd design tokens
        ink: "#1a1416",
        "ink-soft": "#4a3f43",
        mute: "#8a7a80",
        pink: "#F8C8DC",
        "pink-soft": "#FDEDF3",
        "pink-deep": "#E8A8C0",
        line: "#efe4e8",
        paper: "#faf7f5",
        // Semantic states — pink is decorative only, never for states
        success: "#3a8a5e",
        error: "#c4452f",
        warn: "#b8842b",
        // Legacy aliases mapped to new token values
        plum: "#4a3f43",
        rose: "#efe4e8",
        cream: "#faf7f5",
        blush: "#F8C8DC",
        mist: "#FDEDF3",
        mauve: "#8a7a80",
        gold: "#b8842b"
      },
      boxShadow: {
        card: "0 1px 0 0 #efe4e8",
        lift: "0 4px 16px rgba(26,20,22,0.06)"
      },
      backgroundImage: {
        "brand-glow": "linear-gradient(135deg, #FDEDF3 0%, #faf7f5 100%)"
      },
      fontFamily: {
        display: ["var(--font-display)"],
        sans: ["var(--font-sans)"]
      }
    }
  },
  plugins: []
} satisfies Config;

export default config;
