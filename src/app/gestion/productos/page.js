"use client";
import { useState, useMemo } from 'react';
import useSWR, { mutate } from 'swr';
import { Package, PlusCircle, Edit, Trash2, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import FormularioProductoInteligente from '@/componentes/productos/FormularioProductoInteligente';
import { useConfirmacion } from '@/componentes/ui/ModalConfirmacion';
import { ContenedorCargando } from '@/componentes/ui';

const COLUMNAS = [
  { key: 'nombre',        label: 'Nombre',   tipo: 'string' },
  { key: 'material',      label: 'Material', tipo: 'string' },
  { key: 'acabado',       label: 'Acabado',  tipo: 'string' },
  { key: 'espesor',       label: 'Espesor',  tipo: 'number' },
  { key: 'ancho',         label: 'Ancho',    tipo: 'number' },
  { key: 'largo',         label: 'Largo',    tipo: 'number' },
  { key: 'precioUnitario',label: 'Precio',   tipo: 'number' },
  { key: 'pesoUnitario',  label: 'Peso',     tipo: 'number' },
];

function valorOrden(p, key) {
  if (key === 'material') return p.material?.nombre ?? '';
  return p[key];
}

function comparar(a, b, key, tipo, dir) {
  const va = valorOrden(a, key);
  const vb = valorOrden(b, key);
  // Nulls/vacíos siempre primero en ascendente, últimos en descendente
  const aNulo = va == null || va === '';
  const bNulo = vb == null || vb === '';
  if (aNulo && bNulo) return 0;
  if (aNulo) return dir === 'asc' ? -1 : 1;
  if (bNulo) return dir === 'asc' ? 1 : -1;
  let cmp = tipo === 'number'
    ? Number(va) - Number(vb)
    : String(va).localeCompare(String(vb), 'es', { sensitivity: 'base' });
  return dir === 'asc' ? cmp : -cmp;
}

function IconoOrden({ campo, sort }) {
  if (sort.campo !== campo) return <ChevronsUpDown className="w-3 h-3 opacity-30" />;
  return sort.dir === 'asc'
    ? <ChevronUp className="w-3 h-3 text-primary" />
    : <ChevronDown className="w-3 h-3 text-primary" />;
}

export default function GestionProductosPage() {
  const { data, isLoading, error } = useSWR('/api/productos?page=1&limit=200');
  const productos = data?.data ?? [];

  const [modalAbierto, setModalAbierto] = useState(false);
  const [productoEditando, setProductoEditando] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [sort, setSort] = useState({ campo: null, dir: 'asc' });
  const { confirmar, ModalConfirmacion } = useConfirmacion();

  function toggleSort(key, tipo) {
    setSort(prev =>
      prev.campo === key
        ? { campo: key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { campo: key, dir: 'asc', tipo }
    );
  }

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase();
    let lista = productos.filter(p =>
      !q ||
      p.nombre?.toLowerCase().includes(q) ||
      (p.material?.nombre ?? '').toLowerCase().includes(q) ||
      (p.acabado ?? '').toLowerCase().includes(q)
    );
    if (sort.campo) {
      const col = COLUMNAS.find(c => c.key === sort.campo);
      lista = [...lista].sort((a, b) => comparar(a, b, sort.campo, col?.tipo, sort.dir));
    }
    return lista;
  }, [productos, busqueda, sort]);

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
                {COLUMNAS.map(col => (
                  <th key={col.key}>
                    <button
                      onClick={() => toggleSort(col.key, col.tipo)}
                      className="flex items-center gap-1 hover:text-base-content transition-colors cursor-pointer select-none"
                    >
                      {col.label}
                      <IconoOrden campo={col.key} sort={sort} />
                    </button>
                  </th>
                ))}
                <th />
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 && (
                <tr><td colSpan={9} className="text-center py-12 text-base-content/30">Sin productos</td></tr>
              )}
              {filtrados.map(p => {
                const incompleto = p.espesor == null || p.ancho == null || p.largo == null || !p.precioUnitario;
                return (
                  <tr key={p.id} className={`hover${incompleto ? ' opacity-60' : ''}`}>
                    <td className="font-medium">
                      {p.nombre}
                      {incompleto && <span className="badge badge-warning badge-xs ml-2">incompleto</span>}
                    </td>
                    <td className="text-sm">{p.material?.nombre ?? '—'}</td>
                    <td className="text-sm">{p.acabado ?? '—'}</td>
                    <td className={p.espesor == null ? 'text-warning font-bold' : ''}>{p.espesor != null ? `${p.espesor} mm` : '—'}</td>
                    <td className={p.ancho == null ? 'text-warning font-bold' : ''}>{p.ancho != null ? `${p.ancho} mm` : '—'}</td>
                    <td className={p.largo == null ? 'text-warning font-bold' : ''}>{p.largo != null ? `${p.largo} mm` : '—'}</td>
                    <td className={!p.precioUnitario ? 'text-warning font-bold' : ''}>{p.precioUnitario != null ? `${Number(p.precioUnitario).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €` : '—'}</td>
                    <td>{p.pesoUnitario != null ? `${Number(p.pesoUnitario).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg` : '—'}</td>
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
                );
              })}
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
