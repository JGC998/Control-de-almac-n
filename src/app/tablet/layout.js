import Link from 'next/link';
import { Monitor } from 'lucide-react';
import RegistrarSW from '@/componentes/ui/RegistrarSW';

export const metadata = { title: 'Taller' };

export default function TabletLayout({ children }) {
  return (
    <div className="min-h-screen bg-base-100" data-theme="corporate">
      <RegistrarSW />
      <header className="sticky top-0 z-30 h-12 bg-base-100 border-b border-base-200 flex items-center px-4 gap-2">
        <Link href="/tablet" className="font-bold text-primary text-sm tracking-tight">
          CRM Taller
        </Link>
        <div className="flex-1" />
        <Link
          href="/tablet/quiosco"
          className="btn btn-ghost btn-xs gap-1.5 text-base-content/50 hover:text-primary"
        >
          <Monitor className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-xs">Quiosco</span>
        </Link>
        <Link href="/" className="btn btn-ghost btn-xs text-base-content/30 hover:text-base-content/60 text-xs">
          Escritorio
        </Link>
      </header>
      <main>
        {children}
      </main>
    </div>
  );
}
