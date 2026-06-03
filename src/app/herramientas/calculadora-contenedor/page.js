"use client";
import React, { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { Package2, Plus, Trash2, Calculator, Info, Save, History, X, ChevronDown, ChevronUp } from 'lucide-react';

import { fetcher } from '@/lib/fetcher';

const nuevaBobina = (id) => ({
  id,
  referencia: '',
  espesor: '',
  ancho: '',
  longitud: '',
  numRollos: '1',
  precio: '',
  unidadPrecio: 'M', // 'M' = USD/metro lineal | 'SQM' = USD/m²
});

const n = (v) => parseFloat(v) || 0;
const fmt = (v, dec = 2) => isFinite(v) ? v.toFixed(dec) : '0.00';
const fmtEur = (v) => `${fmt(v)} €`;
const fmtUsd = (v) => `${fmt(v)} $`;

function ModalGuardar({ datos, onClose }) {
  const [descripcion, setDescripcion] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/importaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...datos, descripcion: descripcion.trim() || null }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Error al guardar');
      mutate('/api/importaciones');
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal modal-open z-50">
      <div className="modal-box max-w-md">
        <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" onClick={onClose}><X className="w-4 h-4" /></button>
        <h3 className="font-bold text-lg mb-4">Guardar importación</h3>

        <div className="space-y-3 mb-4 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-base-200 rounded p-2">
              <p className="text-xs text-base-content/50">Bobinas</p>
              <p className="font-mono font-bold">{fmtEur(datos.totalBobinasEUR)}</p>
              <p className="text-xs text-base-content/40">{fmtUsd(datos.totalBobinasUSD)}</p>
            </div>
            <div className="bg-base-200 rounded p-2">
              <p className="text-xs text-base-content/50">Coste producto</p>
              <p className="font-mono font-bold text-success">{fmtEur(datos.costeProducto)}</p>
            </div>
            <div className="bg-base-200 rounded p-2">
              <p className="text-xs text-base-content/50">Metros totales</p>
              <p className="font-mono font-bold">{fmt(datos.totalMetros, 0)} m</p>
            </div>
            <div className="bg-base-200 rounded p-2">
              <p className="text-xs text-base-content/50">€ / metro medio</p>
              <p className="font-mono font-bold text-success">
                {datos.totalMetros > 0 ? fmtEur(datos.costeProducto / datos.totalMetros) : '—'}/m
              </p>
            </div>
          </div>
        </div>

        <div className="form-control mb-4">
          <label className="label py-1"><span className="label-text text-sm">Descripción (opcional)</span></label>
          <input
            type="text"
            className="input input-bordered"
            placeholder="Ej: Contenedor enero 2026, proveedor X"
            value={descripcion}
            onChange={e => setDescripcion(e.target.value)}
            autoFocus
            onKeyDown={e => e.key === 'Enter' && handleSave()}
          />
        </div>

        {error && <div className="alert alert-error py-2 text-sm mb-3">{error}</div>}

        <div className="modal-action">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary gap-2" onClick={handleSave} disabled={saving}>
            {saving ? <span className="loading loading-spinner loading-sm" /> : <Save className="w-4 h-4" />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

function HistorialImportaciones({ onCargar }) {
  const { data: importaciones, isLoading } = useSWR('/api/importaciones', fetcher);
  const [abierto, setAbierto] = useState(false);

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta importación del historial?')) return;
    await fetch(`/api/importaciones/${id}`, { method: 'DELETE' });
    mutate('/api/importaciones');
  };

  return (
    <div className="card bg-base-200 shadow-sm mt-6">
      <div className="card-body p-4">
        <button className="flex items-center justify-between w-full text-left" onClick={() => setAbierto(p => !p)}>
          <h2 className="font-bold text-base flex items-center gap-2">
            <History className="w-4 h-4" /> Historial de importaciones guardadas
            {importaciones?.length > 0 && <span className="badge badge-ghost badge-sm">{importaciones.length}</span>}
          </h2>
          {abierto ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {abierto && (
          <div className="mt-4">
            {isLoading && <span className="loading loading-spinner loading-sm" />}
            {!isLoading && importaciones?.length === 0 && (
              <p className="text-sm text-base-content/40">No hay importaciones guardadas todavía.</p>
            )}
            {importaciones?.length > 0 && (
              <div className="overflow-x-auto">
                <table className="table table-sm w-full">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Descripción</th>
                      <th className="text-right">TC</th>
                      <th className="text-right">Suplidos</th>
                      <th className="text-right">Exentos</th>
                      <th className="text-right">Sujetos</th>
                      <th className="text-right">Coste producto</th>
                      <th className="text-right">€/metro</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {importaciones.map(imp => (
                      <tr key={imp.id} className="hover">
                        <td className="text-xs text-base-content/50 whitespace-nowrap">
                          {new Date(imp.creadaEn).toLocaleDateString('es-ES')}
                        </td>
                        <td className="max-w-xs truncate text-sm">{imp.descripcion || <span className="text-base-content/30">Sin descripción</span>}</td>
                        <td className="text-right font-mono text-xs">{fmt(imp.tasaCambio, 4)}</td>
                        <td className="text-right font-mono text-xs">{fmtEur(imp.suplidos)}</td>
                        <td className="text-right font-mono text-xs">{fmtEur(imp.exentos)}</td>
                        <td className="text-right font-mono text-xs text-base-content/40">{fmtEur(imp.sujetos)}</td>
                        <td className="text-right font-mono font-bold text-success">{fmtEur(imp.costeProducto)}</td>
                        <td className="text-right font-mono font-bold text-success">
                          {imp.totalMetros > 0 ? fmtEur(imp.costeProducto / imp.totalMetros) + '/m' : '—'}
                        </td>
                        <td>
                          <div className="flex gap-1">
                            <button
                              className="btn btn-xs btn-ghost"
                              title="Cargar estos datos en la calculadora"
                              onClick={() => onCargar(imp)}
                            >
                              Cargar
                            </button>
                            <button
                              className="btn btn-xs btn-ghost text-error"
                              onClick={() => handleDelete(imp.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CalculadoraContenedorPage() {
  const [tasaCambio, setTasaCambio] = useState('0.9300');
  const [bobinas, setBobinas] = useState([nuevaBobina(1)]);
  const [suplidos, setSuplidos] = useState('');
  const [exentos, setExentos] = useState('');
  const [sujetos, setSujetos] = useState('');
  const [nextId, setNextId] = useState(2);
  const [modalGuardar, setModalGuardar] = useState(false);

  const tc = n(tasaCambio);

  // --- Cálculos bobinas ---
  const bobinasCals = bobinas.map(b => {
    const longitud = n(b.longitud);
    const numRollos = n(b.numRollos) || 1;
    const anchoM = n(b.ancho) / 1000;
    const precioEntrada = n(b.precio ?? b.usdPorMetro); // backward compat
    // Convertir a USD/metro lineal según unidad seleccionada
    const usdPorMetro = b.unidadPrecio === 'SQM'
      ? precioEntrada * anchoM
      : precioEntrada;
    const totalMetrosBobina = longitud * numRollos;
    const subtotalUSD = usdPorMetro * totalMetrosBobina;
    const subtotalEUR = subtotalUSD * tc;
    return { ...b, longitud, numRollos, anchoM, precioEntrada, usdPorMetro, totalMetrosBobina, subtotalUSD, subtotalEUR };
  });

  const totalBobinasUSD = bobinasCals.reduce((s, b) => s + b.subtotalUSD, 0);
  const totalBobinasEUR = totalBobinasUSD * tc;
  const totalMetros = bobinasCals.reduce((s, b) => s + b.totalMetrosBobina, 0);

  // --- Gastos ---
  const supl = n(suplidos);
  const exen = n(exentos);
  const suj = n(sujetos);
  const ivaGastos = suj * 0.21;

  // REGLA: suplidos + exentos se repercuten. Sujetos NUNCA entra en el cálculo.
  const gastosRepercutibles = supl + exen;
  const costeProducto = totalBobinasEUR + gastosRepercutibles;
  const totalDesembolso = totalBobinasEUR + supl + exen + suj + ivaGastos;

  // --- Prorrateo por valor ---
  const bobinasFinal = bobinasCals.map(b => {
    if (totalBobinasEUR === 0 || b.subtotalEUR === 0) {
      return { ...b, proporcion: 0, gastosProrrateados: 0, costeFinalEUR: b.subtotalEUR, costePorMetro: 0 };
    }
    const proporcion = b.subtotalEUR / totalBobinasEUR;
    const gastosProrrateados = gastosRepercutibles * proporcion;
    const costeFinalEUR = b.subtotalEUR + gastosProrrateados;
    const costePorMetro = b.totalMetrosBobina > 0 ? costeFinalEUR / b.totalMetrosBobina : 0;
    return { ...b, proporcion, gastosProrrateados, costeFinalEUR, costePorMetro };
  });

  const handleBobinaChange = (id, field, value) => {
    setBobinas(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));
  };

  const addBobina = () => {
    setBobinas(prev => [...prev, nuevaBobina(nextId)]);
    setNextId(id => id + 1);
  };

  const removeBobina = (id) => {
    if (bobinas.length > 1) setBobinas(prev => prev.filter(b => b.id !== id));
  };

  const handleCargarImportacion = (imp) => {
    try {
      const bobs = typeof imp.bobinas === 'string' ? JSON.parse(imp.bobinas) : imp.bobinas;
      if (!Array.isArray(bobs)) throw new Error('Formato inválido');
      setBobinas(bobs.map((b, i) => ({
        ...b,
        id: i + 1,
        precio: b.precio ?? b.usdPorMetro ?? '',
        unidadPrecio: b.unidadPrecio || 'M',
      })));
      setNextId(bobs.length + 1);
      setTasaCambio(String(imp.tasaCambio));
      setSuplidos(String(imp.suplidos));
      setExentos(String(imp.exentos));
      setSujetos(String(imp.sujetos));
    } catch {
      alert('No se pudieron cargar los datos de esta importación.');
    }
  };

  const hayResultados = totalMetros > 0 && bobinasFinal.some(b => b.totalMetrosBobina > 0);

  const datosParaGuardar = {
    tasaCambio: tc,
    totalBobinasUSD,
    totalBobinasEUR,
    totalMetros,
    suplidos: supl,
    exentos: exen,
    sujetos: suj,
    gastosRepercutibles,
    costeProducto,
    totalDesembolso,
    bobinas: JSON.stringify(bobinas),
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Package2 className="w-8 h-8 text-warning" />
          <div>
            <h1 className="text-3xl font-bold">Calculadora de Contenedor</h1>
            <p className="text-sm text-base-content/60">Coste real de importación por metro lineal, prorrateado por valor de cada bobina</p>
          </div>
        </div>
        {hayResultados && (
          <button className="btn btn-success btn-sm gap-2" onClick={() => setModalGuardar(true)}>
            <Save className="w-4 h-4" /> Guardar importación
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── COLUMNA IZQUIERDA ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Tipo de cambio */}
          <div className="card bg-base-200 shadow-sm">
            <div className="card-body p-4">
              <h2 className="font-bold text-base mb-3">Tipo de cambio</h2>
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-sm">1 USD =</span>
                <input
                  type="number" step="0.0001" min="0.0001"
                  value={tasaCambio}
                  onChange={e => setTasaCambio(e.target.value)}
                  className="input input-bordered w-32 font-mono"
                />
                <span className="font-mono text-sm">EUR</span>
                {tc > 0 && (
                  <span className="text-xs text-base-content/40">
                    (1 EUR = {fmt(1 / tc, 4)} USD)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Bobinas */}
          <div className="card bg-base-200 shadow-sm">
            <div className="card-body p-4">
              <div className="flex justify-between items-center mb-3">
                <h2 className="font-bold text-base">Bobinas — datos de la factura del proveedor</h2>
                <button onClick={addBobina} className="btn btn-sm btn-primary gap-1">
                  <Plus className="w-4 h-4" /> Añadir bobina
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="table table-sm w-full">
                  <thead>
                    <tr>
                      <th>Nº bobina</th>
                      <th>Esp. (mm)</th>
                      <th>Ancho (mm)</th>
                      <th>Long./rollo (m)</th>
                      <th>Nº rollos</th>
                      <th>Precio</th>
                      <th className="text-right">Total m</th>
                      <th className="text-right">Total $</th>
                      <th className="text-right">Total €</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {bobinas.map((b, idx) => {
                      const cal = bobinasCals[idx];
                      return (
                        <tr key={b.id}>
                          <td>
                            <input
                              type="text" placeholder={`B${idx + 1}`}
                              value={b.referencia}
                              onChange={e => handleBobinaChange(b.id, 'referencia', e.target.value)}
                              className="input input-sm input-bordered w-16"
                            />
                          </td>
                          <td>
                            <input
                              type="number" step="0.1" min="0" placeholder="—"
                              value={b.espesor}
                              onChange={e => handleBobinaChange(b.id, 'espesor', e.target.value)}
                              className="input input-sm input-bordered w-16 font-mono"
                            />
                          </td>
                          <td>
                            <input
                              type="number" step="1" min="0" placeholder="—"
                              value={b.ancho}
                              onChange={e => handleBobinaChange(b.id, 'ancho', e.target.value)}
                              className="input input-sm input-bordered w-16 font-mono"
                            />
                          </td>
                          <td>
                            <input
                              type="number" step="1" min="0" placeholder="0"
                              value={b.longitud}
                              onChange={e => handleBobinaChange(b.id, 'longitud', e.target.value)}
                              className="input input-sm input-bordered w-20 font-mono"
                            />
                          </td>
                          <td>
                            <input
                              type="number" step="1" min="1" placeholder="1"
                              value={b.numRollos}
                              onChange={e => handleBobinaChange(b.id, 'numRollos', e.target.value)}
                              className="input input-sm input-bordered w-16 font-mono"
                            />
                          </td>
                          <td>
                            <div className="space-y-1">
                              <div className="join">
                                <input
                                  type="number" step="0.0001" min="0" placeholder="0.0000"
                                  value={b.precio}
                                  onChange={e => handleBobinaChange(b.id, 'precio', e.target.value)}
                                  className="input input-sm input-bordered join-item w-20 font-mono"
                                />
                                <button
                                  type="button"
                                  className={`btn btn-xs join-item border border-base-300 ${b.unidadPrecio === 'M' ? 'btn-neutral' : 'btn-ghost text-base-content/40'}`}
                                  onClick={() => handleBobinaChange(b.id, 'unidadPrecio', 'M')}
                                  title="USD por metro lineal"
                                >M</button>
                                <button
                                  type="button"
                                  className={`btn btn-xs join-item border border-base-300 ${b.unidadPrecio === 'SQM' ? 'btn-neutral' : 'btn-ghost text-base-content/40'}`}
                                  onClick={() => handleBobinaChange(b.id, 'unidadPrecio', 'SQM')}
                                  title="USD por metro cuadrado"
                                >SQM</button>
                              </div>
                              {b.unidadPrecio === 'SQM' && n(b.ancho) > 0 && n(b.precio) > 0 && (
                                <p className="text-[10px] text-base-content/50 font-mono">
                                  ≈ {fmt(n(b.precio) * n(b.ancho) / 1000, 4)} USD/M
                                </p>
                              )}
                              {b.unidadPrecio === 'SQM' && !n(b.ancho) && (
                                <p className="text-[10px] text-warning">Introduce el ancho</p>
                              )}
                            </div>
                          </td>
                          <td className="text-right font-mono text-sm">{fmt(cal.totalMetrosBobina, 0)} m</td>
                          <td className="text-right font-mono text-sm">{fmtUsd(cal.subtotalUSD)}</td>
                          <td className="text-right font-mono text-sm">{fmtEur(cal.subtotalEUR)}</td>
                          <td>
                            {bobinas.length > 1 && (
                              <button onClick={() => removeBobina(b.id)} className="btn btn-ghost btn-xs text-error">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="font-bold">
                      <td colSpan={6} className="text-sm">Total</td>
                      <td className="text-right font-mono text-sm">{fmt(totalMetros, 0)} m</td>
                      <td className="text-right font-mono text-sm">{fmtUsd(totalBobinasUSD)}</td>
                      <td className="text-right font-mono text-sm">{fmtEur(totalBobinasEUR)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          {/* Gastos de importación */}
          <div className="card bg-base-200 shadow-sm">
            <div className="card-body p-4">
              <h2 className="font-bold text-base mb-1">Gastos de importación (€)</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">

                {/* Suplidos */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">Suplidos</span>
                    <span className="badge badge-success badge-sm">✓ Repercute</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number" step="0.01" min="0" placeholder="0.00"
                      value={suplidos}
                      onChange={e => setSuplidos(e.target.value)}
                      className="input input-bordered w-full font-mono"
                    />
                    <span className="text-sm opacity-50">€</span>
                  </div>
                  <p className="text-xs text-base-content/50">Agente aduanero, handling, B/L, almacenaje en puerto</p>
                </div>

                {/* Exentos */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">Exentos</span>
                    <span className="badge badge-success badge-sm">✓ Repercute</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number" step="0.01" min="0" placeholder="0.00"
                      value={exentos}
                      onChange={e => setExentos(e.target.value)}
                      className="input input-bordered w-full font-mono"
                    />
                    <span className="text-sm opacity-50">€</span>
                  </div>
                  <p className="text-xs text-base-content/50">Aranceles de aduana — coste real para el negocio</p>
                </div>

                {/* Sujetos */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">Sujetos (21% IVA)</span>
                    <span className="badge badge-neutral badge-sm">Solo almacenado</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number" step="0.01" min="0" placeholder="0.00"
                      value={sujetos}
                      onChange={e => setSujetos(e.target.value)}
                      className="input input-bordered w-full font-mono"
                    />
                    <span className="text-sm opacity-50">€</span>
                  </div>
                  <p className="text-xs text-base-content/50">Transporte nacional, descarga en taller</p>
                  {suj > 0 && (
                    <p className="text-xs font-mono text-base-content/40">
                      IVA: {fmtEur(ivaGastos)} → Total factura: {fmtEur(suj + ivaGastos)}
                    </p>
                  )}
                </div>
              </div>

              {/* Aviso sujetos */}
              <div className="alert py-2 mt-3 text-xs bg-base-300 border-base-content/10">
                <Info className="w-4 h-4 shrink-0" />
                <span>
                  <strong>Sujetos (21%)</strong> se guarda para control interno pero <strong>nunca entra en el cálculo del €/metro</strong>.
                  El IVA de los sujetos es deducible y no es un coste neto.
                  El coste de producto se calcula exclusivamente con <strong>Suplidos + Exentos</strong>.
                </span>
              </div>

              {/* Subtotales */}
              <div className="mt-4 pt-3 border-t border-base-content/10 space-y-1.5">
                <div className="flex justify-between text-sm font-medium text-success">
                  <span>Gastos repercutidos en producto (suplidos + exentos)</span>
                  <span className="font-mono">{fmtEur(gastosRepercutibles)}</span>
                </div>
                {suj > 0 && (
                  <div className="flex justify-between text-sm text-base-content/40">
                    <span className="flex items-center gap-1">
                      <Info className="w-3 h-3" /> Sujetos (solo almacenado, no repercutido)
                    </span>
                    <span className="font-mono">{fmtEur(suj)}</span>
                  </div>
                )}
                {ivaGastos > 0 && (
                  <div className="flex justify-between text-sm text-base-content/30 text-xs">
                    <span>IVA sujetos (21%) — deducible</span>
                    <span className="font-mono">{fmtEur(ivaGastos)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold border-t border-base-content/10 pt-1">
                  <span>Total desembolso real (todo incluido)</span>
                  <span className="font-mono">{fmtEur(totalDesembolso)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── COLUMNA DERECHA ── */}
        <div className="space-y-5">

          <div className="card bg-primary text-primary-content shadow-lg lg:sticky lg:top-4">
            <div className="card-body p-4">
              <h2 className="font-bold text-base flex items-center gap-2">
                <Calculator className="w-4 h-4" /> Resumen
              </h2>

              <div className="mt-2 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="opacity-80">Bobinas ({fmt(totalBobinasUSD, 2)} $)</span>
                  <span className="font-mono">{fmtEur(totalBobinasEUR)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-80">Suplidos ✓</span>
                  <span className="font-mono">{fmtEur(supl)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-80">Exentos ✓</span>
                  <span className="font-mono">{fmtEur(exen)}</span>
                </div>
                {suj > 0 && (
                  <div className="flex justify-between opacity-40 text-xs">
                    <span>Sujetos (no entra en cálculo)</span>
                    <span className="font-mono">{fmtEur(suj)}</span>
                  </div>
                )}
              </div>

              <div className="divider my-2 opacity-30"></div>

              <div className="space-y-1">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm opacity-80">Coste producto</span>
                  <span className="font-mono text-2xl font-bold">{fmtEur(costeProducto)}</span>
                </div>
                <div className="flex justify-between text-xs opacity-50">
                  <span>Desembolso total real</span>
                  <span className="font-mono">{fmtEur(totalDesembolso)}</span>
                </div>
              </div>

              {totalMetros > 0 && (
                <>
                  <div className="divider my-2 opacity-30"></div>
                  <div className="flex justify-between text-sm">
                    <span className="opacity-80">Total metros</span>
                    <span className="font-mono">{fmt(totalMetros, 0)} m</span>
                  </div>
                  <div className="flex justify-between items-baseline mt-1">
                    <span className="text-sm opacity-80">Coste medio</span>
                    <span className="font-mono text-lg font-bold">
                      {fmtEur(costeProducto / totalMetros)}/m
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="alert text-xs p-3">
            <div className="space-y-1.5">
              <p className="font-bold">Metodología</p>
              <p>Prorrateo por <strong>valor económico</strong>: cada bobina asume el porcentaje de gastos proporcional a su precio total en €.</p>
              <p className="pt-1 border-t border-base-content/10">
                <strong>Se repercute:</strong> Suplidos + Exentos (aranceles)<br />
                <strong>No se repercute:</strong> Sujetos (IVA deducible)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabla resultados ── */}
      {hayResultados && (
        <div className="card bg-base-200 shadow-sm mt-6">
          <div className="card-body p-4">
            <h2 className="font-bold text-base mb-3">Coste real por bobina</h2>
            <div className="overflow-x-auto">
              <table className="table table-sm w-full">
                <thead>
                  <tr>
                    <th>Ref.</th>
                    <th>Esp.</th>
                    <th>Ancho</th>
                    <th className="text-right">Metros</th>
                    <th className="text-right">Valor $ → €</th>
                    <th className="text-right">% valor</th>
                    <th className="text-right">Gastos repercutidos</th>
                    <th className="text-right">Coste total €</th>
                    <th className="text-right text-success">€ / metro</th>
                  </tr>
                </thead>
                <tbody>
                  {bobinasFinal.filter(b => b.totalMetrosBobina > 0).map((b, idx) => (
                    <tr key={b.id} className="hover">
                      <td className="font-medium">{b.referencia || `B${idx + 1}`}</td>
                      <td className="text-sm opacity-70">{b.espesor ? `${b.espesor} mm` : '—'}</td>
                      <td className="text-sm opacity-70">{b.ancho ? `${b.ancho} mm` : '—'}</td>
                      <td className="text-right font-mono text-sm">
                        {b.numRollos > 1
                          ? <span>{b.numRollos}×{fmt(b.longitud, 0)} m<br /><span className="opacity-50">= {fmt(b.totalMetrosBobina, 0)} m</span></span>
                          : `${fmt(b.totalMetrosBobina, 0)} m`
                        }
                      </td>
                      <td className="text-right font-mono text-sm">
                        {fmtUsd(b.subtotalUSD)}<br />
                        <span className="opacity-60">{fmtEur(b.subtotalEUR)}</span>
                      </td>
                      <td className="text-right font-mono text-sm">
                        {totalBobinasEUR > 0 ? fmt(b.subtotalEUR / totalBobinasEUR * 100, 1) : '0.0'}%
                      </td>
                      <td className="text-right font-mono">{fmtEur(b.gastosProrrateados)}</td>
                      <td className="text-right font-mono font-bold">{fmtEur(b.costeFinalEUR)}</td>
                      <td className="text-right font-mono font-bold text-success text-base">
                        {fmtEur(b.costePorMetro)}/m
                      </td>
                    </tr>
                  ))}
                </tbody>
                {bobinasFinal.filter(b => b.totalMetrosBobina > 0).length > 1 && (
                  <tfoot>
                    <tr className="font-bold border-t-2 border-base-content/20">
                      <td colSpan={3}>Total</td>
                      <td className="text-right font-mono">{fmt(totalMetros, 0)} m</td>
                      <td className="text-right font-mono">
                        {fmtUsd(totalBobinasUSD)}<br />
                        <span className="font-normal opacity-60">{fmtEur(totalBobinasEUR)}</span>
                      </td>
                      <td className="text-right font-mono">100 %</td>
                      <td className="text-right font-mono">{fmtEur(gastosRepercutibles)}</td>
                      <td className="text-right font-mono">{fmtEur(costeProducto)}</td>
                      <td className="text-right font-mono text-success">
                        {fmtEur(totalMetros > 0 ? costeProducto / totalMetros : 0)}/m
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Historial ── */}
      <HistorialImportaciones onCargar={handleCargarImportacion} />

      {/* ── Modal guardar ── */}
      {modalGuardar && (
        <ModalGuardar datos={datosParaGuardar} onClose={() => setModalGuardar(false)} />
      )}
    </div>
  );
}
