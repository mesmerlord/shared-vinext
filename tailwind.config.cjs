// QUIRK: this file MUST be .cjs (NOT .ts or .js) because package.json is
// "type": "module". ESM versions break under Vite 8. Same for postcss.config.cjs.
// See canonical.md Topic 1 / Topic 6.
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // PushPad palette per design.md — warm-black + cream + vermilion.
        ink: {
          DEFAULT: "#0E0B08",
          2: "#15110D",
          3: "#1E1813",
        },
        paper: {
          DEFAULT: "#F4EADA",
          2: "#E9DDC6",
          3: "#D9CAAE",
        },
        vermilion: {
          DEFAULT: "#FF3B1F",
          d: "#D72407",
        },
        saffron: "#F5A524",
        leaf: "#6FB36A",
      },
      fontFamily: {
        // QUIRK per design.md: Fraunces optical-size axis is load-bearing.
        // Display headlines collapse without it. The Google Fonts URL in
        // globals.css must keep the opsz axis.
        display: ["Fraunces", "Times New Roman", "serif"],
        body: ["'Inter Tight'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
      maxWidth: {
        wrap: "1440px",
        read: "64ch",
        form: "560px",
      },
      letterSpacing: {
        tightest: "-0.06em",
        tighter: "-0.045em",
        tight: "-0.035em",
        mono: "0.18em",
        "mono-loud": "0.34em",
        kicker: "0.22em",
      },
      keyframes: {
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.45" },
        },
        ticker: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
      },
      animation: {
        // QUIRK per design.md: 2.4s on the nav-dot pulse — slower than typical.
        // Faster reads as anxious.
        pulse: "pulse 2.4s ease-in-out infinite",
        ticker: "ticker 60s linear infinite",
      },
    },
  },
  plugins: [],
};
