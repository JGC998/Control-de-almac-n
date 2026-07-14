"use client";
import React, { useState } from 'react';
import { useParams, notFound, useRouter } from 'next/navigation';
import useSWR, { mutate } from 'swr';
import Link from 'next/link';
import { ArrowLeft, Package, DollarSign, Tag, Info, List, Edit, QrCode, TrendingUp, Trash2 } from 'lucide-react';
import { toastError } from '@/lib/toast';
import { useConfirmacion } from '@/componentes/ui/ModalConfirmacion';


const InfoCard = ({ title, value, unit = '', icon: Icon = Package }) => (
  <div className="flex items-center p-4 bg-base-200 rounded-lg shadow-inner">
    <Icon className="w-5 h-5 mr-3 text-primary" />
    <div>
      <div className="text-sm font-medium text-base-content/50">{title}</div>
      <div className="text-lg font-semibold">{value} {unit}</div>
    </div>
  </div>
);

// Importar el modal de edición
import ModalEditarProducto from '@/componentes/modales/ModalEditarProducto';

function HistorialCostos({ productoId }) {
  const { data: historial = [], isLoading } = useSWR(`/api/productos/${productoId}/historial-costos`);

  if (isLoading) return <div className="flex justify-center py-4"><span className="loading loading-spinner loading-sm" /></div>;
  if (!historial.length) return <p className="text-sm text-base-content/50 italic">Sin cambios de coste registrados.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="table table-xs w-full">
        <thead>
          <tr>
            <th>Fecha</th>
            <th className="text-right">Antes</th>
            <th className="text-right">Después</th>
            <th className="text-right">Variación</th>
            <th>Fuente</th>
          </tr>
        </thead>
        <tbody>
          {historial.map((h) => {
            const variacion = h.costoAntes != null ? h.costoDespues - h.costoAntes : null;
            const pct = h.costoAntes ? ((variacion / h.costoAntes) * 100).toFixed(1) : null;
            return (
              <tr key={h.id} className="hover">
                <td className="font-mono text-xs">{new Date(h.creadoEn).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                <td className="text-right font-mono">{h.costoAntes != null ? `${h.costoAntes.toFixed(4)} €` : '—'}</td>
                <td className="text-right font-mono font-semibold">{h.costoDespues.toFixed(4)} €</td>
                <td className={`text-right font-mono text-xs ${variacion > 0 ? 'text-error' : variacion < 0 ? 'text-success' : ''}`}>
                  {variacion != null ? `${variacion > 0 ? '+' : ''}${variacion.toFixed(4)} €${pct ? ` (${variacion > 0 ? '+' : ''}${pct}%)` : ''}` : '—'}
                </td>
                <td><span className="badge badge-ghost badge-sm">{h.fuente}</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ... (código existente)

export default function ProductoDetallePage() {
  const params = useParams();
  const router = useRouter();
  const { id } = params;
  const { confirmar, ModalConfirmacion: ModalBorrarProducto } = useConfirmacion();

  const { data: producto, error, isLoading, mutate } = useSWR(id ? `/api/productos/${id}` : null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const openEditModal = () => setIsEditModalOpen(true);
  const closeEditModal = () => setIsEditModalOpen(false);

  const handleDeleteProduct = async () => {
    const ok = await confirmar({
      titulo: '¿Eliminar producto?',
      mensaje: 'Esta acción es irreversible.',
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/productos/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar producto');
      router.push('/gestion/productos');
    } catch (err) {
      toastError(err.message);
    }
  };

  if (isLoading) return <div className="flex justify-center items-center h-screen"><span className="loading loading-spinner loading-lg text-primary"></span></div>;
  if (error || !producto) {
    if (error?.status === 404) return notFound();
    return <div className="text-error text-center p-10">Error al cargar los detalles del producto.</div>;
  }

  const formatValue = (value, fallback = 'N/A') => {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'number') return value.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    return value;
  };

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <ModalBorrarProducto />
      <Link href="/gestion/productos" className="btn btn-ghost mb-6 gap-2">
        <ArrowLeft className="w-4 h-4" /> Volver al Catálogo
      </Link>

      <div className="bg-base-100 shadow-xl rounded-2xl overflow-hidden hover:shadow-2xl transition-shadow duration-300">
        <div className="p-8 bg-gradient-to-r from-base-100 to-base-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-primary/10 rounded-full">
                <Package className="w-10 h-10 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl font-extrabold text-base-content">{producto.nombre}</h1>
                <div className="flex gap-2 mt-2">
                  {producto.color && <span className="badge badge-secondary badge-outline">{producto.color}</span>}
                  {producto.material?.nombre && <span className="badge badge-outline">{producto.material.nombre}</span>}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-base-content/60 uppercase font-bold tracking-wider">Precio</div>
              <div className="text-4xl font-mono font-bold text-primary">{formatValue(parseFloat(producto.precioUnitario))} €</div>
              <div className="flex justify-end gap-2 mt-2">
                <a href={`/api/productos/${id}/etiqueta`} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline btn-success">
                  <QrCode className="w-4 h-4" /> Etiqueta
                </a>
                <button onClick={openEditModal} className="btn btn-sm btn-outline btn-info">
                  <Edit className="w-4 h-4" /> Editar
                </button>
                <button onClick={handleDeleteProduct} className="btn btn-sm btn-outline btn-error">
                  <Trash2 className="w-4 h-4" /> Eliminar
                </button>
              </div>
            </div>

            <ModalEditarProducto
              producto={producto}
              isOpen={isEditModalOpen}
              onClose={closeEditModal}
              onUpdate={mutate}
            />
          </div>
        </div>

        <div className="p-8">
          <div className="divider text-base-content/50 font-semibold uppercase tracking-widest text-xs">Información General</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="bg-base-200/50 p-6 rounded-xl">
              <h3 className="flex items-center gap-2 font-bold text-lg mb-4 text-secondary">
                <Info className="w-5 h-5" /> Detalles técnicos
              </h3>
              <div className="space-y-2 text-base-content/80 text-sm">
                {producto.subfamilia && (
                  <p>
                    <span className="font-semibold">Clasificación:</span>{' '}
                    <span
                      className="badge badge-sm font-medium"
                      style={producto.subfamilia.familia?.color ? {
                        backgroundColor: producto.subfamilia.familia.color + '22',
                        color: producto.subfamilia.familia.color,
                        borderColor: producto.subfamilia.familia.color + '55',
                      } : {}}
                    >
                      {producto.subfamilia.familia?.nombre} / {producto.subfamilia.nombre}
                    </span>
                  </p>
                )}
                {producto.referenciaFabricante && <p><span className="font-semibold">Ref. Fabricante:</span> {producto.referenciaFabricante}</p>}
                {producto.fabricante?.nombre && <p><span className="font-semibold">Fabricante:</span> {producto.fabricante.nombre}</p>}
                {producto.material?.nombre && <p><span className="font-semibold">Material:</span> {producto.material.nombre}</p>}
                {producto.espesor && <p><span className="font-semibold">Espesor:</span> {producto.espesor} mm</p>}
                {producto.ancho && <p><span className="font-semibold">Ancho:</span> {producto.ancho} mm</p>}
                {producto.largo && <p><span className="font-semibold">Largo:</span> {producto.largo} m</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 content-start">
              <InfoCard title="Precio Unitario" value={formatValue(parseFloat(producto.precioUnitario))} unit="€" icon={DollarSign} />
              <InfoCard title="Costo Unitario" value={formatValue(parseFloat(producto.costoUnitario ?? 0))} unit="€" icon={DollarSign} />
              <InfoCard title="Peso Unitario" value={formatValue(parseFloat(producto.pesoUnitario ?? 0))} unit="kg" icon={List} />
            </div>
          </div>

          {/* Historial de costos */}
          <div className="mt-8">
            <div className="divider">
              <TrendingUp className="w-4 h-4 inline mr-1" />
              Historial de Precio de Coste
            </div>
            <HistorialCostos productoId={id} />
          </div>
        </div>
      </div>
    </div>
  );
}
