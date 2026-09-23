"use client";
import { useState, useMemo } from 'react';
import useSWR, { mutate } from 'swr';
import Link from 'next/link';
import { fetcher } from '@/lib/fetcher';
import {
  Package, Plus, Calculator, Trash2, ChevronRight,
  PackageOpen, TrendingUp, Calendar, Clock,
} from 'lucide-react';

function fmtFecha(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtEur(n) {
  if (n == null || isNaN(n)) return null;
  return new Intl.NumberFormat('es-ES', {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
  }).format(n);
}

function contarBobinas(raw) {
  try {
    const arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(arr) ? arr.length : 0;
  } catch { return 0; }
}

function TarjetaImportacion({ imp, onDelete }) {
  const esBorrador = imp.estado === 'BORRADOR';
  const numBobinas = contarBobinas(imp.bobinas);

  // Coste total aproximado: totalBobinasEUR (ya en EUR) + gastosRepercutibles
  const costeEUR = (imp.totalBobinasEUR != null && imp.tasaCambio != null)
    ? imp.totalBobinasEUR * imp.tasaCambio + (imp.gastosRepercutibles || 0)
    : null;

  const titulo = imp.descripcion || imp.numContenedor || imp.numFactura || 'Sin descripción';
  const fecha  = imp.fechaLlegada || imp.creadaEn;

  return (
    <div className={`card border shadow-sm hover:shadow-md hover:border-primary/30 transition-all
      ${esBorrador ? 'bg-warning/5 border-warning/30' : 'bg-base-100 border-base-200'}`}>
      <div className="card-body p-4">
        <div className="flex items-start gap-4">

          {/* Icono */}
          <div className={`rounded-lg p-2 shrink-0 mt-0.5
            ${esBorrador ? 'bg-warning/15 text-warning' : 'bg-primary/10 text-primary'}`}>
            <PackageOpen className="w-5 h-5" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              {esBorrador && (
                <span className="badge badge-sm badge-warning">Borrador</span>
              )}
              <Link
                href={`/compras/contenedores/${imp.id}`}
                className="font-semibold text-sm hover:text-primary transition-colors truncate"
              >
                {titulo}
              </Link>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-base-content/50">
              {imp.proveedor?.nombre && <span>{imp.proveedor.nombre}</span>}
              {imp.numFactura    && <span>Fra. <span className="font-mono">{imp.numFactura}</span></span>}
              {imp.numContenedor && <span><span className="font-mono">{imp.numContenedor}</span></span>}
              {imp.blNumber      && <span>BL <span className="font-mono">{imp.blNumber}</span></span>}
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" /> {fmtFecha(fecha)}
              </span>
            </div>

            {numBobinas > 0 && (
              <p className="text-xs text-base-content/40">
                {numBobinas} {numBobinas === 1 ? 'bobina / referencia' : 'bobinas / referencias'}
              </p>
            )}
          </div>

          {/* Coste + acciones */}
          <div className="shrink-0 text-right space-y-2">
            {costeEUR != null && (
              <p className="text-sm font-bold text-primary tabular-nums">{fmtEur(costeEUR)}</p>
            )}
            <div className="flex gap-1 justify-end">
              <Link
                href={`/herramientas/calculadora-contenedor?cargar=${imp.id}`}
                className="btn btn-xs btn-outline gap-1"
                title="Ver o editar el cálculo de costes"
              >
                <Calculator className="w-3 h-3" /> Ver costes
              </Link>
              <button
                className="btn btn-xs btn-ghost text-error"
                onClick={() => onDelete(imp.id)}
                title="Eliminar importación"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default function ContenedoresPage() {
  const { data: importaciones, isLoading } = useSWR('/api/importaciones', fetcher);
  const [mostrarTodas, setMostrarTodas] = useState(false);

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta importación?')) return;
    await fetch(`/api/importaciones/${id}`, { method: 'DELETE' });
    mutate('/api/importaciones');
  };

  const todas = importaciones ?? [];

  // Previsión del próximo pedido por proveedor
  const previsionPorProveedor = useMemo(() => {
    if (todas.length < 2) return [];
    const grupos = {};
    todas.forEach(imp => {
      const nombre = imp.proveedor?.nombre || 'Sin proveedor';
      if (!grupos[nombre]) grupos[nombre] = [];
      grupos[nombre].push(imp);
    });
    const hoy = new Date();
    return Object.entries(grupos)
      .filter(([, imps]) => imps.length >= 2)
      .map(([nombre, imps]) => {
        // Ordenar por fecha de llegada o creación, ascendente
        const ordenadas = [...imps].sort((a, b) =>
          new Date(a.fechaLlegada || a.creadaEn) - new Date(b.fechaLlegada || b.creadaEn)
        );
        const fechas = ordenadas.map(i => new Date(i.fechaLlegada || i.creadaEn));
        const intervalos = [];
        for (let i = 1; i < fechas.length; i++) {
          intervalos.push((fechas[i] - fechas[i - 1]) / (1000 * 60 * 60 * 24));
        }
        const mediasDias = Math.round(intervalos.reduce((s, v) => s + v, 0) / intervalos.length);
        const ultimaFecha = fechas[fechas.length - 1];
        const proximaFecha = new Date(ultimaFecha.getTime() + mediasDias * 24 * 60 * 60 * 1000);
        const diasRestantes = Math.round((proximaFecha - hoy) / (1000 * 60 * 60 * 24));
        return { nombre, mediasDias, ultimaFecha, proximaFecha, diasRestantes, total: imps.length };
      })
      .sort((a, b) => a.diasRestantes - b.diasRestantes);
  }, [todas]);

  // KPIs
  const currentYear = new Date().getFullYear();
  const esteAnio = todas.filter(i => new Date(i.creadaEn).getFullYear() === currentYear);
  const costeAnual = esteAnio.reduce((s, i) => {
    const c = (i.totalBobinasEUR && i.tasaCambio)
      ? i.totalBobinasEUR * i.tasaCambio + (i.gastosRepercutibles || 0)
      : 0;
    return s + c;
  }, 0);
  const ultimaFecha = todas[0]?.fechaLlegada || todas[0]?.creadaEn;

  // Mostrar las 8 más recientes por defecto, resto bajo "Ver todas"
  const VISIBLE = 8;
  const visibles  = mostrarTodas ? todas : todas.slice(0, VISIBLE);
  const hayMas    = todas.length > VISIBLE;

  return (
    <div className="container mx-auto p-6 max-w-4xl">

      {/* Cabecera */}
      <div className="flex items-start justify-between mb-6 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 rounded-xl p-2.5">
            <Package className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Importaciones</h1>
            <p className="text-sm text-base-content/50">Registro de costes de importación por contenedor</p>
          </div>
        </div>
        <Link href="/herramientas/calculadora-contenedor" className="btn btn-primary btn-sm gap-1.5">
          <Plus className="w-4 h-4" /> Nueva importación
        </Link>
      </div>

      {/* KPIs — solo si hay datos */}
      {todas.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <div className="stat bg-base-100 border border-base-200 rounded-xl p-4 shadow-sm">
            <div className="stat-title text-xs">Total registradas</div>
            <div className="stat-value text-2xl">{todas.length}</div>
            <div className="stat-desc">{esteAnio.length} este año</div>
          </div>
          {costeAnual > 0 && (
            <div className="stat bg-base-100 border border-base-200 rounded-xl p-4 shadow-sm">
              <div className="stat-title text-xs flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Coste acumulado {currentYear}
              </div>
              <div className="stat-value text-xl tabular-nums">{fmtEur(costeAnual)}</div>
              <div className="stat-desc">{esteAnio.length} importaciones</div>
            </div>
          )}
          {ultimaFecha && (
            <div className="stat bg-base-100 border border-base-200 rounded-xl p-4 shadow-sm">
              <div className="stat-title text-xs">Última importación</div>
              <div className="stat-value text-lg font-semibold">{fmtFecha(ultimaFecha)}</div>
              <div className="stat-desc">{todas[0]?.descripcion || todas[0]?.numFactura || ''}</div>
            </div>
          )}
        </div>
      )}

      {/* Previsión próximo pedido */}
      {previsionPorProveedor.length > 0 && (
        <details className="group mb-2">
          <summary className="cursor-pointer flex items-center gap-2 text-sm font-semibold text-base-content/70 hover:text-base-content py-1 select-none">
            <Clock className="w-4 h-4" />
            Previsión del próximo pedido
            <ChevronRight className="w-3.5 h-3.5 ml-auto transition-transform group-open:rotate-90" />
          </summary>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {previsionPorProveedor.map(p => {
              const urgente = p.diasRestantes <= 14;
              const pasado  = p.diasRestantes < 0;
              return (
                <div
                  key={p.nombre}
                  className={`flex items-start gap-3 p-3 rounded-xl border ${
                    pasado  ? 'bg-error/5 border-error/30' :
                    urgente ? 'bg-warning/5 border-warning/30' :
                    'bg-base-100 border-base-200'
                  }`}
                >
                  <div className={`rounded-lg p-1.5 shrink-0 ${
                    pasado ? 'bg-error/15 text-error' : urgente ? 'bg-warning/15 text-warning' : 'bg-base-200 text-base-content/50'
                  }`}>
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{p.nombre}</p>
                    <p className={`text-sm font-bold ${pasado ? 'text-error' : urgente ? 'text-warning' : 'text-base-content'}`}>
                      {pasado
                        ? `Hace ${Math.abs(p.diasRestantes)} días (esperado el ${p.proximaFecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })})`
                        : p.diasRestantes === 0
                        ? 'Hoy'
                        : `En ${p.diasRestantes} días — ${p.proximaFecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}`}
                    </p>
                    <p className="text-xs text-base-content/40">
                      Intervalo medio: {p.mediasDias} días · {p.total} importaciones
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-base-content/30 mt-2">Estimación basada en el intervalo medio entre importaciones por proveedor.</p>
        </details>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-20">
          <span className="loading loading-spinner loading-lg" />
        </div>
      )}

      {/* Estado vacío */}
      {!isLoading && todas.length === 0 && (
        <div className="text-center py-20 text-base-content/30">
          <Package className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium">Sin importaciones registradas</p>
          <p className="text-sm mt-1 mb-6">
            Cuando llegue un contenedor, crea el cálculo de costes desde la calculadora.
          </p>
          <Link href="/herramientas/calculadora-contenedor" className="btn btn-primary gap-2">
            <Plus className="w-4 h-4" /> Registrar primera importación
          </Link>
        </div>
      )}

      {/* Lista */}
      {visibles.length > 0 && (
        <div className="space-y-3">
          {visibles.map(imp => (
            <TarjetaImportacion key={imp.id} imp={imp} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* Ver todas / colapsar */}
      {hayMas && (
        <button
          className="btn btn-ghost btn-sm gap-1 mt-4 w-full text-base-content/50"
          onClick={() => setMostrarTodas(v => !v)}
        >
          <ChevronRight className={`w-4 h-4 transition-transform ${mostrarTodas ? 'rotate-90' : ''}`} />
          {mostrarTodas ? 'Ver menos' : `Ver las ${todas.length - VISIBLE} anteriores`}
        </button>
      )}

    </div>
  );
}
