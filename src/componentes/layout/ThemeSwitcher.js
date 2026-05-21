"use client";
import { useState, useEffect } from 'react';
import { Palette, Check } from 'lucide-react';

const TEMAS = [
  {
    id: 'dim',
    nombre: 'Dim',
    descripcion: 'Dark suave · violeta',
    base: '#2a303c',
    primary: '#7480ff',
    accent: '#f3cc30',
  },
  {
    id: 'night',
    nombre: 'Night',
    descripcion: 'Dark puro · cian',
    base: '#1d232a',
    primary: '#1fb2a5',
    accent: '#e879f9',
  },
  {
    id: 'dracula',
    nombre: 'Dracula',
    descripcion: 'Dark intenso · rosa',
    base: '#282a36',
    primary: '#ff79c6',
    accent: '#bd93f9',
  },
  {
    id: 'corporate',
    nombre: 'Corporate',
    descripcion: 'Claro · azul profesional',
    base: '#ffffff',
    primary: '#4b6bfb',
    accent: '#67cba0',
  },
  {
    id: 'nord',
    nombre: 'Nord',
    descripcion: 'Claro · nórdico frío',
    base: '#eceff4',
    primary: '#5e81ac',
    accent: '#8fbcbb',
  },
];

export default function ThemeSwitcher() {
  const [tema, setTema] = useState(() =>
    typeof window !== 'undefined' ? (localStorage.getItem('crm-tema') || 'corporate') : 'corporate'
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', tema);
  }, [tema]);

  function cambiar(id) {
    setTema(id);
    localStorage.setItem('crm-tema', id);
  }

  const actual = TEMAS.find(t => t.id === tema);

  return (
    <div className="dropdown dropdown-bottom dropdown-end">
      <div tabIndex={0} role="button" className="btn btn-ghost btn-sm gap-1.5" title="Cambiar tema">
        <Palette className="w-4 h-4" />
        <span className="hidden md:inline text-xs font-medium">{actual?.nombre}</span>
      </div>
      <ul
        tabIndex={0}
        className="dropdown-content bg-base-200 rounded-box z-50 w-60 p-2 shadow-xl border border-base-300 mt-1 flex flex-col gap-0.5"
      >
        <li className="text-xs text-base-content/40 px-3 py-1 font-semibold uppercase tracking-wider">
          Tema visual
        </li>
        {TEMAS.map(t => (
          <li key={t.id}>
            <button
              onClick={() => cambiar(t.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
                ${tema === t.id
                  ? 'bg-primary/15 text-primary font-medium'
                  : 'hover:bg-base-300 text-base-content'
                }`}
            >
              {/* Swatches de color */}
              <span className="flex gap-1 shrink-0">
                <span className="w-4 h-4 rounded-full border border-base-content/10 shadow-sm" style={{ background: t.base }} />
                <span className="w-4 h-4 rounded-full border border-base-content/10 shadow-sm" style={{ background: t.primary }} />
                <span className="w-4 h-4 rounded-full border border-base-content/10 shadow-sm" style={{ background: t.accent }} />
              </span>

              <span className="flex-1 text-left">
                <span className="block leading-tight">{t.nombre}</span>
                <span className="block text-xs opacity-50 font-normal leading-tight">{t.descripcion}</span>
              </span>

              {tema === t.id && <Check className="w-3.5 h-3.5 shrink-0" />}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
