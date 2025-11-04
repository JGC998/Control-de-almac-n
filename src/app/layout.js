"use client";
import { useState } from 'react'; // Importar useState
// import { GeistSans } from 'geist/font/sans'; // <--- ELIMINADO
// import { GeistMono } from 'geist/font/mono'; // <--- ELIMINADO
import './globals.css';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

// const geistSans = GeistSans; // <--- ELIMINADO
// const geistMono = GeistMono; // <--- ELIMINADO

// (No se puede exportar metadata desde un Client Component)

export default function RootLayout({ children }) {
  // --- Estado para controlar el drawer ---
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const toggleDrawer = () => setIsDrawerOpen(prev => !prev);
  // --- FIN AÑADIDO ---

  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body
        // --- MODIFICADO: Eliminadas las variables de fuentes ---
        className={`antialiased min-h-screen`}
      >
        {/* --- Estructura de Drawer de DaisyUI --- */}
        <div className="drawer lg:drawer-open">
          <input 
            id="my-drawer" 
            type="checkbox" 
            className="drawer-toggle" 
            checked={isDrawerOpen} 
            onChange={toggleDrawer} 
          />
          
          {/* Contenido (Header + Página) */}
          <div className="drawer-content flex flex-col h-screen">
            {/* El Header ahora recibe la función para el botón de hamburguesa */}
            <Header toggleDrawer={toggleDrawer} />
            <main className="flex-1 overflow-y-auto p-4 bg-base-100">
              {children}
            </main>
          </div>
          
          {/* Sidebar (Menú lateral) */}
          <div className="drawer-side z-50">
            <label htmlFor="my-drawer" aria-label="close sidebar" className="drawer-overlay"></label>
            {/* El Sidebar ahora es el contenido del drawer */}
            <Sidebar />
          </div>
        </div>
        {/* --- FIN MODIFICACIÓN --- */}
      </body>
    </html>
  );
}
