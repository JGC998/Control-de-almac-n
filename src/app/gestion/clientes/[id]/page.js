"use client";
import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import Link from 'next/link';
import { User, FileText, Package, Edit, ArrowLeft, Mail, Phone, MapPin, Tag, TrendingUp, ShoppingCart, Receipt } from 'lucide-react';
import ClientEditModal from '@/componentes/modales/ModalEditarCliente';
import { formatCurrency } from '@/utils/utilidades';

const ESTADO_BADGE = {
  Completado: 'badge-success',
  Aceptado: 'badge-success',
  Pendiente: 'badge-warning',
  Enviado: 'badge-info',
  Cancelado: 'badge-error',
  Borrador: 'badge-ghost',
};

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="stat bg-base-200 rounded-xl">
      <div className="stat-figure text-primary">
        <Icon className="w-8 h-8" />
      </div>
      <div className="stat-title text-xs">{label}</div>
      <div className="stat-value text-xl">{value}</div>
      {sub && <div className="stat-desc">{sub}</div>}
    </div>
  );
}

function badgeClass(estado) {
  return `badge ${ESTADO_BADGE[estado] ?? 'badge-neutral'} badge-sm`;
}

export default function ClienteDetalle() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;

  const { data, error, isLoading, mutate } = useSWR(id ? `/api/clientes/${id}/resumen` : null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen"><span className="loading loading-spinner loading-lg"></span></div>;
  }
  if (error || !data) {
    return <div className="text-center py-20 text-red-500">{error ? 'Error al cargar el cliente.' : 'Cliente no encontrado.'}</div>;
  }

  const { cliente, pedidos, presupuestos, stats } = data;

  const ultimoPedidoFmt = stats.ultimoPedido
    ? new Date(stats.ultimoPedido).toLocaleDateString('es-ES')
    : '-';

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <button onClick={() => router.back()} className="btn btn-ghost mb-4">
        <ArrowLeft className="w-4 h-4" /> Volver
      </button>

      {/* Cabecera */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <User className="w-8 h-8" /> {cliente.nombre}
        </h1>
        <button onClick={() => setIsEditModalOpen(true)} className="btn btn-outline btn-primary btn-sm">
          <Edit className="w-4 h-4" /> Editar
        </button>
      </div>

      {/* Info básica */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { icon: Tag, label: 'Categoría', value: cliente.categoria || cliente.tier || 'NORMAL' },
          { icon: Mail, label: 'Email', value: cliente.email },
          { icon: Phone, label: 'Teléfono', value: cliente.telefono },
          { icon: MapPin, label: 'Dirección', value: cliente.direccion },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-start gap-2 p-3 bg-base-200 rounded-lg">
            <Icon className="w-4 h-4 mt-0.5 text-primary shrink-0" />
            <div className="min-w-0">
              <div className="text-xs text-gray-500">{label}</div>
              <div className="text-sm font-semibold truncate">{value || '-'}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="stats stats-vertical lg:stats-horizontal shadow w-full mb-8">
        <StatCard icon={TrendingUp} label="Total Facturado" value={formatCurrency(stats.totalFacturado)} sub="pedidos no cancelados" />
        <StatCard icon={ShoppingCart} label="Pedidos" value={stats.numPedidos} sub={`Último: ${ultimoPedidoFmt}`} />
        <StatCard icon={Receipt} label="Presupuestos" value={stats.numPresupuestos} />
      </div>

      {/* Pedidos */}
      <div className="bg-base-100 shadow-xl rounded-xl p-5 mb-6">
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          <ShoppingCart className="w-5 h-5" /> Pedidos
        </h2>
        <div className="overflow-x-auto">
          <table className="table table-sm w-full">
            <thead>
              <tr>
                <th>Número</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th>Margen</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.length === 0 && (
                <tr><td colSpan={5} className="text-center text-gray-400 py-6">No hay pedidos</td></tr>
              )}
              {pedidos.map(p => (
                <tr key={p.id} className="hover">
                  <td>
                    <Link href={`/pedidos/${p.id}`} className="link link-primary font-mono text-sm">{p.numero}</Link>
                  </td>
                  <td className="text-sm text-gray-500">{new Date(p.fechaCreacion).toLocaleDateString('es-ES')}</td>
                  <td><span className={badgeClass(p.estado)}>{p.estado}</span></td>
                  <td className="text-sm">
                    {p.margen
                      ? <span className="text-gray-600">{p.margen.descripcion} <span className="font-mono text-xs">(×{p.margen.multiplicador})</span></span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="text-right font-semibold">{formatCurrency(p.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Presupuestos */}
      <div className="bg-base-100 shadow-xl rounded-xl p-5">
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          <Receipt className="w-5 h-5" /> Presupuestos
        </h2>
        <div className="overflow-x-auto">
          <table className="table table-sm w-full">
            <thead>
              <tr>
                <th>Número</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {presupuestos.length === 0 && (
                <tr><td colSpan={4} className="text-center text-gray-400 py-6">No hay presupuestos</td></tr>
              )}
              {presupuestos.map(p => (
                <tr key={p.id} className="hover">
                  <td>
                    <Link href={`/presupuestos/${p.id}`} className="link link-primary font-mono text-sm">{p.numero}</Link>
                  </td>
                  <td className="text-sm text-gray-500">{new Date(p.fechaCreacion).toLocaleDateString('es-ES')}</td>
                  <td><span className={badgeClass(p.estado)}>{p.estado}</span></td>
                  <td className="text-right font-semibold">{formatCurrency(p.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ClientEditModal
        cliente={cliente}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onUpdate={mutate}
      />
    </div>
  );
}
