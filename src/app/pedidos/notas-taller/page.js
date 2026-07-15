"use client";
import React, { useState, useMemo, useCallback } from 'react';
import useSWR from 'swr';
import { Printer, ArrowLeft, CheckSquare, Square, Search, Loader2 } from 'lucide-react';
import Link from 'next/link';
import PreviewBandaPVC from '@/componentes/calculadoras/PreviewBandaPVC';

// ─── Nota mini (se renderiza en la mitad del folio) ─────────────────────────

function NotaMini({ order, empresa }) {
  const fecha = order.fechaCreacion
    ? new Date(order.fechaCreacion).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—';
  const items = order.items || [];

  return (
    <div className="nota-media bg-white">
      {/* Cabecera compacta */}
      <div className="flex justify-between items-start border-b-2 border-black pb-2 mb-3">
        <div>
          <p className="font-bold text-sm">{empresa.nombre}</p>
          {empresa.telefono && <p className="text-xs">{empresa.telefono}</p>}
        </div>
        <div className="text-right">
          <p className="text-base font-bold uppercase tracking-wide">Nota de Trabajo</p>
          <p className="text-2xl font-black">{order.numero}</p>
        </div>
      </div>

      {/* Info del pedido */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="border border-gray-300 rounded p-2">
          <p className="text-xs text-gray-500 uppercase font-semibold mb-0.5">Cliente</p>
          <p className="font-bold text-sm">{order.cliente?.nombre || '—'}</p>
        </div>
        <div className="border border-gray-300 rounded p-2 text-xs">
          <div className="flex justify-between mb-0.5">
            <span className="text-gray-500 uppercase font-semibold">Fecha</span>
            <span>{fecha}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 uppercase font-semibold">Estado</span>
            <span>{order.estado}</span>
          </div>
        </div>
      </div>

      {/* Tabla de ítems */}
      <table className="w-full border-collapse mb-3 text-xs">
        <thead>
          <tr className="bg-gray-100 border border-gray-300">
            <th className="border border-gray-300 px-2 py-1 text-left">Descripción</th>
            <th className="border border-gray-300 px-2 py-1 text-center w-16">Cant.</th>
            <th className="border border-gray-300 px-2 py-1 text-center w-20">Realizado</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={3} className="border border-gray-300 px-2 py-2 text-center text-gray-400 italic">
                Sin líneas
              </td>
            </tr>
          ) : (
            items.map((item, idx) => {
              let detalles = null;
              try { detalles = item.detallesTecnicos ? JSON.parse(item.detallesTecnicos) : null; } catch {}
              const esBanda = !!detalles?.dimensiones;
              return (
                <tr key={idx} className="border border-gray-300">
                  <td className="border border-gray-300 px-2 py-1.5">
                    <div className="flex items-start gap-2">
                      {esBanda && (
                        <div className="shrink-0 scale-75 origin-top-left" style={{ width: 162, height: 165, overflow: 'hidden' }}>
                          <PreviewBandaPVC
                            ancho={detalles.dimensiones?.ancho}
                            largo={detalles.dimensiones?.largo}
                            tipoConfeccion={detalles.tipoConfeccion}
                            configuracionTacos={detalles.tacos}
                            color={detalles.color}
                          />
                        </div>
                      )}
                      <div>
                        <p className="font-medium leading-tight">{item.descripcion}</p>
                        {esBanda && (
                          <p className="text-gray-400 text-xs mt-0.5">
                            {detalles.dimensiones?.ancho} × {detalles.dimensiones?.largo} mm · {detalles.tipoConfeccion}
                            {detalles.tacos ? ` · Tacos ${detalles.tacos.tipo} ${detalles.tacos.altura}mm` : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-center font-bold">{item.quantity}</td>
                  <td className="border border-gray-300 px-2 py-1 text-center"></td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {/* Notas (si las hay) */}
      {order.notas && (
        <div className="border border-gray-300 rounded p-2 mb-2 text-xs">
          <span className="text-gray-500 uppercase font-semibold">Obs: </span>
          <span className="whitespace-pre-wrap">{order.notas}</span>
        </div>
      )}

      {/* Firma compacta */}
      <div className="grid grid-cols-2 gap-6 mt-auto pt-2 border-t border-gray-200">
        <div>
          <p className="text-xs text-gray-500 uppercase font-semibold mb-0.5">Operario</p>
          <div className="border-b border-gray-400 h-8"></div>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase font-semibold mb-0.5">Revisado</p>
          <div className="border-b border-gray-400 h-8"></div>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ────────────────────────────────────────────────────────

export default function NotasTaller() {
  const { data: pedidosResp, isLoading } = useSWR('/api/pedidos?limit=100');
  const { data: config } = useSWR('/api/config');

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [search, setSearch] = useState('');
  const [printDetails, setPrintDetails] = useState(null);
  const [loadingPrint, setLoadingPrint] = useState(false);

  const empresa = {
    nombre: config?.empresa_nombre || 'Taller',
    direccion: config?.empresa_direccion || '',
    telefono: config?.empresa_telefono || '',
    nif: config?.empresa_nif || '',
  };

  const pedidos = pedidosResp?.data ?? [];

  const filteredPedidos = useMemo(() => {
    if (!search.trim()) return pedidos;
    const q = search.toLowerCase();
    return pedidos.filter(p =>
      p.numero?.toLowerCase().includes(q) ||
      p.cliente?.nombre?.toLowerCase().includes(q) ||
      p.estado?.toLowerCase().includes(q)
    );
  }, [pedidos, search]);

  const toggleSelect = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (selectedIds.size === filteredPedidos.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPedidos.map(p => p.id)));
    }
  }, [selectedIds, filteredPedidos]);

  const handlePrint = async () => {
    if (selectedIds.size === 0) return;
    setLoadingPrint(true);
    try {
      const details = await Promise.all(
        [...selectedIds].map(id => fetch(`/api/pedidos/${id}`).then(r => r.json()))
      );
      setPrintDetails(details);
      setTimeout(() => window.print(), 400);
    } catch {
      alert('Error al cargar los detalles de los pedidos');
    } finally {
      setLoadingPrint(false);
    }
  };

  // Agrupar en pares para imprimir 2 por folio
  const pairs = useMemo(() => {
    if (!printDetails) return [];
    const result = [];
    for (let i = 0; i < printDetails.length; i += 2) {
      result.push(printDetails.slice(i, i + 2));
    }
    return result;
  }, [printDetails]);

  // ─── Vista de impresión ───────────────────────────────────────────────────
  if (printDetails) {
    return (
      <>
        <style>{`
          @media print {
            .no-print { display: none !important; }
            body { margin: 0; background: white !important; }
            .par-notas {
              height: 297mm;
              page-break-after: always;
              display: flex;
              flex-direction: column;
              overflow: hidden;
            }
            .par-notas:last-child { page-break-after: auto; }
            .nota-media {
              flex: 1;
              padding: 12mm 14mm;
              box-sizing: border-box;
              overflow: hidden;
              display: flex;
              flex-direction: column;
            }
            .nota-media:first-child {
              border-bottom: 1.5px dashed #999;
            }
          }
          @media screen {
            .par-notas {
              border: 1px dashed #ccc;
              margin-bottom: 24px;
              border-radius: 8px;
              overflow: hidden;
            }
            .nota-media {
              padding: 24px 28px;
              display: flex;
              flex-direction: column;
            }
            .nota-media:first-child {
              border-bottom: 1.5px dashed #bbb;
            }
          }
        `}</style>

        {/* Barra — solo pantalla */}
        <div className="no-print flex items-center gap-3 p-4 mb-4 border-b border-base-200">
          <button onClick={() => setPrintDetails(null)} className="btn btn-ghost btn-sm gap-1">
            <ArrowLeft className="w-4 h-4" /> Volver a selección
          </button>
          <button onClick={() => window.print()} className="btn btn-primary gap-1">
            <Printer className="w-4 h-4" /> Imprimir ({printDetails.length} notas · {pairs.length} {pairs.length === 1 ? 'hoja' : 'hojas'})
          </button>
          <span className="text-sm text-base-content/50 ml-2">
            2 notas por hoja — línea de corte punteada
          </span>
        </div>

        {/* Contenido imprimible */}
        {pairs.map((pair, pairIdx) => (
          <div key={pairIdx} className="par-notas">
            {pair.map((order) => (
              <NotaMini key={order.id} order={order} empresa={empresa} />
            ))}
            {/* Si el par solo tiene 1, relleno vacío para que ocupe la mitad */}
            {pair.length === 1 && <div className="nota-media" />}
          </div>
        ))}
      </>
    );
  }

  // ─── Vista de selección ───────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/pedidos" className="btn btn-ghost btn-sm gap-1">
          <ArrowLeft className="w-4 h-4" /> Pedidos
        </Link>
        <div>
          <h1 className="text-xl font-bold">Imprimir notas de taller</h1>
          <p className="text-sm text-base-content/50">Selecciona los pedidos — se imprimirán 2 notas por hoja</p>
        </div>
      </div>

      {/* Barra de búsqueda y acciones */}
      <div className="flex gap-2 mb-4">
        <label className="input input-bordered flex items-center gap-2 flex-1">
          <Search className="w-4 h-4 opacity-50" />
          <input
            type="text"
            placeholder="Buscar por número, cliente o estado..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="grow"
          />
        </label>
        <button
          className="btn btn-primary gap-1"
          disabled={selectedIds.size === 0 || loadingPrint}
          onClick={handlePrint}
        >
          {loadingPrint
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Cargando...</>
            : <><Printer className="w-4 h-4" /> Imprimir {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}</>
          }
        </button>
      </div>

      {/* Tabla de selección */}
      <div className="card bg-base-100 shadow-sm border border-base-200">
        <table className="table table-sm">
          <thead>
            <tr>
              <th className="w-10">
                <button onClick={toggleAll} className="btn btn-ghost btn-xs">
                  {selectedIds.size > 0 && selectedIds.size === filteredPedidos.length
                    ? <CheckSquare className="w-4 h-4 text-primary" />
                    : <Square className="w-4 h-4" />
                  }
                </button>
              </th>
              <th>Número</th>
              <th>Cliente</th>
              <th>Fecha</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="text-center py-8"><span className="loading loading-dots" /></td></tr>
            ) : filteredPedidos.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-base-content/40">Sin pedidos</td></tr>
            ) : (
              filteredPedidos.map(p => {
                const checked = selectedIds.has(p.id);
                const fecha = p.fechaCreacion
                  ? new Date(p.fechaCreacion).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
                  : '—';
                return (
                  <tr
                    key={p.id}
                    className={`cursor-pointer hover ${checked ? 'bg-primary/5' : ''}`}
                    onClick={() => toggleSelect(p.id)}
                  >
                    <td onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="checkbox checkbox-primary checkbox-sm"
                        checked={checked}
                        onChange={() => toggleSelect(p.id)}
                      />
                    </td>
                    <td className="font-mono font-semibold">{p.numero}</td>
                    <td>{p.cliente?.nombre || <span className="text-base-content/30 italic">Sin cliente</span>}</td>
                    <td className="text-sm text-base-content/60">{fecha}</td>
                    <td>
                      <span className="badge badge-sm badge-ghost">{p.estado}</span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selectedIds.size > 0 && (
        <div className="mt-4 flex justify-end">
          <p className="text-sm text-base-content/50 mr-3 self-center">
            {selectedIds.size} pedido{selectedIds.size !== 1 ? 's' : ''} · {Math.ceil(selectedIds.size / 2)} hoja{Math.ceil(selectedIds.size / 2) !== 1 ? 's' : ''}
          </p>
          <button
            className="btn btn-primary gap-1"
            disabled={loadingPrint}
            onClick={handlePrint}
          >
            {loadingPrint
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Cargando...</>
              : <><Printer className="w-4 h-4" /> Imprimir {selectedIds.size} notas</>
            }
          </button>
        </div>
      )}
    </div>
  );
}
