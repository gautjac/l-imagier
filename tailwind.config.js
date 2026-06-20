/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // L'Imagier — a darkroom light-table. Warm graphite chrome that recedes,
        // a luminous bone "light-table" surface, and a single sodium-amber accent
        // (the safelight glow) with a cool cyan counter-accent (the throughline).
        slate: {
          DEFAULT: "#16130f",
          950: "#100d0a",
          900: "#16130f",
          800: "#211c16",
          700: "#2e2820",
          600: "#3d362c",
          500: "#574e40",
          400: "#7a6f5d",
        },
        bone: {
          DEFAULT: "#f4efe6",
          light: "#fbf8f1",
          pale: "#fdfcf8",
          dim: "#e9e1d4",
          shade: "#e4dccb",
          vein: "#d3c8b3",
        },
        ink: {
          DEFAULT: "#1c1813",
          soft: "#4e463a",
          faint: "#8a7e6c",
          inverse: "#f4efe6",
        },
        amber: {
          DEFAULT: "#e8893b",
          deep: "#c96a23",
          soft: "#f2a866",
          glow: "#ffc78a",
        },
        cyan: {
          DEFAULT: "#3aa6a0",
          deep: "#2a807b",
          soft: "#62c2bc",
        },
      },
      fontFamily: {
        display: ['"Fraunces"', "Georgia", "serif"],
        serif: ['"Fraunces"', "Georgia", "serif"],
        sans: ['"Archivo"', "system-ui", "sans-serif"],
        mono: ['"Space Mono"', "ui-monospace", "monospace"],
      },
      boxShadow: {
        plate: "0 1px 2px rgba(20,16,12,0.10), 0 10px 30px -14px rgba(20,16,12,0.45)",
        "plate-lg": "0 2px 6px rgba(20,16,12,0.14), 0 24px 60px -22px rgba(20,16,12,0.55)",
        safelight: "0 0 0 1px rgba(232,137,59,0.55), 0 0 28px -4px rgba(232,137,59,0.45)",
        throughline: "0 0 0 1px rgba(58,166,160,0.5), 0 0 30px -4px rgba(58,166,160,0.4)",
        inset: "inset 0 1px 0 rgba(255,255,255,0.5)",
      },
      backgroundImage: {
        contact:
          "linear-gradient(rgba(20,16,12,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(20,16,12,0.025) 1px, transparent 1px)",
      },
      backgroundSize: {
        contact: "26px 26px",
      },
      keyframes: {
        riseIn: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        pop: {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        glow: {
          "0%, 100%": { opacity: "0.55" },
          "50%": { opacity: "1" },
        },
        develop: {
          "0%": { opacity: "0", filter: "blur(6px) saturate(0.4)" },
          "100%": { opacity: "1", filter: "blur(0) saturate(1)" },
        },
        sweep: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        riseIn: "riseIn 0.5s ease-out both",
        fadeIn: "fadeIn 0.6s ease-out both",
        pop: "pop 0.35s cubic-bezier(0.34,1.56,0.64,1) both",
        glow: "glow 2.4s ease-in-out infinite",
        develop: "develop 0.7s ease-out both",
        sweep: "sweep 1.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
