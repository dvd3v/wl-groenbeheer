import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#f5f6f8",
        surface: "#ffffff",
        surfaceAlt: "#f0f1f4",
        border: "#dce0e8",
        borderStrong: "#c8cdd6",
        text: "#1a1d2a",
        textDim: "#5c6077",
        textMuted: "#9298ad",
        accent: "#29b6c2",
        accentSoft: "rgba(41, 182, 194, 0.12)",
        accentStrong: "#1a8e98",
        success: "#16a34a",
        warning: "#d97706",
        danger: "#dc2626",
        violet: "#7c3aed",
        blue: "#2563eb",
      },
      borderRadius: {
        card: "12px",
        pill: "999px",
      },
      boxShadow: {
        panel: "0 4px 24px rgba(0, 0, 0, 0.08)",
        soft: "0 2px 8px rgba(0, 0, 0, 0.08)",
      },
      fontFamily: {
        sans: ["DM Sans", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      backgroundImage: {
        "page-glow":
          "radial-gradient(circle at top left, rgba(41, 182, 194, 0.14), transparent 25%), radial-gradient(circle at top right, rgba(124, 58, 237, 0.08), transparent 24%)",
      },
    },
  },
  plugins: [],
};

export default config;
