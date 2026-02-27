import { createContext, useMemo, useState, useEffect } from "react";
import { ThemeProvider as MuiThemeProvider } from "@mui/material";
import { buildTheme, AVAILABLE_THEMES, DEFAULT_THEME } from "./themes";
import { setThemeColor } from "../pwa/themeMeta";

export const ThemeModeContext = createContext(null);

export default function ThemeProvider({ children }) {
  const storedTheme = localStorage.getItem("theme");
  const storedCustomColor = localStorage.getItem("theme_custom_color");
  const initialTheme = AVAILABLE_THEMES.includes(storedTheme)
    ? storedTheme
    : storedTheme === "custom"
      ? "custom"
    : DEFAULT_THEME;
  const [mode, setMode] = useState(initialTheme);
  const [customColor, setCustomColor] = useState(storedCustomColor || "#4f46e5");

  const theme = useMemo(() => buildTheme(mode, customColor), [mode, customColor]);

  useEffect(() => {
    localStorage.setItem("theme", mode);
    if (mode === "custom") {
      localStorage.setItem("theme_custom_color", customColor);
    }
    setThemeColor(theme.palette.background.default);
  }, [mode, theme, customColor]);

  return (
    <ThemeModeContext.Provider value={{ mode, setMode, themes: AVAILABLE_THEMES, customColor, setCustomColor }}>
      <MuiThemeProvider theme={theme}>
        {children}
      </MuiThemeProvider>
    </ThemeModeContext.Provider>
  );
}
