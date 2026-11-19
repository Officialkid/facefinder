/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // EventSlot Core Brand Palette
        "brand-lime": "#C8F55A",
        "brand-offwhite": "#F0EDE6",
        "brand-black": "#0A0A0A",
        "brand-emerald": "#22C55E",
        "brand-forest": "#15803D",

        // Dark Theme Surface Tokens (Obsidian Black -> Card -> Elevated)
        background: "#0A0A0A",
        surface: "#0A0A0A",
        "surface-dim": "#0A0A0A",
        "surface-container-lowest": "#0A0A0A",
        "surface-container-low": "#141414",
        "surface-container": "#141414",
        "surface-container-high": "#1E1E1E",
        "surface-container-highest": "#1E1E1E",
        "surface-variant": "#1E1E1E",
        "surface-bright": "#2A2A2A",

        // Text & Borders
        "on-background": "#FFFFFF",
        "on-surface": "#FFFFFF",
        "on-surface-variant": "#A3A3A3",
        outline: "#737373",
        "outline-variant": "#2A2A2A",
        "inverse-surface": "#F0EDE6",
        "inverse-on-surface": "#0A0A0A",

        // Primary = Emerald Green (Dark) / Forest Green (Light override in globals.css)
        primary: "#22C55E",
        "primary-container": "#16A34A",
        "primary-fixed": "#DCFCE7",
        "primary-fixed-dim": "#22C55E",
        "on-primary": "#052E16",
        "on-primary-container": "#FFFFFF",
        "on-primary-fixed": "#052E16",
        "on-primary-fixed-variant": "#15803D",
        "inverse-primary": "#15803D",
        "surface-tint": "#22C55E",

        // Secondary = Signature Lime (#C8F55A on dark; Forest Green on light via globals.css)
        secondary: "#C8F55A",
        "secondary-container": "#1E2914",
        "secondary-fixed": "#C8F55A",
        "secondary-fixed-dim": "#B5E843",
        "on-secondary": "#0A0A0A",
        "on-secondary-container": "#C8F55A",
        "on-secondary-fixed": "#0A0A0A",
        "on-secondary-fixed-variant": "#15803D",

        // Tertiary / Success = Emerald Green
        tertiary: "#22C55E",
        "tertiary-container": "#14532D",
        "tertiary-fixed": "#DCFCE7",
        "tertiary-fixed-dim": "#22C55E",
        "on-tertiary": "#052E16",
        "on-tertiary-container": "#DCFCE7",
        "on-tertiary-fixed": "#052E16",
        "on-tertiary-fixed-variant": "#15803D",

        // Semantic Error
        error: "#EF4444",
        "error-container": "#7F1D1D",
        "on-error": "#FFFFFF",
        "on-error-container": "#FEE2E2",
      },
      fontFamily: {
        sans: ['"DM Sans"', "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        headline: ['"Instrument Serif"', "Georgia", "serif"],
        display: ['"Instrument Serif"', "Georgia", "serif"],
        mono: ['"JetBrains Mono"', "monospace"],
        "headline-lg-mobile": ['"Instrument Serif"', "Georgia", "serif"],
        "headline-lg": ['"Instrument Serif"', "Georgia", "serif"],
        "display-lg": ['"Instrument Serif"', "Georgia", "serif"],
        "body-md": ['"DM Sans"', "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        "label-sm": ['"DM Sans"', "sans-serif"],
      },
      fontSize: {
        "headline-lg-mobile": ["28px", { lineHeight: "34px", fontWeight: "400" }],
        "headline-lg": ["36px", { lineHeight: "42px", letterSpacing: "-0.01em", fontWeight: "400" }],
        "display-lg": ["56px", { lineHeight: "62px", letterSpacing: "-0.02em", fontWeight: "400" }],
        "body-md": ["15px", { lineHeight: "24px", fontWeight: "400" }],
        "label-sm": ["12px", { lineHeight: "16px", letterSpacing: "0.03em", fontWeight: "500" }],
      },
      spacing: {
        unit: "4px",
        "container-max": "1440px",
        gutter: "24px",
        margin: "32px",
      },
    },
  },
  plugins: [],
};
