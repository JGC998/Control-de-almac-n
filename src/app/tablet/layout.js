import Link from 'next/link';

export const metadata = { title: 'Tablet — CRM Taller' };

export default function TabletLayout({ children }) {
  return (
    <div className="min-h-screen bg-base-200" data-theme="corporate">
      <header className="navbar bg-base-100 shadow-sm px-4 border-b border-base-300">
        <div className="flex-1">
          <Link href="/tablet" className="text-xl font-bold text-primary">
            🏭 Taller — Consulta
          </Link>
        </div>
        <div className="flex-none">
          <Link href="/" className="btn btn-ghost btn-sm text-base-content/50">
            Ir al CRM →
          </Link>
        </div>
      </header>
      <main className="p-4 max-w-5xl mx-auto">
        {children}
      </main>
    </div>
  );
}
