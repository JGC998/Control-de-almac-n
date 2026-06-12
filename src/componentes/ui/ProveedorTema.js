// components/ThemeProvider.js
"use client";

import { useEffect, useState } from "react";
import { themeChange } from "theme-change";

// FE-07: debe coincidir con data-theme="corporate" en layout.js para evitar FOUC
const DEFAULT_THEME = "corporate";

export default function ProveedorTema({ children }) {
    const [theme, setTheme] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem("crm-tema") || DEFAULT_THEME;
        }
        return DEFAULT_THEME;
    });

    // Sincronizar DOM cuando cambia el tema
    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem("crm-tema", theme);
    }, [theme]);

    useEffect(() => {
        themeChange(false);

        // Sincronizar cambios de tema desde otras pestañas
        const handleStorage = (e) => {
            if (e.key === "crm-tema" && e.newValue) {
                setTheme(e.newValue);
            }
        };
        window.addEventListener("storage", handleStorage);
        return () => window.removeEventListener("storage", handleStorage);
    }, []);

    return <>{children}</>;
}
