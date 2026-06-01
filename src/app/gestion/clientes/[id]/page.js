"use client";
import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR, { mutate as globalMutate } from 'swr';
import Link from 'next/link';
import { User, FileText, Package, Edit, ArrowLeft, Mail, Phone, MapPin, Tag, TrendingUp, ShoppingCart, Receipt, DollarSign, History, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import ClientEditModal from '@/componentes/modales/ModalEditarCliente';
import { formatCurrency } from '@/utils/utilidades';

import { fetcher } from '@/lib/fetcher';

function SeccionTarifas({ clienteId }) {
  const { data: tarifas, mutate } = useSWR(`/api/tarifas-cliente?clienteId=${clienteId}`, fetcher);
  const [form, setForm] = useState({ descripcion: '', precioEspecial: '', notas: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [abierto, setAbierto] = useState(false);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.descripcion || !form.precioEspecial) return;
    setSaving(true); setError(null);
    try {
      const res = await fetch('/api/tarifas-cliente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clienteId, ...form, precioEspecial: parseFloat(form.precioEspecial) }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Error');
      mutate();
      setForm({ descripcion: '', precioEspecial: '', notas: '' });
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta tarifa?')) return;
    await fetch('/api/tarifas-cliente', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    mutate();
  };

  const handleToggle = async (t) => {
    await fetch('/api/tarifas-cliente', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: t.id, activa: !t.activa }) });
    mutate();
  };

  return (
    <div className="bg-base-100 shadow-xl rounded-xl p-5 mb-6">
      <button className="flex items-center justify-between w-full text-left" onClick={() => setAbierto(p => !p)}>
        <h2 className="text-lg font-bold flex items-center gap-2">
          <DollarSign className="w-5 h-5" /> Tarifas pactadas
          {tarifas?.length > 0 && <span className="badge badge-primary badge-sm">{tarifas.length}</span>}
        </h2>
        {abierto ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {abierto && (
        <div className="mt-4 space-y-4">
          {tarifas?.length > 0 && (
            <div className="overflow-x-auto">
              <table className="table table-sm w-full">
                <thead><tr><th>Descripción</th><th className="text-right">Precio especial</th><th>Notas</th><th>Estado</th><th></th></tr></thead>
                <tbody>
                  {tarifas.map(t => (
                    <tr key={t.id} className={`hover ${!t.activa ? 'opacity-40' : ''}`}>
                      <td className="font-medium">{t.descripcion}</td>
                      <td className="text-right font-mono font-bold text-primary">{formatCurrency(t.precioEspecial)}</td>
                      <td className="text-sm text-gray-400">{t.notas || '—'}</td>
                      <td>
                        <button className={`badge ${t.activa ? 'badge-success' : 'badge-ghost'} badge-sm cursor-pointer`} onClick={() => handleToggle(t)}>
                          {t.activa ? 'Activa' : 'Inactiva'}
                        </button>
                      </td>
                      <td><button className="btn btn-ghost btn-xs text-error" onClick={() => handleDelete(t.id)}><Trash2 className="w-3 h-3" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {tarifas?.length === 0 && <p className="text-sm text-gray-400 py-2">No hay tarifas pactadas.</p>}

          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end border-t pt-4">
            <div className="md:col-span-2 form-control">
              <label className="label py-0.5"><span className="label-text text-xs">Descripción *</span></label>
              <input type="text" className="input input-bordered input-sm" placeholder="Ej: Banda PVC 5mm 300x3" value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} required />
            </div>
            <div className="form-control">
              <label className="label py-0.5"><span className="label-text text-xs">Precio especial (€) *</span></label>
              <input type="number" className="input input-bordered input-sm" step="0.01" min="0" placeholder="0.00" value={form.precioEspecial} onChange={e => setForm(p => ({ ...p, precioEspecial: e.target.value }))} required />
            </div>
            <div className="form-control">
              <label className="label py-0.5"><span className="label-text text-xs">Notas</span></label>
              <div className="flex gap-1">
                <input type="text" className="input input-bordered input-sm flex-1" placeholder="Opcional" value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))} />
                <button type="submit" className="btn btn-sm btn-primary" disabled={saving}><Plus className="w-3 h-3" /></button>
              </div>
            </div>
            {error && <p className="text-error text-xs md:col-span-4">{error}</p>}
          </form>
        </div>
      )}
    </div>
  );
}

function SeccionHistorial({ clienteId }) {
  const { data: historial, isLoading } = useSWR(`/api/clientes/${clienteId}/historial-precios`, fetcher);
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="bg-base-100 shadow-xl rounded-xl p-5 mb-6">
      <button className="flex items-center justify-between w-full text-left" onClick={() => setAbierto(p => !p)}>
        <h2 className="text-lg font-bold flex items-center gap-2">
          <History className="w-5 h-5" /> Historial de precios
          {historial?.length > 0 && <span className="badge badge-ghost badge-sm">{historial.length} referencias</span>}
        </h2>
        {abierto ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {abierto && (
        <div className="mt-4">
          {isLoading && <span className="loading loading-spinner loading-sm" />}
          {!isLoading && historial?.length === 0 && <p className="text-sm text-gray-400">Sin pedidos registrados.</p>}
          {historial?.length > 0 && (
            <div className="overflow-x-auto">
              <table className="table table-sm w-full">
                <thead>
                  <tr>
                    <th>Descripción</th>
                    <th className="text-right">Último precio</th>
                    <th className="text-right">Precio medio</th>
                    <th className="text-right">Min</th>
                    <th className="text-right">Máx</th>
                    <th className="text-center">Veces</th>
                    <th>Último pedido</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.slice(0, 50).map((h, i) => (
                    <tr key={i} className="hover">
                      <td className="font-medium max-w-xs truncate">{h.descripcion}</td>
                      <td className="text-right font-mono font-bold text-primary">{formatCurrency(h.ultimoPrecio)}</td>
                      <td className="text-right font-mono text-sm">{formatCurrency(h.precioMedio)}</td>
                      <td className="text-right font-mono text-xs text-gray-400">{formatCurrency(h.precioMin)}</td>
                      <td className="text-right font-mono text-xs text-gray-400">{formatCurrency(h.precioMax)}</td>
                      <td className="text-center"><span className="badge badge-ghost badge-sm">{h.numVeces}×</span></td>
                      <td className="text-sm text-gray-400">{new Date(h.ultimaFecha).toLocaleDateString('es-ES')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {historial.length > 50 && <p className="text-xs text-gray-400 mt-2">Mostrando 50 de {historial.length} referencias.</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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

      {/* Tarifas pactadas y Historial de precios */}
      <SeccionTarifas clienteId={id} />
      <SeccionHistorial clienteId={id} />

      <ClientEditModal
        cliente={cliente}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onUpdate={mutate}
      />
    </div>
  );
}
