"use client";
import { useState, useMemo } from 'react';
import Link from 'next/link';
import useSWR, { mutate } from 'swr';
import {
  Package, PlusCircle, Edit, Trash2,
  ChevronUp, ChevronDown, ChevronsUpDown,
  CheckSquare, X, Layers, Archive, RotateCcw, Download, Copy, Check, Printer,
} from 'lucide-react';
import { generarCodigo } from '@/lib/producto-utils';
import { toastError } from '@/lib/toast';

import FormularioProductoInteligente from '@/componentes/productos/FormularioProductoInteligente';
import SelectorFamiliaSubfamilia from '@/componentes/productos/SelectorFamiliaSubfamilia';
import ModalImprimirEtiquetas from '@/componentes/modales/ModalImprimirEtiquetas';
import { useConfirmacion } from '@/componentes/ui/ModalConfirmacion';
import { ContenedorCargando } from '@/componentes/ui';

const COLUMNAS = [
  { key: 'nombre',         label: 'Nombre',   tipo: 'string' },
  { key: '_codigo',        label: 'Código',   tipo: 'string' },
  { key: 'material',       label: 'Material', tipo: 'string' },
  { key: 'acabado',        label: 'Acabado',  tipo: 'string' },
  { key: 'espesor',        label: 'Espesor',  tipo: 'number' },
  { key: 'ancho',          label: 'Ancho',    tipo: 'number' },
  { key: 'largo',          label: 'Largo',    tipo: 'number' },
  { key: 'precioUnitario', label: 'Precio',   tipo: 'number' },
  { key: 'pesoUnitario',   label: 'Peso',     tipo: 'number' },
];


function valorOrden(p, key, nomConfig = {}) {
  if (key === 'material') return p.material?.nombre ?? '';
  if (key === '_codigo')  return generarCodigo(p, nomConfig);
  return p[key];
}

function comparar(a, b, key, tipo, dir, nomConfig = {}) {
  const va = valorOrden(a, key, nomConfig);
  const vb = valorOrden(b, key, nomConfig);
  const aNulo = va == null || va === '';
  const bNulo = vb == null || vb === '';
  if (aNulo && bNulo) return 0;
  if (aNulo) return dir === 'asc' ? -1 : 1;
  if (bNulo) return dir === 'asc' ? 1 : -1;
  let cmp = tipo === 'number'
    ? Number(va) - Number(vb)
    : String(va).localeCompare(String(vb), 'es', { sensitivity: 'base', numeric: true });
  return dir === 'asc' ? cmp : -cmp;
}

function IconoOrden({ campo, sort }) {
  if (sort.campo !== campo) return <ChevronsUpDown className="w-3 h-3 opacity-30" />;
  return sort.dir === 'asc'
    ? <ChevronUp className="w-3 h-3 text-primary" />
    : <ChevronDown className="w-3 h-3 text-primary" />;
}

function PanelClasificacionMasiva({ seleccion, onAplicar, onCancelar, onImprimirEtiquetas }) {
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
          <SelectorFamiliaSubfamilia value={subfamiliaId} onChange={setSubfamiliaId} compact />
          <button
            className="btn btn-primary btn-sm gap-1"
            onClick={aplicar}
            disabled={aplicando || !subfamiliaId}
          >
            {aplicando ? <span className="loading loading-spinner loading-xs" /> : <Layers className="w-4 h-4" />}
            Clasificar {seleccion.size}
          </button>
          <button
            className="btn btn-outline btn-sm gap-1"
            onClick={onImprimirEtiquetas}
            title="Imprimir etiquetas en A4 — elige cuántas copias de cada referencia"
          >
            <Printer className="w-4 h-4" />
            Etiquetas ({seleccion.size})
          </button>
          {error && <span className="text-error text-sm">{error}</span>}
        </div>
        <button onClick={onCancelar} className="btn btn-ghost btn-sm btn-square shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function GestionProductosPage() {
  const [tab, setTab] = useState('activos'); // 'activos' | 'archivados'

  const { data: dataActivos,    isLoading: loadA, error: errA } = useSWR('/api/productos?page=1&limit=500&activo=true');
  const { data: dataArchivados, isLoading: loadB, error: errB } = useSWR('/api/productos?page=1&limit=500&activo=false');
  const { data: nomenclatura } = useSWR('/api/configuracion/nomenclatura');
  const nomConfig = nomenclatura ?? {};

  const productosActivos    = dataActivos?.data    ?? [];
  const productosArchivados = dataArchivados?.data ?? [];
  const productos = tab === 'activos' ? productosActivos : productosArchivados;

  const [modalAbierto, setModalAbierto]         = useState(false);
  const [productoEditando, setProductoEditando] = useState(null);
  const [busqueda, setBusqueda]                 = useState('');
  const [sort, setSort]                         = useState({ campo: null, dir: 'asc' });
  const [seleccion, setSeleccion]               = useState(new Set());
  const [copiado, setCopiado]                   = useState(null);
  const [modalEtiquetasAbierto, setModalEtiquetasAbierto] = useState(false);
  const { confirmar, ModalConfirmacion }         = useConfirmacion();

  function copiarCodigo(e, p) {
    e.stopPropagation();
    const code = generarCodigo(p, nomConfig);
    if (!code) return;
    // navigator.clipboard requiere HTTPS; fallback para HTTP (red local)
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code).catch(() => copiarFallback(code));
    } else {
      copiarFallback(code);
    }
    setCopiado(p.id);
    setTimeout(() => setCopiado(null), 1500);
  }

  function copiarFallback(text) {
    const el = document.createElement('textarea');
    el.value = text;
    el.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
    document.body.appendChild(el);
    el.select();
    try { document.execCommand('copy'); } catch { /* silencioso */ }
    document.body.removeChild(el);
  }

  const isLoading = tab === 'activos' ? loadA : loadB;
  const error     = tab === 'activos' ? errA  : errB;

  function toggleSort(key, tipo) {
    setSort(prev =>
      prev.campo === key
        ? { campo: key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { campo: key, dir: 'asc', tipo }
    );
  }

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    let lista = productos.filter(p => {
      if (!q) return true;
      return (
        p.nombre?.toLowerCase().includes(q) ||
        (p.material?.nombre ?? '').toLowerCase().includes(q) ||
        (p.acabado ?? '').toLowerCase().includes(q)
      );
    });
    if (sort.campo) {
      const col = COLUMNAS.find(c => c.key === sort.campo);
      lista = [...lista].sort((a, b) => comparar(a, b, sort.campo, col?.tipo, sort.dir, nomConfig));
    }
    return lista;
  }, [productos, busqueda, sort]);

  function toggleSeleccion(id) {
    setSeleccion(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleTodos() {
    setSeleccion(seleccion.size === filtrados.length
      ? new Set()
      : new Set(filtrados.map(p => p.id))
    );
  }

  function abrirNuevo()    { setProductoEditando(null); setModalAbierto(true); }
  function abrirEditar(p)  { setProductoEditando(p);    setModalAbierto(true); }
  function cerrar()        { setModalAbierto(false); setProductoEditando(null); }

  function invalidarProductos() {
    mutate(key => typeof key === 'string' && key.startsWith('/api/productos'));
  }

  function onGuardado()      { invalidarProductos(); cerrar(); }
  function onAplicarMasivo() { setSeleccion(new Set()); invalidarProductos(); }

  async function toggleActivo(p, e) {
    e.stopPropagation();
    const archivando = p.activo;
    if (archivando) {
      const ok = await confirmar({
        titulo: '¿Archivar producto?',
        mensaje: 'El producto quedará oculto del listado activo pero seguirá disponible para pedidos anteriores y nuevos.',
      });
      if (!ok) return;
    }
    await fetch(`/api/productos/${p.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: !p.activo }),
    });
    invalidarProductos();
  }

  async function eliminar(id) {
    const ok = await confirmar({
      titulo: '¿Eliminar producto?',
      mensaje: 'Esta acción no se puede deshacer.',
      variante: 'peligro',
    });
    if (!ok) return;
    await fetch(`/api/productos/${id}`, { method: 'DELETE' });
    invalidarProductos();
  }

  const todosMarcados  = filtrados.length > 0 && seleccion.size === filtrados.length;
  const algunoMarcado  = seleccion.size > 0 && seleccion.size < filtrados.length;

  return (
    <div className={`container mx-auto p-4 ${seleccion.size > 0 ? 'pb-24' : ''}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Package className="w-6 h-6" /> Productos
        </h1>
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o material…"
            className="input input-bordered input-sm w-56"
          />
          <a
            href={`/api/productos/export?activo=${tab === 'activos' ? 'true' : 'false'}`}
            className="btn btn-ghost btn-sm btn-square"
            title="Descargar CSV"
          >
            <Download className="w-4 h-4" />
          </a>
          <button onClick={abrirNuevo} className="btn btn-primary btn-sm gap-1">
            <PlusCircle className="w-4 h-4" /> Nuevo
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs tabs-boxed mb-4 w-fit">
        <button
          className={`tab gap-2 ${tab === 'activos' ? 'tab-active' : ''}`}
          onClick={() => { setTab('activos'); setSeleccion(new Set()); setBusqueda(''); }}
        >
          Activos
          {!loadA && <span className="badge badge-sm">{productosActivos.length}</span>}
        </button>
        <button
          className={`tab gap-2 ${tab === 'archivados' ? 'tab-active' : ''}`}
          onClick={() => { setTab('archivados'); setSeleccion(new Set()); setBusqueda(''); }}
        >
          <Archive className="w-3.5 h-3.5" /> Archivados
          {!loadB && productosArchivados.length > 0 && (
            <span className="badge badge-sm badge-neutral">{productosArchivados.length}</span>
          )}
        </button>
      </div>

      {/* Tabla */}
      <ContenedorCargando isLoading={isLoading} error={error}>
        <div className="card bg-base-100 shadow overflow-x-auto">
          <table className="table table-sm table-zebra w-full">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-base-content/50">
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
                <tr>
                  <td colSpan={11} className="text-center py-12 text-base-content/30">
                    {busqueda ? 'Sin resultados para esa búsqueda' : tab === 'activos' ? 'No hay productos activos' : 'No hay productos archivados'}
                  </td>
                </tr>
              )}
              {filtrados.map(p => {
                const incompleto = tab === 'activos' && (p.espesor == null || p.ancho == null || p.largo == null || !p.precioUnitario);
                const marcado    = seleccion.has(p.id);
                return (
                  <tr
                    key={p.id}
                    className={`hover cursor-pointer${incompleto ? ' opacity-70' : ''}${marcado ? ' bg-primary/10' : ''}`}
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
                    <td onClick={e => copiarCodigo(e, p)} title={copiado === p.id ? 'Copiado ✓' : 'Copiar código'}>
                      {(() => {
                        const code = generarCodigo(p, nomConfig);
                        if (!code) return <span className="text-base-content/30">—</span>;
                        return (
                          <span className="inline-flex items-center gap-1 font-mono text-xs bg-base-200 px-1.5 py-0.5 rounded cursor-copy hover:bg-primary/10 hover:text-primary transition-colors">
                            {copiado === p.id
                              ? <Check className="w-3 h-3 text-success shrink-0" />
                              : <Copy className="w-3 h-3 opacity-40 shrink-0" />
                            }
                            {code}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="text-sm">{p.material?.nombre ?? <span className="text-base-content/30">—</span>}</td>
                    <td className="text-sm">{p.acabado ?? <span className="text-base-content/30">—</span>}</td>
                    <td className={p.espesor == null ? 'text-warning' : ''}>{p.espesor != null ? `${p.espesor} mm` : '—'}</td>
                    <td className={p.ancho == null   ? 'text-warning' : ''}>{p.ancho   != null ? `${p.ancho} mm`   : '—'}</td>
                    <td className={p.largo == null   ? 'text-warning' : ''}>{p.largo   != null ? `${p.largo} mm`   : '—'}</td>
                    <td className={!p.precioUnitario ? 'text-warning' : ''}>
                      {p.precioUnitario != null ? `${Number(p.precioUnitario).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €` : '—'}
                    </td>
                    <td>{p.pesoUnitario != null ? `${Number(p.pesoUnitario).toLocaleString('es-ES', { minimumFractionDigits: 2 })} kg` : '—'}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={e => toggleActivo(p, e)}
                          className={`btn btn-ghost btn-xs ${tab === 'archivados' ? 'text-success' : 'text-base-content/40 hover:text-warning'}`}
                          title={tab === 'archivados' ? 'Restaurar a activos' : 'Archivar producto'}
                        >
                          {tab === 'archivados' ? <RotateCcw className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                        </button>
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

      {/* Panel clasificación masiva (solo en tab activos) */}
      {seleccion.size > 0 && tab === 'activos' && (
        <PanelClasificacionMasiva
          seleccion={seleccion}
          onAplicar={onAplicarMasivo}
          onCancelar={() => setSeleccion(new Set())}
          onImprimirEtiquetas={() => setModalEtiquetasAbierto(true)}
        />
      )}

      {/* Modal editar/crear */}
      {modalAbierto && (
        <div className="modal modal-open">
          <div className="modal-box w-11/12 max-w-lg overflow-y-auto max-h-[90vh]">
            <button
              type="button"
              onClick={cerrar}
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
            >✕</button>
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

      {modalEtiquetasAbierto && (
        <ModalImprimirEtiquetas
          productos={filtrados.filter(p => seleccion.has(p.id))}
          onCerrar={() => setModalEtiquetasAbierto(false)}
        />
      )}

      <ModalConfirmacion />
    </div>
  );
}
