import { useEffect, useState } from "react";
import { applyTheme, getStoredTheme, setStoredTheme, type Theme } from "../theme";

function Icon({ theme }: { theme: Theme }) {
  if (theme === "dark") {
    return (
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        aria-hidden="true"
        className="text-muted"
      >
        <path
          fill="currentColor"
          d="M12 18a6 6 0 0 0 5.7-7.8A7.5 7.5 0 0 1 9.8 2.3 6 6 0 0 0 12 18Z"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
      className="text-muted"
    >
      <path
        fill="currentColor"
        d="M12 18a6 6 0 1 1 0-12 6 6 0 0 1 0 12Zm0-16h1v3h-1V2Zm0 17h1v3h-1v-3ZM2 11h3v1H2v-1Zm17 0h3v1h-3v-1ZM4.2 4.9l2.1 2.1-.7.7-2.1-2.1.7-.7Zm14.3 14.3 2.1 2.1-.7.7-2.1-2.1.7-.7ZM18.6 5.6l.7.7-2.1 2.1-.7-.7 2.1-2.1ZM5.6 18.6l.7.7-2.1 2.1-.7-.7 2.1-2.1Z"
      />
    </svg>
  );
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = getStoredTheme();
    if (stored) return stored;
    const isDark = document.documentElement.classList.contains("dark");
    return isDark ? "dark" : "light";
  });

  useEffect(() => {
    applyTheme(theme);
    setStoredTheme(theme);
  }, [theme]);

  const nextTheme: Theme = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(nextTheme)}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border bg-panel hover:bg-panel2 surface"
      aria-label={`Switch to ${nextTheme} mode`}
      title={`Switch to ${nextTheme} mode`}
    >
      <Icon theme={nextTheme} />
    </button>
  );
}
