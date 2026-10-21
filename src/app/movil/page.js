'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MessageCircle, Calculator, BarChart2, Package, RefreshCw, WifiOff, Wifi } from 'lucide-react';
import { syncAll, loadOffline, SYNC_TS_KEY } from '@/lib/offlineSync';

const TILES = [
  {
    href: '/consulta',
    icon: MessageCircle,
    label: 'Chat',
    desc: 'Consulta precios por mensaje',
    color: 'bg-primary text-primary-content',
  },
  {
    href: '/movil/calculadora',
    icon: Calculator,
    label: 'Calculadora',
    desc: 'Banda, metraje o pieza',
    color: 'bg-secondary text-secondary-content',
  },
  {
    href: '/movil/tarifas',
    icon: BarChart2,
    label: 'Tarifas',
    desc: 'Precios de material por m²',
    color: 'bg-accent text-accent-content',
  },
  {
    href: '/movil/productos',
    icon: Package,
    label: 'Productos',
    desc: 'Catálogo del almacén',
    color: 'bg-neutral text-neutral-content',
  },
];

export default function MovilHub() {
  const [syncing, setSyncing] = useState(false);
  const [syncTs, setSyncTs] = useState(null);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);

    loadOffline(SYNC_TS_KEY).then(r => r && setSyncTs(r.data?.ts ?? r.ts));

    // Sync automático al abrir si hay red
    if (navigator.onLine) doSync();

    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);

  async function doSync() {
    setSyncing(true);
    try {
      await syncAll();
      const ts = Date.now();
      setSyncTs(ts);
    } finally {
      setSyncing(false);
    }
  }

  const tsLabel = syncTs
    ? new Date(syncTs).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="flex flex-col min-h-screen px-4 py-6 gap-6 max-w-sm mx-auto w-full">

      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold leading-none">CRM Taller</h1>
          <p className="text-xs text-base-content/50 mt-0.5 flex items-center gap-1">
            {online
              ? <><Wifi className="w-3 h-3 text-success" /> En red</>
              : <><WifiOff className="w-3 h-3 text-warning" /> Sin red</>
            }
            {tsLabel && <span className="ml-1">· datos del {tsLabel}</span>}
          </p>
        </div>
        <button
          onClick={doSync}
          disabled={syncing || !online}
          className="btn btn-sm btn-ghost btn-circle"
          title="Sincronizar datos"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tiles */}
      <div className="grid grid-cols-2 gap-4 flex-1">
        {TILES.map(({ href, icon: Icon, label, desc, color }) => (
          <Link
            key={href}
            href={href}
            className={`${color} rounded-2xl p-5 flex flex-col gap-3 active:scale-95 transition-transform shadow-sm`}
          >
            <Icon className="w-8 h-8 opacity-90" />
            <div>
              <p className="font-bold text-base leading-none">{label}</p>
              <p className="text-xs opacity-70 mt-1 leading-snug">{desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {!online && !syncTs && (
        <div className="alert alert-warning text-sm">
          Sin datos guardados. Conéctate a la red del taller para sincronizar.
        </div>
      )}
    </div>
  );
}
