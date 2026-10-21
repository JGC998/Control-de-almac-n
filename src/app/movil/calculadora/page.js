'use client';
import Link from 'next/link';
import { ArrowLeft, Layers, Ruler } from 'lucide-react';

export default function MovilCalculadoraPage() {
  return (
    <div className="flex flex-col min-h-screen px-4 py-6 gap-6 max-w-sm mx-auto w-full">
      <div className="flex items-center gap-3">
        <Link href="/movil" className="btn btn-ghost btn-sm btn-circle">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-lg font-bold">Calculadora</h1>
      </div>

      <div className="flex flex-col gap-4">
        <Link
          href="/ventas/calculadora-bandas"
          className="card bg-primary text-primary-content shadow-sm active:scale-95 transition-transform"
        >
          <div className="card-body flex-row items-center gap-4 py-5">
            <Layers className="w-8 h-8 shrink-0 opacity-90" />
            <div>
              <p className="font-bold text-base">Banda PVC</p>
              <p className="text-xs opacity-70 mt-0.5">Espesor, confección, dimensiones</p>
            </div>
          </div>
        </Link>

        <Link
          href="/ventas/calculadora-metrajes"
          className="card bg-secondary text-secondary-content shadow-sm active:scale-95 transition-transform"
        >
          <div className="card-body flex-row items-center gap-4 py-5">
            <Ruler className="w-8 h-8 shrink-0 opacity-90" />
            <div>
              <p className="font-bold text-base">Metraje</p>
              <p className="text-xs opacity-70 mt-0.5">Metros lineales de cualquier material</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
