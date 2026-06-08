"use client";
import { useEffect } from 'react';

// Registra el Service Worker para el modo tablet offline.
// Solo actúa en navegadores que soporten SW (todos los modernos).
export default function RegistrarSW() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Fallo silencioso — el SW es una mejora opcional
      });
    }
  }, []);

  return null;
}
