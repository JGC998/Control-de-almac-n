"use client";
import React, { useState } from 'react';
import { Package2, Plus, Trash2, Calculator } from 'lucide-react';

const nuevaBobina = (id) => ({ id, referencia: '', precioMetro: '', metros: '' });

const n = (v) => parseFloat(v) || 0;
const fmt = (v, dec = 2) => isFinite(v) ? v.toFixed(dec) : '0.00';
const fmtEur = (v) => `${fmt(v)} €`;
const fmtUsd = (v) => `${fmt(v)} $`;

export default function CalculadoraContenedorPage() {
  const [tasaCambio, setTasaCambio] = useState('0.9300');
  const [bobinas, setBobinas] = useState([nuevaBobina(1)]);
  const [suplidos, setSuplidos] = useState('');
  const [exentos, setExentos] = useState('');
  const [sujetosBase, setSujetosBase] = useState('');
  const [nextId, setNextId] = useState(2);

  const tc = n(tasaCambio);
  const IVA = 0.21;

  // --- Cálculos bobinas ---
  const bobinasCals = bobinas.map(b => {
    const metros = n(b.metros);
    const precioMetro = n(b.precioMetro);
    const subtotalUSD = metros * precioMetro;
    const subtotalEUR = subtotalUSD * tc;
    return { ...b, metros, precioMetro, subtotalUSD, subtotalEUR };
  });

  const totalBobinasUSD = bobinasCals.reduce((s, b) => s + b.subtotalUSD, 0);
  const totalBobinasEUR = totalBobinasUSD * tc;
  const totalMetros = bobinasCals.reduce((s, b) => s + b.metros, 0);

  // --- Cálculos gastos ---
  const supl = n(suplidos);
  const exen = n(exentos);
  const sujBase = n(sujetosBase);
  const ivaGastos = sujBase * IVA;
  const totalGastosBase = supl + exen + sujBase; // sin IVA (coste real del producto)
  const totalGastoConIva = totalGastosBase + ivaGastos;

  // --- Totales ---
  const totalSinIva = totalBobinasEUR + totalGastosBase;
  const totalConIva = totalBobinasEUR + totalGastoConIva;

  // --- Prorrateo por metros ---
  const bobinasFinal = bobinasCals.map(b => {
    if (totalMetros === 0 || b.metros === 0) {
      return { ...b, gastosProrrateados: 0, costeFinalEUR: b.subtotalEUR, costePorMetro: 0 };
    }
    const proporcion = b.metros / totalMetros;
    const gastosProrrateados = totalGastosBase * proporcion;
    const costeFinalEUR = b.subtotalEUR + gastosProrrateados;
    const costePorMetro = costeFinalEUR / b.metros;
    return { ...b, gastosProrrateados, costeFinalEUR, costePorMetro };
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

  const hayResultados = totalMetros > 0 && bobinasFinal.some(b => b.metros > 0);

  return (
    <div className="container mx-auto p-4 max-w-5xl">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Package2 className="w-8 h-8 text-warning" />
        <div>
          <h1 className="text-3xl font-bold">Calculadora de Contenedor</h1>
          <p className="text-sm text-base-content/60">Desglose de gastos de importación y coste real por metro lineal</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── COLUMNA IZQUIERDA: Inputs ── */}
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
                    (equivale a: 1 EUR = {fmt(1 / tc, 4)} USD)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Bobinas */}
          <div className="card bg-base-200 shadow-sm">
            <div className="card-body p-4">
              <div className="flex justify-between items-center mb-3">
                <h2 className="font-bold text-base">Bobinas</h2>
                <button onClick={addBobina} className="btn btn-sm btn-primary gap-1">
                  <Plus className="w-4 h-4" /> Añadir bobina
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="table table-sm w-full">
                  <thead>
                    <tr>
                      <th>Referencia</th>
                      <th>Precio/m (USD)</th>
                      <th>Metros</th>
                      <th className="text-right">Subtotal $</th>
                      <th className="text-right">Subtotal €</th>
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
                              type="text" placeholder={`Bobina ${idx + 1}`}
                              value={b.referencia}
                              onChange={e => handleBobinaChange(b.id, 'referencia', e.target.value)}
                              className="input input-sm input-bordered w-28"
                            />
                          </td>
                          <td>
                            <div className="flex items-center gap-1">
                              <input
                                type="number" step="0.0001" min="0" placeholder="0.0000"
                                value={b.precioMetro}
                                onChange={e => handleBobinaChange(b.id, 'precioMetro', e.target.value)}
                                className="input input-sm input-bordered w-24 font-mono"
                              />
                              <span className="text-xs opacity-40">$</span>
                            </div>
                          </td>
                          <td>
                            <div className="flex items-center gap-1">
                              <input
                                type="number" step="1" min="0" placeholder="0"
                                value={b.metros}
                                onChange={e => handleBobinaChange(b.id, 'metros', e.target.value)}
                                className="input input-sm input-bordered w-24 font-mono"
                              />
                              <span className="text-xs opacity-40">m</span>
                            </div>
                          </td>
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
                      <td colSpan={3} className="text-sm">Total bobinas</td>
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
              <h2 className="font-bold text-base mb-3">Gastos de importación (€)</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                {/* Suplidos */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">Suplidos</span>
                    <span className="badge badge-neutral badge-sm">Sin IVA</span>
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
                    <span className="badge badge-neutral badge-sm">Sin IVA</span>
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
                  <p className="text-xs text-base-content/50">Aranceles e impuestos pagados en aduana</p>
                </div>

                {/* Sujetos */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">Sujetos (base)</span>
                    <span className="badge badge-warning badge-sm">+ IVA 21%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number" step="0.01" min="0" placeholder="0.00"
                      value={sujetosBase}
                      onChange={e => setSujetosBase(e.target.value)}
                      className="input input-bordered w-full font-mono"
                    />
                    <span className="text-sm opacity-50">€</span>
                  </div>
                  <p className="text-xs text-base-content/50">Transporte nacional, descarga en taller</p>
                  {sujBase > 0 && (
                    <p className="text-xs font-mono text-warning">
                      IVA: {fmtEur(ivaGastos)} → Total factura: {fmtEur(sujBase + ivaGastos)}
                    </p>
                  )}
                </div>
              </div>

              {/* Subtotales gastos */}
              <div className="mt-4 pt-3 border-t border-base-content/10 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-base-content/70">Total gastos (base sin IVA)</span>
                  <span className="font-mono font-bold">{fmtEur(totalGastosBase)}</span>
                </div>
                {ivaGastos > 0 && (
                  <div className="flex justify-between text-sm text-warning">
                    <span>IVA sujetos (21%) — deducible</span>
                    <span className="font-mono">{fmtEur(ivaGastos)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold border-t border-base-content/10 pt-1 mt-1">
                  <span>Total desembolso gastos</span>
                  <span className="font-mono">{fmtEur(totalGastoConIva)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── COLUMNA DERECHA: Resumen ── */}
        <div className="space-y-5">

          {/* Resumen sticky */}
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
                  <span className="opacity-80">Suplidos</span>
                  <span className="font-mono">{fmtEur(supl)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-80">Exentos</span>
                  <span className="font-mono">{fmtEur(exen)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-80">Sujetos (base)</span>
                  <span className="font-mono">{fmtEur(sujBase)}</span>
                </div>
                {ivaGastos > 0 && (
                  <div className="flex justify-between opacity-60 text-xs">
                    <span>IVA sujetos</span>
                    <span className="font-mono">{fmtEur(ivaGastos)}</span>
                  </div>
                )}
              </div>

              <div className="divider my-2 opacity-30"></div>

              <div className="flex justify-between items-baseline">
                <span className="text-sm opacity-80">Total (sin IVA)</span>
                <span className="font-mono text-2xl font-bold">{fmtEur(totalSinIva)}</span>
              </div>
              <div className="flex justify-between items-baseline text-sm opacity-70">
                <span>Total (con IVA)</span>
                <span className="font-mono">{fmtEur(totalConIva)}</span>
              </div>

              {totalMetros > 0 && (
                <>
                  <div className="divider my-2 opacity-30"></div>
                  <div className="flex justify-between text-sm">
                    <span className="opacity-80">Total metros</span>
                    <span className="font-mono">{fmt(totalMetros, 1)} m</span>
                  </div>
                  <div className="flex justify-between items-baseline mt-1">
                    <span className="text-sm opacity-80">Coste medio</span>
                    <span className="font-mono text-lg font-bold">
                      {fmtEur(totalSinIva / totalMetros)}/m
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Nota IVA */}
          <div className="alert text-xs p-3">
            <div className="space-y-1">
              <p className="font-bold">Base de cálculo del coste</p>
              <p>El coste por metro usa la base <strong>sin IVA</strong>. El IVA de los gastos sujetos es deducible para empresas registradas y no forma parte del coste real del material.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabla de resultados por bobina ── */}
      {hayResultados && (
        <div className="card bg-base-200 shadow-sm mt-6">
          <div className="card-body p-4">
            <h2 className="font-bold text-base mb-3">Coste real por bobina</h2>
            <div className="overflow-x-auto">
              <table className="table table-sm w-full">
                <thead>
                  <tr>
                    <th>Referencia</th>
                    <th className="text-right">Metros</th>
                    <th className="text-right">Precio $ → €</th>
                    <th className="text-right">Gastos prorrateados</th>
                    <th className="text-right">Coste total €</th>
                    <th className="text-right text-success">€ / metro</th>
                  </tr>
                </thead>
                <tbody>
                  {bobinasFinal.filter(b => b.metros > 0).map((b, idx) => (
                    <tr key={b.id} className="hover">
                      <td>{b.referencia || `Bobina ${idx + 1}`}</td>
                      <td className="text-right font-mono">{fmt(b.metros, 1)} m</td>
                      <td className="text-right font-mono text-sm">
                        {fmtUsd(b.subtotalUSD)} → {fmtEur(b.subtotalEUR)}
                      </td>
                      <td className="text-right font-mono">{fmtEur(b.gastosProrrateados)}</td>
                      <td className="text-right font-mono font-bold">{fmtEur(b.costeFinalEUR)}</td>
                      <td className="text-right font-mono font-bold text-success text-base">{fmtEur(b.costePorMetro)}</td>
                    </tr>
                  ))}
                </tbody>
                {bobinasFinal.filter(b => b.metros > 0).length > 1 && (
                  <tfoot>
                    <tr className="font-bold border-t-2 border-base-content/20">
                      <td>Total</td>
                      <td className="text-right font-mono">{fmt(totalMetros, 1)} m</td>
                      <td className="text-right font-mono">{fmtUsd(totalBobinasUSD)} → {fmtEur(totalBobinasEUR)}</td>
                      <td className="text-right font-mono">{fmtEur(totalGastosBase)}</td>
                      <td className="text-right font-mono">{fmtEur(totalSinIva)}</td>
                      <td className="text-right font-mono text-success">
                        {fmtEur(totalMetros > 0 ? totalSinIva / totalMetros : 0)}/m
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            <p className="text-xs text-base-content/40 mt-2">
              Los gastos se prorratean proporcionalmente a los metros de cada bobina.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
