"use client";
import { useState } from 'react';
import './globals.css';
import BarraLateral from '@/componentes/layout/BarraLateral';
import Encabezado from '@/componentes/layout/Encabezado';
import { SWRConfig } from 'swr';

const fetcher = async (url) => {
  const res = await fetch(url);
  if (!res.ok) {
    const err = new Error('Error en la respuesta del servidor');
    err.status = res.status;
    try { err.info = await res.json(); } catch {}
    throw err;
  }
  return res.json();
};

export default function RootLayout({ children }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const toggleDrawer = () => setIsDrawerOpen(prev => !prev);

  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body className={`antialiased min-h-screen`}>
        <SWRConfig
          value={{
            fetcher,
            revalidateOnFocus: false, // Evitar recargas al cambiar de ventana para reducir carga
            revalidateOnReconnect: true,
            dedupingInterval: 5000, // Evitar peticiones duplicadas en 5s
            keepPreviousData: true, // Mantener datos mientras se recarga
            provider: () => new Map()
          }}
        >
          <div className="drawer lg:drawer-open">
            <input
              id="my-drawer"
              type="checkbox"
              className="drawer-toggle"
              checked={isDrawerOpen}
              onChange={toggleDrawer}
            />

            <div className="drawer-content flex flex-col h-screen">
              <Encabezado toggleDrawer={toggleDrawer} />
              <main className="flex-1 overflow-y-auto p-4 bg-base-100">
                {children}
              </main>
            </div>

            <div className="drawer-side z-50">
              <label htmlFor="my-drawer" aria-label="close sidebar" className="drawer-overlay"></label>
              <BarraLateral />
            </div>
          </div>
        </SWRConfig>
      </body>
    </html>
  );
}
