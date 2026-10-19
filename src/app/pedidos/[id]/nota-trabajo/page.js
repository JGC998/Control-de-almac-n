"use client";
import React, { useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { Printer, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import PreviewBandaPVC from '@/componentes/calculadoras/PreviewBandaPVC';

// Palette para tipos cuando la familia no tiene color
const TIPO_COLORS = {
  BANDA: '#1d4ed8',
  METRAJE: '#15803d',
  M2: '#b45309',
  PIEZA: '#b45309',
};

function tipoBadge(item) {
  const familia = item.producto?.subfamilia?.familia;
  const subfamilia = item.producto?.subfamilia;
  const label = subfamilia?.nombre || item.producto?.tipo || '—';
  const color = familia?.color || TIPO_COLORS[item.producto?.tipo] || '#64748b';
  return { label, color };
}

// Resumen de tipos para la cabecera
function buildResumen(items) {
  const counts = {};
  for (const item of items) {
    const { label } = tipoBadge(item);
    counts[label] = (counts[label] || 0) + Number(item.quantity || 1);
  }
  return Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(' · ');
}

// Urgencia según fecha de entrega
function urgencia(fechaEntrega) {
  if (!fechaEntrega) return null;
  const diff = (new Date(fechaEntrega) - new Date()) / (1000 * 60 * 60 * 24);
  if (diff < 0) return { label: 'VENCIDO', bg: '#fef2f2', border: '#dc2626', text: '#dc2626' };
  if (diff <= 2) return { label: 'URGENTE', bg: '#fff7ed', border: '#ea580c', text: '#ea580c' };
  if (diff <= 5) return { label: 'PRÓXIMO', bg: '#fefce8', border: '#ca8a04', text: '#ca8a04' };
  return { label: 'OK', bg: '#f0fdf4', border: '#16a34a', text: '#16a34a' };
}

export default function NotaTrabajo() {
  const { id } = useParams();
  const { data: order, isLoading } = useSWR(id ? `/api/pedidos/${id}` : null);
  const { data: config } = useSWR('/api/config');
  const qrRef = useRef(null);

  useEffect(() => {
    if (!id || !qrRef.current) return;
    const url = `${window.location.origin}/pedidos/${id}`;
    import('qrcode').then(mod => {
      mod.default.toCanvas(qrRef.current, url, { width: 80, margin: 1 });
    });
  }, [id]);

  if (isLoading) return (
    <div className="flex justify-center items-center h-screen">
      <span className="loading loading-spinner loading-lg" />
    </div>
  );
  if (!order) return <div className="text-center p-8 text-error">No se pudo cargar el pedido.</div>;

  const empresa = {
    nombre: config?.empresa_nombre || 'Taller',
    direccion: config?.empresa_direccion || '',
    telefono: config?.empresa_telefono || '',
    nif: config?.empresa_nif || '',
  };

  const fecha = order.fechaCreacion
    ? new Date(order.fechaCreacion).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—';

  const fechaEntregaStr = order.fechaEntrega
    ? new Date(order.fechaEntrega).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : null;

  const urg = urgencia(order.fechaEntrega);
  const items = order.items || [];
  const resumen = buildResumen(items);

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .nota-contenido { box-shadow: none !important; border: none !important; margin: 0 !important; padding: 16px !important; max-width: 100% !important; }
        }
        @media screen {
          .nota-contenido { max-width: 820px; margin: 0 auto; }
        }
        .tipo-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #fff;
          margin-bottom: 4px;
        }
      `}</style>

      <div className="no-print flex items-center gap-3 p-4 mb-4 border-b border-base-200">
        <Link href={`/pedidos/${id}`} className="btn btn-ghost btn-sm gap-1">
          <ArrowLeft className="w-4 h-4" /> Volver al pedido
        </Link>
        <button onClick={() => window.print()} className="btn btn-primary gap-1">
          <Printer className="w-4 h-4" /> Imprimir nota de trabajo
        </button>
      </div>

      <div className="nota-contenido bg-white p-8 shadow-sm rounded-lg">

        {/* Cabecera */}
        <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-4">
          <div>
            <p className="text-sm font-bold">{empresa.nombre}</p>
            {empresa.direccion && <p className="text-xs text-gray-500">{empresa.direccion}</p>}
            {empresa.telefono && <p className="text-xs text-gray-500">Tel: {empresa.telefono}</p>}
          </div>
          <div className="text-right">
            <p className="text-lg font-bold uppercase tracking-wide text-gray-400">Nota de Trabajo</p>
            <p className="text-4xl font-black text-black tracking-tight">{order.numero}</p>
          </div>
        </div>

        {/* Cliente + fecha + urgencia */}
        <div className="flex justify-between items-start mb-4 gap-4">
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold mb-0.5">Cliente</p>
            <p className="text-2xl font-black text-black leading-tight">{order.cliente?.nombre || '—'}</p>
            {order.cliente?.telefono && (
              <p className="text-sm text-gray-500 mt-0.5">Tel: {order.cliente.telefono}</p>
            )}
          </div>
          <div className="text-right flex flex-col items-end gap-2 shrink-0">
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold">Fecha pedido</p>
              <p className="font-semibold">{fecha}</p>
            </div>
            {fechaEntregaStr && urg && (
              <div
                className="border rounded px-3 py-1.5 text-center"
                style={{ background: urg.bg, borderColor: urg.border }}
              >
                <p className="text-xs font-bold uppercase" style={{ color: urg.text }}>{urg.label}</p>
                <p className="text-sm font-black" style={{ color: urg.text }}>Entrega: {fechaEntregaStr}</p>
              </div>
            )}
          </div>
        </div>

        {/* Resumen de tipos */}
        {resumen && (
          <div className="bg-gray-100 rounded px-3 py-2 mb-4 text-sm font-semibold text-gray-600 tracking-wide">
            {resumen}
            {order.sinFacturacion && <span className="ml-4 text-gray-400 font-normal">· Pedido interno</span>}
          </div>
        )}

        {/* Tabla de ítems */}
        <table className="w-full border-collapse mb-6">
          <thead>
            <tr className="bg-gray-100 border border-gray-300">
              <th className="border border-gray-300 px-3 py-2 text-left text-sm">Descripción</th>
              <th className="border border-gray-300 px-3 py-2 text-center text-sm w-24">Cantidad</th>
              <th className="border border-gray-300 px-3 py-2 text-center text-sm w-28">Realizado</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={3} className="border border-gray-300 px-3 py-4 text-center text-gray-400 italic text-sm">
                  Sin líneas de producto
                </td>
              </tr>
            ) : (
              items.map((item, idx) => {
                let detalles = null;
                try { detalles = item.detallesTecnicos ? JSON.parse(item.detallesTecnicos) : null; } catch {}
                const esBanda = !!detalles?.dimensiones;
                const { label: tipoLabel, color: tipoColor } = tipoBadge(item);
                return (
                  <tr key={idx} className="border border-gray-300">
                    <td className="border border-gray-300 px-3 py-3">
                      <span
                        className="tipo-badge"
                        style={{ backgroundColor: tipoColor }}
                      >
                        {tipoLabel}
                      </span>
                      <div className="flex items-start gap-3">
                        {esBanda && (
                          <div className="shrink-0">
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
                          <p className="font-medium">{item.descripcion}</p>
                          {item.producto?.nombre && (
                            <p className="text-xs text-gray-500 mt-0.5">{item.producto.nombre}</p>
                          )}
                          {esBanda && (
                            <p className="text-xs text-gray-400 mt-1">
                              {detalles.dimensiones?.ancho} × {detalles.dimensiones?.largo} mm · {detalles.tipoConfeccion}
                              {detalles.color ? ` · ${detalles.color}` : ''}
                              {detalles.tacos ? ` · Tacos ${detalles.tacos.tipo} ${detalles.tacos.altura}mm` : ''}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="border border-gray-300 px-3 py-3 text-center font-bold text-lg">
                      {item.quantity}
                    </td>
                    <td className="border border-gray-300 px-3 py-3 text-center">
                      {/* Celda para que el operario marque */}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Notas */}
        {order.notas && (
          <div className="border border-gray-300 rounded p-3 mb-6">
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Observaciones</p>
            <p className="text-sm whitespace-pre-wrap">{order.notas}</p>
          </div>
        )}

        {/* Footer: firmas + QR */}
        <div className="flex items-end justify-between mt-8 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-8 flex-1">
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Operario</p>
              <div className="border-b border-gray-400 h-12 mb-1"></div>
              <p className="text-xs text-gray-400">Firma y fecha</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Revisado por</p>
              <div className="border-b border-gray-400 h-12 mb-1"></div>
              <p className="text-xs text-gray-400">Firma y fecha</p>
            </div>
          </div>
          <div className="ml-8 text-center shrink-0">
            <canvas ref={qrRef} style={{ width: 80, height: 80 }} />
            <p className="text-xs text-gray-400 mt-1">Ver pedido</p>
          </div>
        </div>

      </div>
    </>
  );
}
