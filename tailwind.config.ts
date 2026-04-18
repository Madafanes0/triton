import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        tf: {
          base: "#0d0f12",
          panel: "#131619",
          elevated: "#1a1e24",
          border: "#252b34",
          accent: "#f97316",
          accentBlue: "#38bdf8",
          text: "#e2e8f0",
          muted: "#64748b",
          success: "#22c55e",
          error: "#ef4444",
          warning: "#eab308",
        },
      },
      fontFamily: {
        sans: ["IBM Plex Sans", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;
