import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ThemeMode = "light" | "dark" | "system";
export type AccentColor = "neutral" | "red" | "blue" | "green" | "yellow" | "purple" | "orange";

export const ACCENT_OPTIONS: { value: AccentColor; label: string; swatch: string }[] = [
  { value: "neutral", label: "Preto & Branco", swatch: "#E7E4D9" },
  { value: "green", label: "Verde", swatch: "#00C853" },
  { value: "red", label: "Vermelho", swatch: "#E5484D" },
  { value: "blue", label: "Azul", swatch: "#3B82F6" },
  { value: "yellow", label: "Dourado", swatch: "#F5C518" },
  { value: "purple", label: "Roxo", swatch: "#8B5CF6" },
  { value: "orange", label: "Laranja", swatch: "#F97316" },
];

type Ctx = {
  mode: ThemeMode;
  accent: AccentColor;
  setMode: (m: ThemeMode) => void;
  setAccent: (a: AccentColor) => void;
};

const ThemeCtx = createContext<Ctx | null>(null);

function applyTheme(mode: ThemeMode, accent: AccentColor) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const effective =
    mode === "system"
      ? window.matchMedia("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark"
      : mode;
  root.classList.remove("light", "dark");
  root.classList.add(effective);

  // accent classes
  root.classList.forEach((c) => {
    if (c.startsWith("accent-")) root.classList.remove(c);
  });
  root.classList.add(`accent-${accent}`);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("dark");
  const [accent, setAccentState] = useState<AccentColor>("green");
  const [hydrated, setHydrated] = useState(false);

  // Load from localStorage first, then from profile if logged in
  useEffect(() => {
    try {
      const m = (localStorage.getItem("ludi:mode") as ThemeMode) || "dark";
      const a = (localStorage.getItem("ludi:accent") as AccentColor) || "green";
      setModeState(m);
      setAccentState(a);
      applyTheme(m, a);
    } catch {
      applyTheme("dark", "green");
    }
    setHydrated(true);

    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      const { data: prof } = await supabase
        .from("profiles")
        .select("theme_mode, accent_color")
        .eq("id", data.user.id)
        .maybeSingle();
      const p = prof as { theme_mode?: ThemeMode; accent_color?: AccentColor } | null;
      if (p?.theme_mode) {
        setModeState(p.theme_mode);
        localStorage.setItem("ludi:mode", p.theme_mode);
      }
      if (p?.accent_color) {
        setAccentState(p.accent_color);
        localStorage.setItem("ludi:accent", p.accent_color);
      }
      if (p?.theme_mode || p?.accent_color) {
        applyTheme(p?.theme_mode ?? mode, p?.accent_color ?? accent);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // React to system color-scheme changes when in "system" mode
  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const handler = () => applyTheme(mode, accent);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mode, accent]);

  async function persist(next: { mode?: ThemeMode; accent?: AccentColor }) {
    const nMode = next.mode ?? mode;
    const nAccent = next.accent ?? accent;
    try {
      localStorage.setItem("ludi:mode", nMode);
      localStorage.setItem("ludi:accent", nAccent);
    } catch {
      /* ignore */
    }
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      await supabase
        .from("profiles")
        .update({ theme_mode: nMode, accent_color: nAccent })
        .eq("id", data.user.id);
    }
  }

  function setMode(m: ThemeMode) {
    setModeState(m);
    applyTheme(m, accent);
    void persist({ mode: m });
  }
  function setAccent(a: AccentColor) {
    setAccentState(a);
    applyTheme(mode, a);
    void persist({ accent: a });
  }

  return (
    <ThemeCtx.Provider value={{ mode, accent, setMode, setAccent }}>
      <div style={{ visibility: hydrated ? "visible" : "visible" }}>{children}</div>
    </ThemeCtx.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
