"use client";
import { useState, useMemo } from 'react';
import useSWR, { mutate } from 'swr';
import { Package, PlusCircle, Edit, Trash2 } from 'lucide-react';
import FormularioProductoInteligente from '@/componentes/productos/FormularioProductoInteligente';
import { useConfirmacion } from '@/componentes/ui/ModalConfirmacion';
import { ContenedorCargando } from '@/componentes/ui';

export default function GestionProductosPage() {
  const { data, isLoading, error } = useSWR('/api/productos?page=1&limit=200');
  const productos = data?.data ?? [];

  const [modalAbierto, setModalAbierto] = useState(false);
  const [productoEditando, setProductoEditando] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const { confirmar, ModalConfirmacion } = useConfirmacion();

  const filtrados = useMemo(
    () => productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase())),
    [productos, busqueda]
  );

  function abrirNuevo() { setProductoEditando(null); setModalAbierto(true); }
  function abrirEditar(p) { setProductoEditando(p); setModalAbierto(true); }
  function cerrar() { setModalAbierto(false); setProductoEditando(null); }

  function onGuardado() {
    mutate('/api/productos?page=1&limit=200');
    cerrar();
  }

  async function eliminar(id) {
    const ok = await confirmar({
      titulo: '¿Eliminar producto?',
      mensaje: 'Esta acción no se puede deshacer.',
      variante: 'peligro',
    });
    if (!ok) return;
    await fetch(`/api/productos/${id}`, { method: 'DELETE' });
    mutate('/api/productos?page=1&limit=200');
  }

  return (
    <div className="container mx-auto p-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Package className="w-8 h-8" /> Gestión de Productos
        </h1>
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar..."
            className="input input-bordered input-sm w-48"
          />
          <button onClick={abrirNuevo} className="btn btn-primary btn-sm">
            <PlusCircle className="w-4 h-4" /> Nuevo
          </button>
        </div>
      </div>

      {/* Tabla */}
      <ContenedorCargando isLoading={isLoading} error={error}>
        <div className="card bg-base-100 shadow-xl overflow-x-auto">
          <table className="table table-sm table-zebra w-full">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-base-content/50">
                <th>Nombre</th>
                <th>Espesor</th>
                <th>Ancho</th>
                <th>Largo</th>
                <th>Color</th>
                <th>Precio</th>
                <th>Peso</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 && (
                <tr><td colSpan={8} className="text-center py-12 text-base-content/30">Sin productos</td></tr>
              )}
              {filtrados.map(p => (
                <tr key={p.id} className="hover">
                  <td className="font-medium">{p.nombre}</td>
                  <td>{p.espesor != null ? `${p.espesor} mm` : '—'}</td>
                  <td>{p.ancho != null ? `${p.ancho} mm` : '—'}</td>
                  <td>{p.largo != null ? `${p.largo} m` : '—'}</td>
                  <td>{p.color || '—'}</td>
                  <td>{p.precioUnitario != null ? `${Number(p.precioUnitario).toFixed(2)} €` : '—'}</td>
                  <td>{p.pesoUnitario != null ? `${Number(p.pesoUnitario).toFixed(2)} kg` : '—'}</td>
                  <td className="text-right">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => abrirEditar(p)} className="btn btn-ghost btn-xs text-info">
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => eliminar(p.id)} className="btn btn-ghost btn-xs text-error">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ContenedorCargando>

      {/* Modal */}
      {modalAbierto && (
        <div className="modal modal-open">
          <div className="modal-box w-11/12 max-w-lg">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Package className="w-5 h-5" />
              {productoEditando ? 'Editar producto' : 'Nuevo producto'}
            </h3>
            <FormularioProductoInteligente
              productoAEditar={productoEditando}
              onGuardado={onGuardado}
              onCancelar={cerrar}
            />
          </div>
          <div className="modal-backdrop" onClick={cerrar} />
        </div>
      )}

      <ModalConfirmacion />
    </div>
  );
}
