"use client";
import { Menu } from 'lucide-react';
import SearchBar from './SearchBar';
// import Chatbot from './Chatbot'; // <-- ELIMINADO

// Acepta 'toggleDrawer' como prop
export default function Header({ toggleDrawer }) {
  return (
    <header className="sticky top-0 z-10 w-full bg-base-100 shadow-md">
      <div className="navbar px-4">
        {/* --- Botón de Hamburguesa (solo visible en móvil) --- */}
        <div className="flex-none lg:hidden">
          <button
            className="btn btn-square btn-ghost"
            onClick={toggleDrawer}
            aria-label="open sidebar"
          >
            <Menu />
          </button>
        </div>
        
        {/* Título (visible en móvil, oculto en desktop) */}
        <div className="flex-1 lg:hidden">
          <a className="btn btn-ghost text-xl normal-case">CRM Taller</a>
        </div>

        {/* SearchBar (visible en desktop, oculto en móvil) */}
        <div className="flex-1 hidden lg:flex">
          <SearchBar />
        </div>
        
        {/* --- Chatbot (ELIMINADO) --- */}
        {/*
        <div className="flex-none">
          <Chatbot />
        </div>
        */}
      </div>
    </header>
  );
}
