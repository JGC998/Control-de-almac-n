"use client";
import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import useSWR, { mutate } from 'swr';
import Link from 'next/link';
import {
  Star, ArrowLeft, Layers, Ruler, Package,
  Plus, Pencil, Trash2, Save, X,
} from 'lucide-react';
import { fetcher } from '@/lib/fetcher';
import { formatCurrency } from '@/utils/utilidades';
import { toastError, toast } from '@/lib/toast';

const FORM_VACIO = { ancho: '', largo: '', cantidad: '', descripcion: '' };

function fmtDim(v) {
  return v != null ? `${Number(v).toLocaleString('es-ES')} mm` : '—';
}

export default function EstrellaFichaPage() {
  const { id } = useParams();

  // Producto con datos básicos (reutilizamos la ruta de producto)
  const { data: producto, isLoading: loadProd } = useSWR(
    id ? `/api/productos/${id}` : null,
    fetcher,
  );

  // Medidas de corte
  const medidasKey = id ? `/api/estrella-medidas?productoId=${id}` : null;
  const { data: medidas, isLoading: loadMedidas } = useSWR(medidasKey, fetcher);

  // Form inline
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  const abrirNueva = () => {
    setForm(FORM_VACIO);
    setEditandoId(null);
    setErrMsg('');
    setMostrarForm(true);
  };

  const abrirEditar = (m) => {
    setForm({
      ancho: String(m.ancho),
      largo: String(m.largo),
      cantidad: String(m.cantidad),
      descripcion: m.descripcion ?? '',
    });
    setEditandoId(m.id);
    setErrMsg('');
    setMostrarForm(true);
  };

  const cerrarForm = () => { setMostrarForm(false); setEditandoId(null); setErrMsg(''); };

  const handleGuardar = async (e) => {
    e.preventDefault();
    if (!form.ancho || !form.largo || !form.cantidad) {
      setErrMsg('Ancho, largo y cantidad son obligatorios.');
      return;
    }
    setGuardando(true);
    setErrMsg('');
    try {
      const url = editandoId ? `/api/estrella-medidas/${editandoId}` : '/api/estrella-medidas';
      const method = editandoId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, productoId: id }),
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Error');
      await mutate(medidasKey);
      cerrarForm();
      toast(editandoId ? 'Medida actualizada' : 'Medida añadida');
    } catch (err) {
      setErrMsg(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (medidaId) => {
    if (!confirm('¿Eliminar esta medida?')) return;
    try {
      const res = await fetch(`/api/estrella-medidas/${medidaId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).message);
      await mutate(medidasKey);
      toast('Medida eliminada');
    } catch (err) {
      toastError('Error: ' + err.message);
    }
  };

  if (loadProd) {
    return (
      <div className="flex justify-center py-24">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (!producto) {
    return (
      <div className="p-6">
        <div role="alert" className="alert alert-error max-w-md">
          <span>Producto no encontrado.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">

      {/* Volver */}
      <Link href="/almacen/estrellas" className="btn btn-ghost btn-sm gap-1.5 -ml-2">
        <ArrowLeft className="w-4 h-4" /> Estrellas
      </Link>

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="p-3 bg-warning/10 rounded-xl shrink-0">
          <Star className="w-8 h-8 text-warning" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold leading-tight">{producto.nombre}</h1>
          {producto.referenciaFabricante && (
            <p className="text-sm text-base-content/50 font-mono mt-0.5">{producto.referenciaFabricante}</p>
          )}
        </div>
        <Link href={`/gestion/productos/${id}`} className="btn btn-sm btn-ghost shrink-0 gap-1">
          <Package className="w-3.5 h-3.5" /> Ver ficha completa
        </Link>
      </div>

      {/* Datos del producto */}
      <div className="card bg-base-100 shadow border border-base-200">
        <div className="card-body py-4">
          <h2 className="card-title text-sm text-base-content/60 font-semibold uppercase tracking-wide mb-2">
            Datos del producto
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Material', value: producto.material?.nombre ?? '—', icon: Layers },
              { label: 'Espesor', value: producto.espesor ? `${producto.espesor} mm` : '—', icon: Ruler },
              { label: 'Ancho', value: fmtDim(producto.ancho), icon: Ruler },
              { label: 'Largo', value: fmtDim(producto.largo), icon: Ruler },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label}>
                <p className="text-xs text-base-content/40 flex items-center gap-1 mb-0.5">
                  <Icon className="w-3 h-3" /> {label}
                </p>
                <p className="font-semibold text-sm font-mono">{value}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3 pt-3 border-t border-base-200">
            <div>
              <p className="text-xs text-base-content/40 mb-0.5">Precio venta</p>
              <p className="font-bold text-sm">{formatCurrency(producto.precioUnitario)}</p>
            </div>
            <div>
              <p className="text-xs text-base-content/40 mb-0.5">Peso unitario</p>
              <p className="font-semibold text-sm font-mono">{producto.pesoUnitario} kg</p>
            </div>
            {producto.subfamilia && (
              <div>
                <p className="text-xs text-base-content/40 mb-0.5">Subfamilia</p>
                <p className="font-semibold text-sm">{producto.subfamilia.nombre}</p>
              </div>
            )}
            {producto.color && (
              <div>
                <p className="text-xs text-base-content/40 mb-0.5">Color</p>
                <p className="font-semibold text-sm">{producto.color}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Medidas de plancha */}
      <div className="card bg-base-100 shadow border border-base-200">
        <div className="card-body py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="card-title text-base">Medidas de plancha</h2>
              <p className="text-xs text-base-content/50 mt-0.5">
                Qué tamaño de plancha necesitas para sacar X unidades de esta estrella.
              </p>
            </div>
            <button className="btn btn-sm btn-warning gap-1" onClick={abrirNueva}>
              <Plus className="w-4 h-4" /> Añadir medida
            </button>
          </div>

          {/* Formulario inline */}
          {mostrarForm && (
            <div className="bg-base-200 rounded-xl p-4 mb-4 border border-base-300">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">{editandoId ? 'Editar medida' : 'Nueva medida'}</h3>
                <button className="btn btn-xs btn-ghost" onClick={cerrarForm}><X className="w-3.5 h-3.5" /></button>
              </div>
              <form onSubmit={handleGuardar} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="form-control">
                  <label className="label py-1"><span className="label-text text-xs">Ancho plancha (mm)</span></label>
                  <input
                    type="number" className="input input-bordered input-sm"
                    placeholder="Ej: 600" min={1} step={1}
                    value={form.ancho} onChange={e => setForm(f => ({ ...f, ancho: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-control">
                  <label className="label py-1"><span className="label-text text-xs">Largo plancha (mm)</span></label>
                  <input
                    type="number" className="input input-bordered input-sm"
                    placeholder="Ej: 2000" min={1} step={1}
                    value={form.largo} onChange={e => setForm(f => ({ ...f, largo: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-control">
                  <label className="label py-1"><span className="label-text text-xs">Uds. estrellas</span></label>
                  <input
                    type="number" className="input input-bordered input-sm"
                    placeholder="Ej: 10" min={1} step={1}
                    value={form.cantidad} onChange={e => setForm(f => ({ ...f, cantidad: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-control">
                  <label className="label py-1"><span className="label-text text-xs">Nota (opcional)</span></label>
                  <input
                    type="text" className="input input-bordered input-sm"
                    placeholder="Ej: grandes con merma"
                    value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                  />
                </div>
                <div className="col-span-2 sm:col-span-4 flex gap-2 justify-end">
                  <button type="submit" className="btn btn-sm btn-warning" disabled={guardando}>
                    {guardando ? <span className="loading loading-spinner loading-xs" /> : <Save className="w-3.5 h-3.5" />}
                    Guardar
                  </button>
                  <button type="button" className="btn btn-sm btn-ghost" onClick={cerrarForm}>Cancelar</button>
                </div>
              </form>
              {errMsg && <p className="text-error text-xs mt-2">{errMsg}</p>}
            </div>
          )}

          {/* Tabla de medidas */}
          {loadMedidas ? (
            <div className="flex justify-center py-6"><span className="loading loading-spinner loading-sm" /></div>
          ) : !medidas || medidas.length === 0 ? (
            <div className="text-center py-10 text-base-content/40">
              <Star className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm">Sin medidas configuradas. Añade la primera.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-sm w-full">
                <thead>
                  <tr>
                    <th>Plancha</th>
                    <th className="text-center">Uds. estrellas</th>
                    <th>Nota</th>
                    <th className="text-right text-xs text-base-content/40">Rendimiento</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {medidas.map(m => {
                    const areaM2 = (m.ancho / 1000) * (m.largo / 1000);
                    const rendimiento = areaM2 > 0 ? (m.cantidad / areaM2).toFixed(1) : null;
                    return (
                      <tr key={m.id} className="hover">
                        <td>
                          <span className="font-mono font-semibold">
                            {Number(m.ancho).toLocaleString('es-ES')} × {Number(m.largo).toLocaleString('es-ES')} mm
                          </span>
                          <span className="text-xs text-base-content/40 ml-2">
                            ({areaM2.toFixed(3)} m²)
                          </span>
                        </td>
                        <td className="text-center">
                          <span className="badge badge-warning font-bold">{m.cantidad}</span>
                        </td>
                        <td className="text-sm text-base-content/60">{m.descripcion ?? <span className="opacity-30">—</span>}</td>
                        <td className="text-right text-xs font-mono text-base-content/40">
                          {rendimiento ? `${rendimiento} ud/m²` : '—'}
                        </td>
                        <td className="text-right">
                          <div className="flex gap-0.5 justify-end">
                            <button className="btn btn-xs btn-ghost" onClick={() => abrirEditar(m)} title="Editar">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button className="btn btn-xs btn-ghost text-error" onClick={() => handleEliminar(m.id)} title="Eliminar">
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
          )}
        </div>
      </div>
    </div>
  );
}
