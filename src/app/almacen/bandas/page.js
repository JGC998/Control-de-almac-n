"use client";
import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { Layers, Search, ArrowRight, Trash2, Package, FilterX, PlusCircle } from 'lucide-react';
import { formatCurrency, formatWeight } from '@/utils/utilidades';
import { mutate } from 'swr';

// ─── Helpers de nomenclatura ──────────────────────────────────────────────────

function parseConf(nombre) {
  if (!nombre) return null;
  if (/-SF-/.test(nombre) || nombre.includes('Sin Fin')) return 'SF';
  if (/-GR-/.test(nombre) || nombre.includes('Con Grapa')) return 'GR';
  if (/-AB-/.test(nombre) || nombre.includes('Abierta')) return 'AB';
  return null;
}

function parseTacos(nombre) {
  if (!nombre) return null;
  const m = nombre.match(/-T([RI])(\d+)/);
  return m ? { tipo: m[1], altura: parseInt(m[2], 10) } : null;
}

const CONF_LABEL = { SF: 'Sin Fin (SF)', GR: 'Con Grapa (GR)', AB: 'Abierta (AB)' };
const TACO_LABEL = { R: 'Rectos (TR)', I: 'Inclinados (TI)' };

// ─── Hook de filtros en cascada ───────────────────────────────────────────────

function useCascade(bandas) {
  const [filtroEspesor,  setFiltroEspesorRaw]  = useState('');
  const [filtroColor,    setFiltroColorRaw]     = useState('');
  const [filtroConf,     setFiltroConfRaw]      = useState('');
  const [filtroTacos,    setFiltroTacosRaw]     = useState('');
  const [filtroTipoTaco, setFiltroTipoTacoRaw]  = useState('');
  const [filtroAncho,    setFiltroAnchoRaw]     = useState('');
  const [filtroLargo,    setFiltroLargoRaw]     = useState('');

  const setFiltroEspesor  = v => { setFiltroEspesorRaw(v);  setFiltroColorRaw('');    setFiltroConfRaw('');    setFiltroTacosRaw('');    setFiltroTipoTacoRaw(''); setFiltroAnchoRaw(''); setFiltroLargoRaw(''); };
  const setFiltroColor    = v => { setFiltroColorRaw(v);    setFiltroConfRaw('');    setFiltroTacosRaw('');    setFiltroTipoTacoRaw(''); setFiltroAnchoRaw(''); setFiltroLargoRaw(''); };
  const setFiltroConf     = v => { setFiltroConfRaw(v);     setFiltroTacosRaw('');    setFiltroTipoTacoRaw(''); setFiltroAnchoRaw(''); setFiltroLargoRaw(''); };
  const setFiltroTacos    = v => { setFiltroTacosRaw(v);    setFiltroTipoTacoRaw(''); setFiltroAnchoRaw(''); setFiltroLargoRaw(''); };
  const setFiltroTipoTaco = v => { setFiltroTipoTacoRaw(v); setFiltroAnchoRaw(''); setFiltroLargoRaw(''); };
  const setFiltroAncho    = v => { setFiltroAnchoRaw(v);    setFiltroLargoRaw(''); };
  const setFiltroLargo    = v => { setFiltroLargoRaw(v); };
  const resetAll          = () => setFiltroEspesor('');

  // Nivel 1 — por espesor
  const espsDisp = useMemo(() =>
    [...new Set(bandas.map(b => b.espesor).filter(v => v != null))].sort((a, b) => a - b),
  [bandas]);

  const b1 = useMemo(() =>
    filtroEspesor ? bandas.filter(b => String(b.espesor) === filtroEspesor) : bandas,
  [bandas, filtroEspesor]);

  // Nivel 2 — por color
  const colsDisp = useMemo(() =>
    [...new Set(b1.map(b => b.color).filter(Boolean))].sort(),
  [b1]);

  const b2 = useMemo(() =>
    filtroColor ? b1.filter(b => b.color === filtroColor) : b1,
  [b1, filtroColor]);

  // Nivel 3 — por confección
  const confsDisp = useMemo(() =>
    [...new Set(b2.map(b => parseConf(b.nombre)).filter(Boolean))].sort(),
  [b2]);

  const b3 = useMemo(() =>
    filtroConf ? b2.filter(b => parseConf(b.nombre) === filtroConf) : b2,
  [b2, filtroConf]);

  // Nivel 4 — tacos
  const { hayConTacos, haySinTacos } = useMemo(() => ({
    hayConTacos: b3.some(b => !!parseTacos(b.nombre)),
    haySinTacos: b3.some(b => !parseTacos(b.nombre)),
  }), [b3]);

  const b4 = useMemo(() => {
    if (!filtroTacos) return b3;
    return b3.filter(b => filtroTacos === 'si' ? !!parseTacos(b.nombre) : !parseTacos(b.nombre));
  }, [b3, filtroTacos]);

  // Nivel 5 — tipo de taco
  const tiposTacosDisp = useMemo(() =>
    [...new Set(b4.map(b => parseTacos(b.nombre)?.tipo).filter(Boolean))].sort(),
  [b4]);

  const b5 = useMemo(() =>
    filtroTipoTaco ? b4.filter(b => parseTacos(b.nombre)?.tipo === filtroTipoTaco) : b4,
  [b4, filtroTipoTaco]);

  // Nivel 6 — ancho
  const anchosDisp = useMemo(() =>
    [...new Set(b5.map(b => b.ancho).filter(v => v != null))].sort((a, b) => a - b),
  [b5]);

  const b6 = useMemo(() =>
    filtroAncho ? b5.filter(b => String(b.ancho) === filtroAncho) : b5,
  [b5, filtroAncho]);

  // Nivel 7 — largo
  const largosDisp = useMemo(() =>
    [...new Set(b6.map(b => b.largo).filter(v => v != null))].sort((a, b) => a - b),
  [b6]);

  const resultado = useMemo(() =>
    filtroLargo ? b6.filter(b => String(b.largo) === filtroLargo) : b6,
  [b6, filtroLargo]);

  const hayFiltrosActivos = !!(filtroEspesor || filtroColor || filtroConf || filtroTacos || filtroTipoTaco || filtroAncho || filtroLargo);

  return {
    filtroEspesor, filtroColor, filtroConf, filtroTacos, filtroTipoTaco, filtroAncho, filtroLargo,
    setFiltroEspesor, setFiltroColor, setFiltroConf, setFiltroTacos, setFiltroTipoTaco, setFiltroAncho, setFiltroLargo,
    espsDisp, colsDisp, confsDisp, hayConTacos, haySinTacos, tiposTacosDisp, anchosDisp, largosDisp,
    resultado, resetAll, hayFiltrosActivos,
  };
}

// ─── Select con label ─────────────────────────────────────────────────────────

function FiltroSelect({ label, value, onChange, options, placeholder = 'Todos', disabled = false }) {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-xs font-medium text-base-content/50 pl-0.5">{label}</label>
      <select
        className="select select-bordered select-sm w-full"
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
      >
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function BandasPVCPage() {
  const [busqueda, setBusqueda] = useState('');
  const { data, isLoading, error } = useSWR('/api/productos?q=BANDA_PVC&limit=500');
  const bandas = useMemo(() => {
    const arr = data?.data ?? data ?? [];
    return Array.isArray(arr) ? arr.filter(p => p.referenciaFabricante === 'BANDA_PVC') : [];
  }, [data]);

  const cascade = useCascade(bandas);

  // Búsqueda de texto encima del resultado en cascada
  const filtradas = useMemo(() => {
    if (!busqueda.trim()) return cascade.resultado;
    const q = busqueda.toLowerCase();
    return cascade.resultado.filter(b =>
      b.nombre?.toLowerCase().includes(q) ||
      b.color?.toLowerCase().includes(q) ||
      String(b.espesor ?? '').includes(q)
    );
  }, [cascade.resultado, busqueda]);

  const handleEliminar = async (id, nombre) => {
    if (!confirm(`¿Eliminar la banda "${nombre}"?`)) return;
    await fetch(`/api/productos/${id}`, { method: 'DELETE' });
    mutate('/api/productos?q=BANDA_PVC&limit=500');
  };

  const hayFiltros = cascade.hayFiltrosActivos || busqueda.trim();

  return (
    <div className="container mx-auto p-4 max-w-5xl">
      {/* Cabecera */}
      <div className="flex items-center gap-3 mb-2">
        <Link href="/almacen" className="btn btn-ghost btn-sm btn-circle">
          <ArrowRight className="w-4 h-4 rotate-180" />
        </Link>
        <Layers className="w-7 h-7 text-info" />
        <h1 className="text-3xl font-bold">Bandas PVC guardadas</h1>
        <div className="flex-1" />
        <Link href="/calculadora/bandas" className="btn btn-primary btn-sm gap-2">
          <PlusCircle className="w-4 h-4" /> Nueva banda
        </Link>
      </div>
      <p className="text-sm text-base-content/50 mb-6 ml-14">
        Bandas calculadas y guardadas desde la calculadora. Haz clic en una para ver todos sus datos.
      </p>

      {/* ─── Filtros en cascada ─────────────────────────────── */}
      <div className="bg-base-200 rounded-xl p-3 mb-4 space-y-2">
        {/* Fila 1: espesor · color · confección */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <FiltroSelect
            label="Espesor"
            value={cascade.filtroEspesor}
            onChange={cascade.setFiltroEspesor}
            placeholder="Todos los espesores"
            options={cascade.espsDisp.map(e => ({ value: String(e), label: `${e} mm` }))}
          />
          <FiltroSelect
            label="Color"
            value={cascade.filtroColor}
            onChange={cascade.setFiltroColor}
            placeholder={cascade.filtroEspesor ? 'Todos los colores' : '— elige espesor primero —'}
            disabled={!cascade.filtroEspesor || cascade.colsDisp.length === 0}
            options={cascade.colsDisp.map(c => ({ value: c, label: c }))}
          />
          <FiltroSelect
            label="Confección"
            value={cascade.filtroConf}
            onChange={cascade.setFiltroConf}
            placeholder={cascade.filtroColor ? 'Todos los tipos' : '— elige color primero —'}
            disabled={!cascade.filtroColor || cascade.confsDisp.length === 0}
            options={cascade.confsDisp.map(c => ({ value: c, label: CONF_LABEL[c] ?? c }))}
          />
        </div>

        {/* Fila 2: tacos · tipo taco · ancho · largo */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <FiltroSelect
            label="¿Lleva tacos?"
            value={cascade.filtroTacos}
            onChange={cascade.setFiltroTacos}
            placeholder={cascade.filtroConf ? 'Indiferente' : '— elige confección —'}
            disabled={!cascade.filtroConf}
            options={[
              ...(cascade.hayConTacos ? [{ value: 'si', label: 'Con tacos' }]  : []),
              ...(cascade.haySinTacos ? [{ value: 'no', label: 'Sin tacos' }]  : []),
            ]}
          />
          <FiltroSelect
            label="Tipo de taco"
            value={cascade.filtroTipoTaco}
            onChange={cascade.setFiltroTipoTaco}
            placeholder={cascade.filtroTacos === 'si' ? 'Todos' : '— elige "Con tacos" —'}
            disabled={cascade.filtroTacos !== 'si' || cascade.tiposTacosDisp.length === 0}
            options={cascade.tiposTacosDisp.map(t => ({ value: t, label: TACO_LABEL[t] ?? t }))}
          />
          <FiltroSelect
            label="Ancho (mm)"
            value={cascade.filtroAncho}
            onChange={cascade.setFiltroAncho}
            placeholder={cascade.filtroConf ? 'Todos' : '— elige confección —'}
            disabled={!cascade.filtroConf || cascade.anchosDisp.length === 0}
            options={cascade.anchosDisp.map(a => ({ value: String(a), label: `${a} mm` }))}
          />
          <FiltroSelect
            label="Largo (mm)"
            value={cascade.filtroLargo}
            onChange={cascade.setFiltroLargo}
            placeholder={cascade.filtroAncho ? 'Todos' : '— elige ancho —'}
            disabled={!cascade.filtroAncho || cascade.largosDisp.length === 0}
            options={cascade.largosDisp.map(l => ({ value: String(l), label: `${l} mm` }))}
          />
        </div>

        {/* Búsqueda de texto + limpiar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
            <input
              type="text"
              className="input input-bordered input-sm w-full pl-9"
              placeholder="Buscar en nombre…"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
          </div>
          {hayFiltros && (
            <button
              className="btn btn-sm btn-ghost gap-1"
              onClick={() => { cascade.resetAll(); setBusqueda(''); }}
            >
              <FilterX className="w-4 h-4" /> Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Estados de carga / error / vacío */}
      {isLoading && (
        <div className="flex justify-center py-16">
          <span className="loading loading-spinner loading-lg" />
        </div>
      )}
      {error && (
        <div role="alert" className="alert alert-error">Error al cargar las bandas.</div>
      )}
      {!isLoading && !error && filtradas.length === 0 && (
        <div className="text-center py-16 text-base-content/40">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
          {bandas.length === 0
            ? <><p className="font-medium">No hay bandas guardadas todavía.</p><p className="text-sm mt-1">Calcula una banda y pulsa "Guardar en catálogo" para que aparezca aquí.</p></>
            : <p>No hay bandas que coincidan con los filtros activos.</p>
          }
        </div>
      )}

      {/* Tabla */}
      {filtradas.length > 0 && (
        <div className="card bg-base-100 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table table-sm w-full">
              <thead className="bg-base-200">
                <tr>
                  <th>Nombre / Referencia</th>
                  <th className="text-center">Espesor</th>
                  <th className="text-center">Color</th>
                  <th className="text-center">Tipo</th>
                  <th className="text-center">Ancho</th>
                  <th className="text-center">Largo</th>
                  <th className="text-right">Precio unit.</th>
                  <th className="text-right">Peso unit.</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map(b => (
                  <tr key={b.id} className="hover">
                    <td>
                      <Link href={`/gestion/productos/${b.id}`} className="font-mono font-semibold link link-hover text-xs">
                        {b.nombre}
                      </Link>
                    </td>
                    <td className="text-center font-mono text-sm">{b.espesor != null ? `${b.espesor} mm` : '—'}</td>
                    <td className="text-center">
                      {b.color ? <span className="badge badge-ghost badge-sm">{b.color}</span> : <span className="text-base-content/30">—</span>}
                    </td>
                    <td className="text-center">
                      <span className="badge badge-sm badge-ghost">{CONF_LABEL[parseConf(b.nombre)] ?? '—'}</span>
                    </td>
                    <td className="text-center font-mono text-sm">{b.ancho != null ? `${b.ancho} mm` : '—'}</td>
                    <td className="text-center font-mono text-sm">{b.largo != null ? `${b.largo} mm` : '—'}</td>
                    <td className="text-right font-semibold text-primary">{formatCurrency(b.precioUnitario)}</td>
                    <td className="text-right text-sm text-base-content/60">{b.pesoUnitario != null ? `${formatWeight(b.pesoUnitario)} kg` : '—'}</td>
                    <td>
                      <div className="flex items-center gap-1 justify-end">
                        <Link href={`/gestion/productos/${b.id}`} className="btn btn-xs btn-ghost" title="Ver detalle">
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                        <button className="btn btn-xs btn-ghost text-error" onClick={() => handleEliminar(b.id, b.nombre)} title="Eliminar">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 text-xs text-base-content/40 border-t border-base-200">
            {filtradas.length} banda{filtradas.length !== 1 ? 's' : ''}
            {hayFiltros && ` · con filtros activos`}
          </div>
        </div>
      )}
    </div>
  );
}
