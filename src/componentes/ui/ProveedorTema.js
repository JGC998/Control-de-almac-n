// components/ThemeProvider.js
"use client";

import { useEffect, useState } from "react";
import { themeChange } from "theme-change";

const DEFAULT_THEME = "forest";

export default function ProveedorTema({ children }) {
    const [theme, setTheme] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem("theme") || DEFAULT_THEME;
        }
        return DEFAULT_THEME;
    });

    // Sincronizar DOM cuando cambia el tema
    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem("theme", theme);
    }, [theme]);

    useEffect(() => {
        themeChange(false);

        // Sincronizar cambios de tema desde otras pestañas
        const handleStorage = (e) => {
            if (e.key === "theme" && e.newValue) {
                setTheme(e.newValue);
            }
        };
        window.addEventListener("storage", handleStorage);
        return () => window.removeEventListener("storage", handleStorage);
    }, []);

    return <>{children}</>;
}
