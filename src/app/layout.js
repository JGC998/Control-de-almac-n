"use client";
import './globals.css';
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
  return (
    <html lang="es" data-theme="corporate" suppressHydrationWarning={true}>
      <body className="antialiased min-h-screen bg-base-100">
        <SWRConfig
          value={{
            fetcher,
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            dedupingInterval: 5000,
            keepPreviousData: true,
            provider: () => new Map()
          }}
        >
          <div className="flex flex-col min-h-screen">
            <Encabezado />
            <main className="flex-1 p-4 lg:p-6">
              {children}
            </main>
          </div>
        </SWRConfig>
      </body>
    </html>
  );
}
