import ChatConsulta from '@/componentes/compuestos/ChatConsulta';
import Link from 'next/link';
import { MessageCircle } from 'lucide-react';

export const metadata = { title: 'Consulta rápida — CRM Taller' };

export default function ConsultaPage() {
  return (
    <div className="min-h-screen bg-base-100 flex flex-col max-w-lg mx-auto">
      <header className="sticky top-0 z-20 h-12 bg-base-100 border-b border-base-200 flex items-center px-4 gap-2 shrink-0">
        <MessageCircle className="w-4 h-4 text-primary" />
        <span className="font-bold text-sm text-primary">Consulta rápida</span>
        <div className="flex-1" />
        <Link href="/" className="btn btn-ghost btn-xs text-base-content/30 text-xs">
          CRM →
        </Link>
      </header>
      <main className="flex-1 flex flex-col p-4 overflow-hidden" style={{ height: 'calc(100vh - 3rem)' }}>
        <ChatConsulta />
      </main>
    </div>
  );
}
