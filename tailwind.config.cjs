/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        panel: "var(--panel)",
        panel2: "var(--panel2)",
        text: "var(--text)",
        muted: "var(--muted)",
        accent: "var(--accent)",
      },
      borderColor: {
        DEFAULT: "var(--border)",
      },
      ringColor: {
        DEFAULT: "var(--ring)",
      },
    },
  },
  plugins: [],
};

