"use client";
import { useState, useMemo } from 'react';
import useSWR, { mutate } from 'swr';
import { Box, PlusCircle, Edit2, Trash2, Check, X } from 'lucide-react';
import SelectorFamiliaSubfamilia from '@/componentes/productos/SelectorFamiliaSubfamilia';
import { useConfirmacion } from '@/componentes/ui/ModalConfirmacion';
import { toastError } from '@/lib/toast';

const CATEGORIAS = [
  { valor: 'CORDON',         etiqueta: 'Cordón' },
  { valor: 'BORDE_ONDULADO', etiqueta: 'Borde ondulado' },
  { valor: 'OTRO',           etiqueta: 'Otro' },
];

const UNIDADES = [
  { valor: 'M',   etiqueta: 'Metro (m)' },
  { valor: 'ML',  etiqueta: 'Metro lineal (ml)' },
  { valor: 'UDS', etiqueta: 'Unidades (uds)' },
  { valor: 'KG',  etiqueta: 'Kilogramos (kg)' },
];

const etiquetaCategoria = v => CATEGORIAS.find(c => c.valor === v)?.etiqueta ?? v;
const etiquetaUnidad    = v => UNIDADES.find(u => u.valor === v)?.etiqueta ?? v;

const INICIAL = {
  nombre: '', categoria: 'OTRO', unidad: 'UDS',
  precioUnitario: '', costoUnitario: '', fabricante: '',
  descripcion: '', activo: true, subfamiliaId: null,
};

function FormularioArticulo({ datos, onChange, guardando, error }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="form-control">
        <label className="label"><span className="label-text font-medium">Nombre *</span></label>
        <input className="input input-bordered" value={datos.nombre}
          onChange={e => onChange('nombre', e.target.value)} required placeholder="Ej: Cordón PVC 8mm negro" />
      </div>

      <div className="form-control">
        <label className="label"><span className="label-text font-medium">Familia / Subfamilia</span></label>
        <SelectorFamiliaSubfamilia value={datos.subfamiliaId} onChange={id => onChange('subfamiliaId', id)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="form-control">
          <label className="label"><span className="label-text font-medium">Categoría *</span></label>
          <select className="select select-bordered" value={datos.categoria}
            onChange={e => onChange('categoria', e.target.value)}>
            {CATEGORIAS.map(c => <option key={c.valor} value={c.valor}>{c.etiqueta}</option>)}
          </select>
        </div>
        <div className="form-control">
          <label className="label"><span className="label-text font-medium">Unidad *</span></label>
          <select className="select select-bordered" value={datos.unidad}
            onChange={e => onChange('unidad', e.target.value)}>
            {UNIDADES.map(u => <option key={u.valor} value={u.valor}>{u.etiqueta}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="form-control">
          <label className="label"><span className="label-text font-medium">Precio (€) *</span></label>
          <input className="input input-bordered" type="number" min="0" step="0.01"
            value={datos.precioUnitario} onChange={e => onChange('precioUnitario', e.target.value)} placeholder="0.00" />
        </div>
        <div className="form-control">
          <label className="label"><span className="label-text">Coste (€)</span></label>
          <input className="input input-bordered" type="number" min="0" step="0.01"
            value={datos.costoUnitario} onChange={e => onChange('costoUnitario', e.target.value)} placeholder="0.00" />
        </div>
      </div>

      <div className="form-control">
        <label className="label"><span className="label-text">Fabricante / Proveedor</span></label>
        <input className="input input-bordered" value={datos.fabricante}
          onChange={e => onChange('fabricante', e.target.value)} placeholder="Opcional" />
      </div>

      <div className="form-control">
        <label className="label"><span className="label-text">Descripción</span></label>
        <textarea className="textarea textarea-bordered" rows={2} value={datos.descripcion}
          onChange={e => onChange('descripcion', e.target.value)} placeholder="Notas del artículo" />
      </div>

      <div className="form-control">
        <label className="label cursor-pointer justify-start gap-3">
          <input type="checkbox" className="checkbox" checked={datos.activo}
            onChange={e => onChange('activo', e.target.checked)} />
          <span className="label-text">Activo</span>
        </label>
      </div>

      {error && <div className="alert alert-error text-sm">{error}</div>}
    </div>
  );
}

export default function ArticulosPage() {
  const { data: articulos = [], isLoading } = useSWR('/api/articulos-simples?inactivos=true');
  const { data: familias = [] }              = useSWR('/api/familias');
  const { confirmar, ModalConfirmacion }     = useConfirmacion();

  const [busqueda, setBusqueda]         = useState('');
  const [filtroFamilia, setFiltroFamilia] = useState('');
  const [modal, setModal]               = useState(null); // null | 'nuevo' | { ...articulo }
  const [form, setForm]                 = useState(INICIAL);
  const [guardando, setGuardando]       = useState(false);
  const [error, setError]               = useState(null);

  function setField(key, val) { setForm(f => ({ ...f, [key]: val })); }

  function abrirNuevo() { setForm(INICIAL); setError(null); setModal('nuevo'); }
  function abrirEditar(a) {
    setForm({
      nombre: a.nombre, categoria: a.categoria, unidad: a.unidad,
      precioUnitario: a.precioUnitario ?? '', costoUnitario: a.costoUnitario ?? '',
      fabricante: a.fabricante ?? '', descripcion: a.descripcion ?? '',
      activo: a.activo ?? true, subfamiliaId: a.subfamiliaId ?? null,
    });
    setError(null);
    setModal(a);
  }
  function cerrar() { setModal(null); }

  async function guardar(e) {
    e.preventDefault();
    if (!form.nombre.trim()) return;
    setGuardando(true); setError(null);
    const esEdicion = modal && modal !== 'nuevo';
    const url    = esEdicion ? `/api/articulos-simples/${modal.id}` : '/api/articulos-simples';
    const method = esEdicion ? 'PATCH' : 'POST';
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: form.nombre.trim(),
          categoria: form.categoria,
          unidad: form.unidad,
          precioUnitario: parseFloat(form.precioUnitario) || 0,
          costoUnitario: form.costoUnitario !== '' ? parseFloat(form.costoUnitario) : null,
          fabricante: form.fabricante.trim() || null,
          descripcion: form.descripcion.trim() || null,
          activo: form.activo,
          subfamiliaId: form.subfamiliaId ?? null,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message || 'Error'); }
      mutate('/api/articulos-simples?inactivos=true');
      cerrar();
    } catch (e) { setError(e.message); }
    finally { setGuardando(false); }
  }

  async function eliminar(a) {
    const ok = await confirmar({ titulo: `Eliminar "${a.nombre}"`, mensaje: 'Esta acción no se puede deshacer.' });
    if (!ok) return;
    try {
      const res = await fetch(`/api/articulos-simples/${a.id}`, { method: 'DELETE' });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message || 'Error'); }
      mutate('/api/articulos-simples?inactivos=true');
    } catch (e) { toastError(e.message); }
  }

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase();
    return articulos.filter(a => {
      if (q && !a.nombre?.toLowerCase().includes(q) &&
          !(a.subfamilia?.nombre ?? '').toLowerCase().includes(q) &&
          !(a.categoria ?? '').toLowerCase().includes(q)) return false;
      if (filtroFamilia && a.subfamilia?.familia?.id !== filtroFamilia) return false;
      return true;
    });
  }, [articulos, busqueda, filtroFamilia]);

  return (
    <div className="container mx-auto p-4">
      <ModalConfirmacion />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Box className="w-8 h-8" /> Artículos varios
        </h1>
        <div className="flex gap-2 items-center flex-wrap">
          <select className="select select-bordered select-sm" value={filtroFamilia}
            onChange={e => setFiltroFamilia(e.target.value)}>
            <option value="">Todas las familias</option>
            {familias.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
          </select>
          <input type="text" className="input input-bordered input-sm w-52"
            placeholder="Buscar por nombre, subfamilia…"
            value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          <button onClick={abrirNuevo} className="btn btn-primary btn-sm">
            <PlusCircle className="w-4 h-4" /> Nuevo
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="card bg-base-100 shadow-xl overflow-x-auto">
        <table className="table table-sm table-zebra w-full">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-base-content/50">
              <th>Nombre</th>
              <th>Subfamilia</th>
              <th>Categoría</th>
              <th>Unidad</th>
              <th>Precio</th>
              <th>Fabricante</th>
              <th>Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={8} className="text-center py-10"><span className="loading loading-spinner" /></td></tr>
            )}
            {!isLoading && filtrados.length === 0 && (
              <tr><td colSpan={8} className="text-center py-10 text-base-content/30">Sin artículos</td></tr>
            )}
            {filtrados.map(a => (
              <tr key={a.id} className="hover">
                <td className="font-medium">{a.nombre}</td>
                <td>
                  {a.subfamilia ? (
                    <span className="badge badge-sm font-medium"
                      style={a.subfamilia.familia?.color ? {
                        backgroundColor: a.subfamilia.familia.color + '22',
                        color: a.subfamilia.familia.color,
                        borderColor: a.subfamilia.familia.color + '55',
                      } : {}}>
                      {a.subfamilia.nombre}
                    </span>
                  ) : <span className="text-base-content/30">—</span>}
                </td>
                <td className="text-sm">{etiquetaCategoria(a.categoria)}</td>
                <td className="text-sm">{etiquetaUnidad(a.unidad)}</td>
                <td className="font-mono text-sm">{Number(a.precioUnitario).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
                <td className="text-sm">{a.fabricante ?? <span className="text-base-content/30">—</span>}</td>
                <td>
                  <span className={`badge badge-sm ${a.activo ? 'badge-success' : 'badge-ghost'}`}>
                    {a.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td>
                  <div className="flex gap-1">
                    <button className="btn btn-ghost btn-xs text-info" onClick={() => abrirEditar(a)}><Edit2 className="w-3.5 h-3.5" /></button>
                    <button className="btn btn-ghost btn-xs text-error" onClick={() => eliminar(a)}><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtrados.length > 0 && (
        <p className="text-xs text-base-content/40 mt-2 text-right">{filtrados.length} artículos</p>
      )}

      {/* Modal crear/editar */}
      {modal && (
        <div className="modal modal-open">
          <div className="modal-box w-11/12 max-w-lg">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Box className="w-5 h-5" />
              {modal === 'nuevo' ? 'Nuevo artículo' : `Editar: ${modal.nombre}`}
            </h3>
            <form onSubmit={guardar}>
              <FormularioArticulo datos={form} onChange={setField} guardando={guardando} error={error} />
              <div className="modal-action mt-4">
                <button type="button" onClick={cerrar} className="btn">Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={guardando || !form.nombre.trim()}>
                  {guardando ? <span className="loading loading-spinner loading-xs" /> : <Check className="w-4 h-4" />}
                  {modal === 'nuevo' ? 'Crear' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
          <div className="modal-backdrop" onClick={cerrar} />
        </div>
      )}
    </div>
  );
}
