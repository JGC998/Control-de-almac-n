"use client";
import React from 'react';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { Printer, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import PreviewBandaPVC from '@/componentes/calculadoras/PreviewBandaPVC';

export default function NotaTrabajo() {
  const { id } = useParams();
  const { data: order, isLoading } = useSWR(id ? `/api/pedidos/${id}` : null);
  const { data: config } = useSWR('/api/config');

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

  const items = order.items || [];

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .nota-contenido { box-shadow: none !important; border: none !important; margin: 0 !important; padding: 16px !important; max-width: 100% !important; }
        }
        @media screen {
          .nota-contenido { max-width: 800px; margin: 0 auto; }
        }
      `}</style>

      {/* Barra de acciones — solo pantalla */}
      <div className="no-print flex items-center gap-3 p-4 mb-4 border-b border-base-200">
        <Link href={`/pedidos/${id}`} className="btn btn-ghost btn-sm gap-1">
          <ArrowLeft className="w-4 h-4" /> Volver al pedido
        </Link>
        <button onClick={() => window.print()} className="btn btn-primary gap-1">
          <Printer className="w-4 h-4" /> Imprimir nota de trabajo
        </button>
        <Link href="/pedidos/notas-taller" className="btn btn-ghost btn-sm gap-1">
          <Printer className="w-3 h-3" /> Imprimir varias (2 por hoja)
        </Link>
      </div>

      <div className="nota-contenido bg-white p-8 shadow-sm rounded-lg">

        {/* Cabecera */}
        <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
          <div>
            <p className="text-lg font-bold">{empresa.nombre}</p>
            {empresa.direccion && <p className="text-sm">{empresa.direccion}</p>}
            {empresa.telefono && <p className="text-sm">Tel: {empresa.telefono}</p>}
            {empresa.nif && <p className="text-sm">NIF: {empresa.nif}</p>}
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold uppercase tracking-wide">Nota de Trabajo</p>
            <p className="text-3xl font-bold text-black mt-1">{order.numero}</p>
          </div>
        </div>

        {/* Info del pedido */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="border border-gray-300 rounded p-3">
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Cliente</p>
            <p className="font-bold text-lg">{order.cliente?.nombre || '—'}</p>
            {order.cliente?.direccion && <p className="text-sm text-gray-600">{order.cliente.direccion}</p>}
            {order.cliente?.telefono && <p className="text-sm text-gray-600">Tel: {order.cliente.telefono}</p>}
          </div>
          <div className="border border-gray-300 rounded p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 font-semibold uppercase text-xs">Fecha</span>
              <span className="font-medium">{fecha}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 font-semibold uppercase text-xs">Estado</span>
              <span className="font-medium">{order.estado}</span>
            </div>
            {order.sinFacturacion && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 font-semibold uppercase text-xs">Tipo</span>
                <span className="font-medium">Pedido interno</span>
              </div>
            )}
          </div>
        </div>

        {/* Tabla de ítems — SIN precios */}
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
                return (
                  <tr key={idx} className="border border-gray-300">
                    <td className="border border-gray-300 px-3 py-3">
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

        {/* Área de firma */}
        <div className="grid grid-cols-2 gap-8 mt-8 pt-6 border-t border-gray-200">
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

      </div>
    </>
  );
}
