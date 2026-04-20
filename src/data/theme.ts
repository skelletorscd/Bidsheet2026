export type Theme = "dark" | "light" | "system";

const LS_KEY = "tlf:theme:v1";

export function loadTheme(): Theme {
  try {
    const v = localStorage.getItem(LS_KEY);
    if (v === "dark" || v === "light" || v === "system") return v;
  } catch {
    // ignore
  }
  return "system";
}

export function saveTheme(theme: Theme): void {
  try {
    localStorage.setItem(LS_KEY, theme);
  } catch {
    // ignore
  }
}

export function resolveTheme(theme: Theme): "dark" | "light" {
  if (theme !== "system") return theme;
  const prefersLight =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: light)").matches;
  return prefersLight ? "light" : "dark";
}

export function applyTheme(theme: Theme): void {
  const resolved = resolveTheme(theme);
  const root = document.documentElement;
  if (resolved === "light") {
    root.classList.add("light");
    root.classList.remove("dark");
  } else {
    root.classList.add("dark");
    root.classList.remove("light");
  }
}
