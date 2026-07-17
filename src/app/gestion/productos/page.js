"use client";
import { useState, useMemo } from 'react';
import Link from 'next/link';
import useSWR, { mutate } from 'swr';
import { Package, PlusCircle, Edit, Trash2, ChevronUp, ChevronDown, ChevronsUpDown, CheckSquare, X, Layers } from 'lucide-react';
import FormularioProductoInteligente from '@/componentes/productos/FormularioProductoInteligente';
import SelectorFamiliaSubfamilia from '@/componentes/productos/SelectorFamiliaSubfamilia';
import { useConfirmacion } from '@/componentes/ui/ModalConfirmacion';
import { ContenedorCargando } from '@/componentes/ui';

const COLUMNAS = [
  { key: 'nombre',        label: 'Nombre',     tipo: 'string' },
  { key: 'subfamilia',    label: 'Subfamilia', tipo: 'string' },
  { key: 'tipo',          label: 'Tipo',       tipo: 'string' },
  { key: 'material',      label: 'Material',   tipo: 'string' },
  { key: 'acabado',       label: 'Acabado',    tipo: 'string' },
  { key: 'espesor',       label: 'Espesor',    tipo: 'number' },
  { key: 'ancho',         label: 'Ancho',      tipo: 'number' },
  { key: 'largo',         label: 'Largo',      tipo: 'number' },
  { key: 'precioUnitario',label: 'Precio',     tipo: 'number' },
  { key: 'pesoUnitario',  label: 'Peso',       tipo: 'number' },
];

const TIPO_LABELS = { BANDA: 'Banda', CORDON: 'Cordón', BORDE_ONDULADO: 'Borde', ACCESORIO: 'Accesorio' };
const TIPO_BADGE  = { BANDA: 'badge-primary', CORDON: 'badge-secondary', BORDE_ONDULADO: 'badge-accent', ACCESORIO: 'badge-neutral' };

function valorOrden(p, key) {
  if (key === 'material') return p.material?.nombre ?? '';
  if (key === 'subfamilia') return p.subfamilia?.nombre ?? '';
  return p[key];
}

function comparar(a, b, key, tipo, dir) {
  const va = valorOrden(a, key);
  const vb = valorOrden(b, key);
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

function PanelAsignacionMasiva({ seleccion, onAplicar, onCancelar }) {
  const [subfamiliaId, setSubfamiliaId] = useState(null);
  const [aplicando, setAplicando]       = useState(false);
  const [error, setError]               = useState(null);

  async function aplicar() {
    if (!subfamiliaId) { setError('Selecciona una subfamilia'); return; }
    setAplicando(true); setError(null);
    try {
      const resultados = await Promise.all(
        [...seleccion].map(id =>
          fetch(`/api/productos/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subfamiliaId }),
          })
        )
      );
      const fallidos = resultados.filter(r => !r.ok).length;
      if (fallidos > 0) throw new Error(`${fallidos} producto(s) no se pudieron actualizar`);
      onAplicar();
    } catch (e) { setError(e.message); }
    finally { setAplicando(false); }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-base-100 border-t-2 border-primary shadow-2xl px-6 py-4">
      <div className="max-w-5xl mx-auto flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 font-medium text-primary shrink-0">
          <CheckSquare className="w-5 h-5" />
          <span>{seleccion.size} producto{seleccion.size !== 1 ? 's' : ''} seleccionado{seleccion.size !== 1 ? 's' : ''}</span>
        </div>

        <div className="flex items-center gap-2 flex-1 flex-wrap">
          <SelectorFamiliaSubfamilia
            value={subfamiliaId}
            onChange={setSubfamiliaId}
            compact
          />

          <button
            className="btn btn-primary btn-sm gap-1"
            onClick={aplicar}
            disabled={aplicando || !subfamiliaId}
          >
            {aplicando
              ? <span className="loading loading-spinner loading-xs" />
              : <Layers className="w-4 h-4" />}
            Aplicar a {seleccion.size}
          </button>

          {error && <span className="text-error text-sm">{error}</span>}
        </div>

        <button onClick={onCancelar} className="btn btn-ghost btn-sm btn-square shrink-0" title="Cancelar selección">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function GestionProductosPage() {
  const { data, isLoading, error } = useSWR('/api/productos?page=1&limit=500');
  const { data: familias = [] }    = useSWR('/api/familias');
  const productos = data?.data ?? [];

  const [modalAbierto, setModalAbierto]       = useState(false);
  const [productoEditando, setProductoEditando] = useState(null);
  const [busqueda, setBusqueda]               = useState('');
  const [filtroFamilia, setFiltroFamilia]     = useState('');
  const [soloSinClasificar, setSoloSinClasificar] = useState(false);
  const [sort, setSort]                       = useState({ campo: null, dir: 'asc' });
  const [seleccion, setSeleccion]             = useState(new Set());
  const { confirmar, ModalConfirmacion }      = useConfirmacion();

  function toggleSort(key, tipo) {
    setSort(prev =>
      prev.campo === key
        ? { campo: key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { campo: key, dir: 'asc', tipo }
    );
  }

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase();
    let lista = productos.filter(p => {
      if (q && !p.nombre?.toLowerCase().includes(q) &&
          !(p.material?.nombre ?? '').toLowerCase().includes(q) &&
          !(p.acabado ?? '').toLowerCase().includes(q) &&
          !(p.subfamilia?.nombre ?? '').toLowerCase().includes(q)) return false;
      if (filtroFamilia && p.subfamilia?.familia?.id !== filtroFamilia) return false;
      if (soloSinClasificar && p.subfamilia != null) return false;
      return true;
    });
    if (sort.campo) {
      const col = COLUMNAS.find(c => c.key === sort.campo);
      lista = [...lista].sort((a, b) => comparar(a, b, sort.campo, col?.tipo, sort.dir));
    }
    return lista;
  }, [productos, busqueda, filtroFamilia, soloSinClasificar, sort]);

  function toggleSeleccion(id) {
    setSeleccion(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleTodos() {
    if (seleccion.size === filtrados.length) {
      setSeleccion(new Set());
    } else {
      setSeleccion(new Set(filtrados.map(p => p.id)));
    }
  }

  function abrirNuevo() { setProductoEditando(null); setModalAbierto(true); }
  function abrirEditar(p) { setProductoEditando(p); setModalAbierto(true); }
  function cerrar() { setModalAbierto(false); setProductoEditando(null); }

  function onGuardado() {
    mutate('/api/productos?page=1&limit=500');
    cerrar();
  }

  async function onAplicarMasivo() {
    setSeleccion(new Set());
    mutate('/api/productos?page=1&limit=500');
  }

  async function eliminar(id) {
    const ok = await confirmar({
      titulo: '¿Eliminar producto?',
      mensaje: 'Esta acción no se puede deshacer.',
      variante: 'peligro',
    });
    if (!ok) return;
    await fetch(`/api/productos/${id}`, { method: 'DELETE' });
    mutate('/api/productos?page=1&limit=500');
  }

  const todosMarcados = filtrados.length > 0 && seleccion.size === filtrados.length;
  const algunoMarcado = seleccion.size > 0 && seleccion.size < filtrados.length;

  return (
    <div className={`container mx-auto p-4 ${seleccion.size > 0 ? 'pb-24' : ''}`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Package className="w-8 h-8" /> Gestión de Productos
        </h1>
        <div className="flex gap-2 items-center">
          <select
            className="select select-bordered select-sm"
            value={filtroFamilia}
            onChange={e => { setFiltroFamilia(e.target.value); setSoloSinClasificar(false); }}
          >
            <option value="">Todas las familias</option>
            {familias.map(f => (
              <option key={f.id} value={f.id}>{f.nombre}</option>
            ))}
          </select>
          <button
            className={`btn btn-sm ${soloSinClasificar ? 'btn-warning' : 'btn-outline btn-warning'}`}
            onClick={() => { setSoloSinClasificar(v => !v); setFiltroFamilia(''); }}
            title="Mostrar solo productos sin subfamilia asignada"
          >
            Sin clasificar
          </button>
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, material, subfamilia..."
            className="input input-bordered input-sm w-64"
          />
          <Link href="/gestion/productos/clasificar" className="btn btn-outline btn-sm gap-1">
            <Layers className="w-4 h-4" /> Clasificar
          </Link>
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
                {/* Checkbox "seleccionar todos" */}
                <th className="w-8">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm"
                    checked={todosMarcados}
                    ref={el => { if (el) el.indeterminate = algunoMarcado; }}
                    onChange={toggleTodos}
                  />
                </th>
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
                <tr><td colSpan={11} className="text-center py-12 text-base-content/30">Sin productos</td></tr>
              )}
              {filtrados.map(p => {
                const incompleto = p.espesor == null || p.ancho == null || p.largo == null || !p.precioUnitario;
                const marcado    = seleccion.has(p.id);
                return (
                  <tr
                    key={p.id}
                    className={`hover cursor-pointer${incompleto ? ' opacity-60' : ''}${marcado ? ' bg-primary/10' : ''}`}
                    onClick={() => toggleSeleccion(p.id)}
                  >
                    <td onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm"
                        checked={marcado}
                        onChange={() => toggleSeleccion(p.id)}
                      />
                    </td>
                    <td className="font-medium">
                      <Link
                        href={`/gestion/productos/${p.id}`}
                        onClick={e => e.stopPropagation()}
                        className="hover:text-primary hover:underline"
                      >
                        {p.nombre}
                      </Link>
                      {incompleto && <span className="badge badge-warning badge-xs ml-2">incompleto</span>}
                    </td>
                    <td className="text-sm">
                      {p.subfamilia ? (
                        <span
                          className="badge badge-sm font-medium"
                          style={p.subfamilia.familia?.color ? {
                            backgroundColor: p.subfamilia.familia.color + '22',
                            color: p.subfamilia.familia.color,
                            borderColor: p.subfamilia.familia.color + '55',
                          } : {}}
                        >
                          {p.subfamilia.nombre}
                        </span>
                      ) : <span className="text-base-content/30">—</span>}
                    </td>
                    <td className="text-sm">
                      {p.tipo && p.tipo !== 'BANDA' ? (
                        <span className={`badge badge-xs ${TIPO_BADGE[p.tipo] ?? 'badge-neutral'}`}>
                          {TIPO_LABELS[p.tipo] ?? p.tipo}
                        </span>
                      ) : null}
                    </td>
                    <td className="text-sm">{p.material?.nombre ?? <span className="text-base-content/30">—</span>}</td>
                    <td className="text-sm">{p.acabado ?? <span className="text-base-content/30">—</span>}</td>
                    <td className={p.espesor == null ? 'text-warning font-bold' : ''}>{p.espesor != null ? `${p.espesor} mm` : '—'}</td>
                    <td className={p.ancho == null ? 'text-warning font-bold' : ''}>{p.ancho != null ? `${p.ancho} mm` : '—'}</td>
                    <td className={p.largo == null ? 'text-warning font-bold' : ''}>{p.largo != null ? `${p.largo} mm` : '—'}</td>
                    <td className={!p.precioUnitario ? 'text-warning font-bold' : ''}>{p.precioUnitario != null ? `${Number(p.precioUnitario).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €` : '—'}</td>
                    <td>{p.pesoUnitario != null ? `${Number(p.pesoUnitario).toLocaleString('es-ES', { minimumFractionDigits: 2 })} kg` : '—'}</td>
                    <td onClick={e => e.stopPropagation()}>
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
        {filtrados.length > 0 && (
          <p className="text-xs text-base-content/40 mt-2 text-right">{filtrados.length} productos</p>
        )}
      </ContenedorCargando>

      {/* Panel asignación masiva */}
      {seleccion.size > 0 && (
        <PanelAsignacionMasiva
          seleccion={seleccion}
          onAplicar={onAplicarMasivo}
          onCancelar={() => setSeleccion(new Set())}
        />
      )}

      {/* Modal editar/crear */}
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
