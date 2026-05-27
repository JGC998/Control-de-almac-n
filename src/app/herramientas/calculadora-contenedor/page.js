"use client";
import React, { useState } from 'react';
import { Package2, Plus, Trash2, Calculator, Info } from 'lucide-react';

const nuevaBobina = (id) => ({
  id,
  referencia: '',
  espesor: '',
  ancho: '',
  longitud: '',
  numRollos: '1',
  usdPorMetro: '',
});

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
    const longitud = n(b.longitud);
    const numRollos = n(b.numRollos) || 1;
    const usdPorMetro = n(b.usdPorMetro);
    const totalMetrosBobina = longitud * numRollos;
    const subtotalUSD = usdPorMetro * totalMetrosBobina;
    const subtotalEUR = subtotalUSD * tc;
    return { ...b, longitud, numRollos, usdPorMetro, totalMetrosBobina, subtotalUSD, subtotalEUR };
  });

  const totalBobinasUSD = bobinasCals.reduce((s, b) => s + b.subtotalUSD, 0);
  const totalBobinasEUR = totalBobinasUSD * tc;
  const totalMetros = bobinasCals.reduce((s, b) => s + b.totalMetrosBobina, 0);

  // --- Cálculos gastos ---
  const supl = n(suplidos);
  const exen = n(exentos);
  const sujBase = n(sujetosBase);
  const ivaGastos = sujBase * IVA;

  // Suplidos + Sujetos se repercuten en el coste del producto.
  // Exentos (aranceles) son impuestos: se registran pero no se repercuten por metro.
  const gastosRepercutibles = supl + sujBase;
  const costeProducto = totalBobinasEUR + gastosRepercutibles;
  const totalDesembolso = totalBobinasEUR + supl + exen + sujBase + ivaGastos;

  // --- Prorrateo por valor (proporción al precio total € de cada bobina) ---
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

  const hayResultados = totalMetros > 0 && bobinasFinal.some(b => b.totalMetrosBobina > 0);

  return (
    <div className="container mx-auto p-4 max-w-6xl">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Package2 className="w-8 h-8 text-warning" />
        <div>
          <h1 className="text-3xl font-bold">Calculadora de Contenedor</h1>
          <p className="text-sm text-base-content/60">Coste real de importación por metro lineal, prorrateado por valor de cada bobina</p>
        </div>
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
                      <th>USD/M</th>
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
                            <input
                              type="number" step="0.0001" min="0" placeholder="0.0000"
                              value={b.usdPorMetro}
                              onChange={e => handleBobinaChange(b.id, 'usdPorMetro', e.target.value)}
                              className="input input-sm input-bordered w-24 font-mono"
                            />
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
              <p className="text-xs text-base-content/50 mb-3">
                <strong>Suplidos</strong> y <strong>Sujetos</strong> se repercuten en el coste del producto.
                Los <strong>Exentos</strong> (aranceles) son impuestos: se registran como gasto pero no se incluyen en el €/metro.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                {/* Suplidos */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">Suplidos</span>
                    <span className="badge badge-success badge-sm">Repercute</span>
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
                    <span className="badge badge-neutral badge-sm">Informativo</span>
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
                  <p className="text-xs text-base-content/50">Aranceles e impuestos de aduana — no se repercuten</p>
                </div>

                {/* Sujetos */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">Sujetos (base)</span>
                    <div className="flex gap-1">
                      <span className="badge badge-success badge-sm">Repercute</span>
                      <span className="badge badge-warning badge-sm">+IVA 21%</span>
                    </div>
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
              <div className="mt-4 pt-3 border-t border-base-content/10 space-y-1.5">
                <div className="flex justify-between text-sm font-medium text-success">
                  <span>Gastos repercutidos en producto (suplidos + sujetos)</span>
                  <span className="font-mono">{fmtEur(gastosRepercutibles)}</span>
                </div>
                {exen > 0 && (
                  <div className="flex justify-between text-sm text-base-content/50">
                    <span className="flex items-center gap-1">
                      <Info className="w-3 h-3" /> Aranceles (no repercutidos)
                    </span>
                    <span className="font-mono">{fmtEur(exen)}</span>
                  </div>
                )}
                {ivaGastos > 0 && (
                  <div className="flex justify-between text-sm text-warning">
                    <span>IVA sujetos (21%) — deducible</span>
                    <span className="font-mono">{fmtEur(ivaGastos)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold border-t border-base-content/10 pt-1">
                  <span>Total desembolso real</span>
                  <span className="font-mono">{fmtEur(totalDesembolso)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── COLUMNA DERECHA: Resumen ── */}
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
                  <span className="opacity-80">Sujetos ✓</span>
                  <span className="font-mono">{fmtEur(sujBase)}</span>
                </div>
                {exen > 0 && (
                  <div className="flex justify-between opacity-50 text-xs">
                    <span>Aranceles (ℹ no repercutidos)</span>
                    <span className="font-mono">{fmtEur(exen)}</span>
                  </div>
                )}
                {ivaGastos > 0 && (
                  <div className="flex justify-between opacity-60 text-xs">
                    <span>IVA sujetos (deducible)</span>
                    <span className="font-mono">{fmtEur(ivaGastos)}</span>
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
                  <span>Desembolso total (incl. aranceles + IVA)</span>
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
            <div className="space-y-1">
              <p className="font-bold">Metodología de prorrateo</p>
              <p>Los gastos se distribuyen por <strong>valor económico</strong> de cada bobina. Una bobina que representa el 40 % del valor total recibe el 40 % de los gastos. Los aranceles no forman parte del coste de producto.</p>
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
    </div>
  );
}
