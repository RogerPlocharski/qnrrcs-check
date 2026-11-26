import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

const THEME_KEY = "qnrcs-theme";

type Theme = "light" | "dark";

/**
 * Interruptor de tema claro/escuro.
 *
 * O styles.css já definia o bloco `.dark` completo — incluindo os níveis de
 * maturidade — mas nada alternava a classe, pelo que o tema escuro era código
 * morto. A preferência guardada ganha ao sistema; sem preferência guardada,
 * segue `prefers-color-scheme`.
 *
 * Renderiza um espaço reservado até montar: no servidor não há forma de saber o
 * tema do visitante, e devolver marcação diferente da do cliente provocaria um
 * erro de hidratação.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY);
    const initial: Theme =
      stored === "dark" || stored === "light"
        ? stored
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    setTheme(initial);
  }, []);

  useEffect(() => {
    if (!theme) return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* modo privado: o tema aplica-se à mesma, só não persiste */
    }
  }, [theme]);

  if (!theme) return <div className="h-8 w-8" aria-hidden="true" />;

  const next = theme === "dark" ? "light" : "dark";
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={() => setTheme(next)}
      aria-label={next === "dark" ? "Mudar para tema escuro" : "Mudar para tema claro"}
      title={next === "dark" ? "Tema escuro" : "Tema claro"}
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Moon className="h-4 w-4" aria-hidden="true" />
      )}
    </Button>
  );
}
