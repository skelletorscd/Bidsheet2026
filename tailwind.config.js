/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      colors: {
        bg: {
          base: "rgb(var(--bg-base) / <alpha-value>)",
          panel: "rgb(var(--bg-panel) / <alpha-value>)",
          raised: "rgb(var(--bg-raised) / <alpha-value>)",
          hover: "rgb(var(--bg-hover) / <alpha-value>)",
        },
        border: {
          DEFAULT: "rgb(var(--border) / <alpha-value>)",
          subtle: "rgb(var(--border-subtle) / <alpha-value>)",
        },
      },
      keyframes: {
        pulseDot: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        // ── shared celebration helpers ────────────────────────────────
        celebIn: {
          "0%": { opacity: "0", transform: "scale(0.92)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        celebOut: {
          "0%": { opacity: "1", transform: "scale(1)" },
          "100%": { opacity: "0", transform: "scale(0.95)" },
        },
        textPop: {
          "0%": { opacity: "0", transform: "scale(0.4) translateY(40px)" },
          "60%": { opacity: "1", transform: "scale(1.12) translateY(-6px)" },
          "100%": { transform: "scale(1) translateY(0)" },
        },
        screenShake: {
          "0%, 100%": { transform: "translate(0,0)" },
          "20%": { transform: "translate(-12px, 6px)" },
          "40%": { transform: "translate(10px, -4px)" },
          "60%": { transform: "translate(-6px, 3px)" },
          "80%": { transform: "translate(4px, -2px)" },
        },
        // ── moonwalk ─────────────────────────────────────────────────
        moonwalkGlide: {
          "0%": { transform: "translateX(110vw) scaleX(-1)" },
          "100%": { transform: "translateX(-30vw) scaleX(-1)" },
        },
        moonwalkBob: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        floorSlide: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-200px)" },
        },
        // ── rocket ───────────────────────────────────────────────────
        rocketFly: {
          "0%": { transform: "translate(-20vw, 40vh) rotate(-25deg)", opacity: "0" },
          "10%": { opacity: "1" },
          "100%": { transform: "translate(70vw, -70vh) rotate(-25deg)", opacity: "0" },
        },
        trailFade: {
          "0%, 100%": { opacity: "0" },
          "50%": { opacity: "0.8" },
        },
        // ── TNT ──────────────────────────────────────────────────────
        tntDrop: {
          "0%": { transform: "translateY(-80vh) rotate(-18deg)" },
          "70%": { transform: "translateY(10px) rotate(4deg)" },
          "85%": { transform: "translateY(-4px) rotate(-2deg)" },
          "100%": { transform: "translateY(0) rotate(0)" },
        },
        tntShake: {
          "0%, 100%": { transform: "translate(0,0) rotate(0)" },
          "25%": { transform: "translate(-2px, 1px) rotate(-1deg)" },
          "50%": { transform: "translate(2px, -1px) rotate(1deg)" },
          "75%": { transform: "translate(-1px, 2px) rotate(-0.5deg)" },
        },
        fuseBurn: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
        boomRing: {
          "0%": { transform: "scale(0)", opacity: "0.9" },
          "100%": { transform: "scale(6)", opacity: "0" },
        },
        particleBurst: {
          "0%": {
            transform: "translate(0,0) scale(1)",
            opacity: "1",
          },
          "100%": {
            transform: "translate(var(--dx), var(--dy)) scale(0.4)",
            opacity: "0",
          },
        },
        // ── slot machine ─────────────────────────────────────────────
        reelSpin: {
          "0%": { transform: "translateY(0)" },
          "100%": { transform: "translateY(-1200px)" },
        },
        coinFall: {
          "0%": { transform: "translateY(-20px) rotate(0)", opacity: "0" },
          "20%": { opacity: "1" },
          "100%": {
            transform:
              "translateY(var(--fall)) rotate(720deg) translateX(var(--drift))",
            opacity: "0",
          },
        },
        // ── stamp ────────────────────────────────────────────────────
        stampSlam: {
          "0%": {
            transform: "scale(3) rotate(-18deg)",
            opacity: "0",
          },
          "60%": {
            transform: "scale(0.92) rotate(-6deg)",
            opacity: "1",
          },
          "80%": {
            transform: "scale(1.05) rotate(-6deg)",
          },
          "100%": {
            transform: "scale(1) rotate(-6deg)",
            opacity: "1",
          },
        },
        stampRadiate: {
          "0%": { transform: "scale(0.8)", opacity: "0.6" },
          "100%": { transform: "scale(2.4)", opacity: "0" },
        },
      },
      animation: {
        pulseDot: "pulseDot 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
