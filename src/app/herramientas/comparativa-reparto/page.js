"use client";
import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import { Scale, TrendingUp, TrendingDown, Info, ChevronDown } from 'lucide-react';
import { fetcher } from '@/lib/fetcher';

// ─────────────────────────────────────────────────────────────
// Utilidades numéricas
// ─────────────────────────────────────────────────────────────
const n  = (v) => parseFloat(v) || 0;
const fmt = (v, dec = 2) => (isFinite(v) && !isNaN(v)
  ? v.toLocaleString('es-ES', { minimumFractionDigits: dec, maximumFractionDigits: dec })
  : (0).toLocaleString('es-ES', { minimumFractionDigits: dec, maximumFractionDigits: dec }));
const fmtE = (v) => `${fmt(v)} €`;
const fmtPct = (v) => `${v > 0 ? '+' : ''}${fmt(v, 1)} %`;

// ─────────────────────────────────────────────────────────────
// Datos de EJEMPLO — muy contrastados para ver la diferencia
// ─────────────────────────────────────────────────────────────
const EJEMPLO = {
  descripcion: 'Ejemplo ilustrativo — contenedor mixto PVC',
  tasaCambio: 1.08,
  suplidos: 500,   // gastos de transporte / flete
  exentos:  350,   // aranceles
  sujetos:  0,
  bobinas: [
    {
      id: 1, tipo: 'BOBINA', referencia: 'PVC 2mm Blanco',
      espesor: '2', ancho: '500', longitud: '800', numRollos: '1',
      precio: '0.80', unidadPrecio: 'M',
      // ← Material BARATO con MUCHOS metros → el más perjudicado con el método B
    },
    {
      id: 2, tipo: 'BOBINA', referencia: 'PVC 4mm Blanco',
      espesor: '4', ancho: '500', longitud: '400', numRollos: '1',
      precio: '2.50', unidadPrecio: 'M',
    },
    {
      id: 3, tipo: 'BOBINA', referencia: 'PVC 8mm Verde',
      espesor: '8', ancho: '600', longitud: '200', numRollos: '1',
      precio: '5.50', unidadPrecio: 'M',
    },
    {
      id: 4, tipo: 'BOBINA', referencia: 'PVC 12mm Azul',
      espesor: '12', ancho: '600', longitud: '100', numRollos: '1',
      precio: '12.00', unidadPrecio: 'M',
      // ← Material CARO con POCOS metros → el más beneficiado con el método B
    },
  ],
};

// ─────────────────────────────────────────────────────────────
// Motor de cálculo (igual que la calculadora-contenedor)
// ─────────────────────────────────────────────────────────────
function calcularItems(bobs, tc) {
  return bobs.map(b => {
    const tipo     = b.tipo || 'BOBINA';
    const longitud = n(b.longitud);
    const rollos   = n(b.numRollos) || 1;
    const precio   = n(b.precio);
    const anchoM   = n(b.ancho) / 1000;

    let metros = 0, subtotalUSD = 0, usdPorMetro = 0;

    if (tipo === 'TACO') {
      metros = longitud;
      subtotalUSD = precio * longitud;
      usdPorMetro = precio;
    } else if (['GRAPA', 'MAQUINA', 'OTRO'].includes(tipo)) {
      subtotalUSD = precio * rollos;
    } else {
      usdPorMetro  = b.unidadPrecio === 'SQM' ? precio * anchoM : precio;
      metros        = longitud * rollos;
      subtotalUSD   = usdPorMetro * metros;
    }

    return { ...b, tipo, metros, usdPorMetro, subtotalUSD, subtotalEUR: subtotalUSD * tc };
  });
}

function comparar(contenedor) {
  const tc     = n(contenedor.tasaCambio) || 1;
  const gastos = n(contenedor.suplidos) + n(contenedor.exentos);

  const rawBobs = typeof contenedor.bobinas === 'string'
    ? JSON.parse(contenedor.bobinas)
    : (contenedor.bobinas ?? []);

  const items         = calcularItems(rawBobs, tc);
  const totalEUR      = items.reduce((s, b) => s + b.subtotalEUR, 0);
  const totalMetros   = items.reduce((s, b) => s + b.metros, 0);
  const euroMetroFijo = totalMetros > 0 ? gastos / totalMetros : 0;

  const resultado = items.map(b => {
    // MÉTODO A — prorrateo por valor económico (€)
    const propValor  = totalEUR > 0 ? b.subtotalEUR / totalEUR : 0;
    const gastosA    = gastos * propValor;
    const costeA     = b.subtotalEUR + gastosA;
    const euroMetroA = b.metros > 0 ? costeA / b.metros : 0;
    const markupA    = b.subtotalEUR > 0 ? (gastosA / b.subtotalEUR) * 100 : 0;

    // MÉTODO B — porcentaje fijo por metro (€/metro igual para todos)
    const gastosB    = euroMetroFijo * b.metros;
    const costeB     = b.subtotalEUR + gastosB;
    const euroMetroB = b.metros > 0 ? costeB / b.metros : 0;
    const markupB    = b.subtotalEUR > 0 ? (gastosB / b.subtotalEUR) * 100 : 0;

    // Diferencia: positivo = B más caro que A para este artículo
    const difAbsoluta  = euroMetroB - euroMetroA;
    const difRelativa  = euroMetroA > 0 ? (difAbsoluta / euroMetroA) * 100 : 0;

    return {
      ...b, propValor,
      gastosA, costeA, euroMetroA, markupA,
      gastosB, costeB, euroMetroB, markupB,
      difAbsoluta, difRelativa,
    };
  });

  return { resultado, totalEUR, totalMetros, gastos, euroMetroFijo };
}

// ─────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────
export default function ComparativaRepartoPage() {
  const { data: importaciones } = useSWR('/api/importaciones', fetcher);
  const [importacionId, setImportacionId] = useState('__ejemplo__');

  const contenedor = useMemo(() => {
    if (importacionId === '__ejemplo__') return EJEMPLO;
    if (!importaciones) return null;
    const imp = importaciones.find(i => i.id === importacionId);
    return imp ?? null;
  }, [importacionId, importaciones]);

  const calc = useMemo(() => (contenedor ? comparar(contenedor) : null), [contenedor]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Cabecera */}
      <div className="flex items-start gap-4">
        <div className="p-3 bg-primary/10 rounded-xl">
          <Scale className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Comparativa de métodos de reparto de gastos</h1>
          <p className="text-base-content/60 mt-1">
            Dos formas de repartir los gastos de importación (flete, aranceles) entre los artículos del contenedor.
          </p>
        </div>
      </div>

      {/* Selector de importación */}
      <div className="card bg-base-100 shadow">
        <div className="card-body py-4">
          <div className="flex flex-wrap items-center gap-4">
            <label className="label-text font-semibold whitespace-nowrap">Importación a analizar:</label>
            <select
              className="select select-bordered flex-1 max-w-sm"
              value={importacionId}
              onChange={e => setImportacionId(e.target.value)}
            >
              <option value="__ejemplo__">Datos de ejemplo (ver diferencias claramente)</option>
              {importaciones?.map(imp => (
                <option key={imp.id} value={imp.id}>
                  {imp.descripcion || `Importación ${imp.id.slice(0, 8)}…`}
                  {imp.numContenedor ? ` — ${imp.numContenedor}` : ''}
                  {imp.creadaEn ? ` (${new Date(imp.creadaEn).toLocaleDateString('es-ES')})` : ''}
                </option>
              ))}
            </select>
            {importacionId === '__ejemplo__' && (
              <div className="badge badge-info badge-outline gap-1">
                <Info className="w-3 h-3" /> Datos ficticios, elegidos para maximizar el contraste
              </div>
            )}
          </div>
        </div>
      </div>

      {calc && (
        <>
          {/* Resumen del contenedor */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Total artículos" value={fmtE(calc.totalEUR)} sub="en €" />
            <StatCard label="Total metros" value={`${fmt(calc.totalMetros, 0)} m`} />
            <StatCard label="Gastos repercutibles" value={fmtE(calc.gastos)} sub="suplidos + aranceles" />
            <StatCard label="% sobre mercancía" value={`${fmt(calc.totalEUR > 0 ? calc.gastos / calc.totalEUR * 100 : 0, 1)} %`} />
          </div>

          {/* Explicación de los dos métodos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MetodoCard
              letra="A"
              color="primary"
              titulo="Prorrateo por valor económico"
              subtitulo="(tu método)"
              formula={`% gastos = ${fmt(calc.totalEUR > 0 ? calc.gastos / calc.totalEUR * 100 : 0, 2)} % sobre el valor en €`}
              descripcion="Cada artículo asume los gastos en proporción a lo que vale. Una bobina que representa el 30 % del valor del contenedor paga el 30 % de los gastos. Resultado: todos los artículos se encarecen el mismo porcentaje relativo."
              pros={['Incremento porcentual uniforme para todos', 'Fácil de replicar en cualquier contenedor', 'El artículo caro paga más gastos porque "puede permitírselo"']}
              contras={['Los gastos de transporte no siempre son proporcionales al valor']}
            />
            <MetodoCard
              letra="B"
              color="secondary"
              titulo="Porcentaje fijo por metro"
              subtitulo="(método de tu padre)"
              formula={`${fmt(calc.euroMetroFijo, 4)} €/metro → igual para todos`}
              descripcion="Se divide el total de gastos entre el total de metros y se asigna el mismo importe por metro a todos los artículos. Lógica logística: cada metro ocupa el mismo espacio en el contenedor."
              pros={['Intuitivo: igual coste de transporte por metro', 'Correcto si los gastos dependen del volumen, no del valor']}
              contras={['El material barato recibe el mismo gasto en € por metro que el caro', 'Su markup relativo de gastos puede ser varias veces mayor', 'Distorsiona la estructura de costes al alza para los artículos de menor precio']}
            />
          </div>

          {/* Tabla comparativa */}
          <div className="card bg-base-100 shadow overflow-x-auto">
            <div className="card-body p-0">
              <table className="table table-zebra w-full text-sm">
                <thead>
                  <tr className="text-center">
                    <th className="text-left" rowSpan={2}>Artículo</th>
                    <th rowSpan={2} className="text-right">Metros</th>
                    <th rowSpan={2} className="text-right">Coste<br/>mercancía (€)</th>
                    <th colSpan={3} className="bg-primary/10 text-primary border-b-2 border-primary/30">
                      MÉTODO A — Por valor
                    </th>
                    <th colSpan={3} className="bg-secondary/10 text-secondary border-b-2 border-secondary/30">
                      MÉTODO B — Por metro
                    </th>
                    <th rowSpan={2} className="bg-base-200">
                      Diferencia<br/>€/metro
                    </th>
                  </tr>
                  <tr className="text-center text-xs">
                    <th className="bg-primary/5 text-primary">Gastos A (€)</th>
                    <th className="bg-primary/5 text-primary">Markup A</th>
                    <th className="bg-primary/5 text-primary font-bold">€/metro A</th>
                    <th className="bg-secondary/5 text-secondary">Gastos B (€)</th>
                    <th className="bg-secondary/5 text-secondary">Markup B</th>
                    <th className="bg-secondary/5 text-secondary font-bold">€/metro B</th>
                    <th className="bg-base-200"></th>
                  </tr>
                </thead>
                <tbody>
                  {calc.resultado.map((b, i) => {
                    const masCaroConB = b.difAbsoluta > 0.001;
                    const masBaratoConB = b.difAbsoluta < -0.001;
                    return (
                      <tr key={i} className="align-middle">
                        <td>
                          <div className="font-semibold">{b.referencia || `Artículo ${i + 1}`}</div>
                          <div className="text-xs text-base-content/50">
                            {b.espesor ? `${b.espesor} mm` : ''}{b.ancho ? ` · ${b.ancho} mm ancho` : ''}
                          </div>
                        </td>
                        <td className="text-right font-mono">{fmt(b.metros, 0)}</td>
                        <td className="text-right font-mono">{fmtE(b.subtotalEUR)}</td>

                        {/* Método A */}
                        <td className="text-right font-mono bg-primary/5">{fmtE(b.gastosA)}</td>
                        <td className="text-right font-mono bg-primary/5 text-primary">{fmt(b.markupA, 1)} %</td>
                        <td className="text-right font-mono bg-primary/5 font-bold text-primary">{fmt(b.euroMetroA, 4)} €</td>

                        {/* Método B */}
                        <td className="text-right font-mono bg-secondary/5">{fmtE(b.gastosB)}</td>
                        <td className={`text-right font-mono bg-secondary/5 font-semibold ${masCaroConB ? 'text-error' : masBaratoConB ? 'text-success' : 'text-secondary'}`}>
                          {fmt(b.markupB, 1)} %
                        </td>
                        <td className={`text-right font-mono bg-secondary/5 font-bold ${masCaroConB ? 'text-error' : masBaratoConB ? 'text-success' : 'text-secondary'}`}>
                          {fmt(b.euroMetroB, 4)} €
                        </td>

                        {/* Diferencia */}
                        <td className="text-center bg-base-200">
                          <div className={`flex items-center justify-center gap-1 font-mono font-bold text-sm ${masCaroConB ? 'text-error' : masBaratoConB ? 'text-success' : 'text-base-content/40'}`}>
                            {masCaroConB
                              ? <TrendingUp className="w-4 h-4" />
                              : masBaratoConB
                                ? <TrendingDown className="w-4 h-4" />
                                : null}
                            {fmtPct(b.difRelativa)}
                          </div>
                          <div className="text-xs text-base-content/50 font-mono">
                            {b.difAbsoluta >= 0 ? '+' : ''}{fmt(b.difAbsoluta, 4)} €/m
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="font-bold border-t-2 border-base-300">
                    <td>TOTAL</td>
                    <td className="text-right font-mono">{fmt(calc.totalMetros, 0)} m</td>
                    <td className="text-right font-mono">{fmtE(calc.totalEUR)}</td>
                    <td className="text-right font-mono bg-primary/5">{fmtE(calc.gastos)}</td>
                    <td className="bg-primary/5"></td>
                    <td className="bg-primary/5"></td>
                    <td className="text-right font-mono bg-secondary/5">{fmtE(calc.gastos)}</td>
                    <td className="bg-secondary/5"></td>
                    <td className="bg-secondary/5"></td>
                    <td className="bg-base-200 text-center text-xs text-base-content/50">
                      Mismo total
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Análisis */}
          <Analisis datos={calc} />
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Subcomponentes
// ─────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }) {
  return (
    <div className="stat bg-base-100 shadow rounded-xl py-4">
      <div className="stat-title text-xs">{label}</div>
      <div className="stat-value text-lg font-mono">{value}</div>
      {sub && <div className="stat-desc">{sub}</div>}
    </div>
  );
}

function MetodoCard({ letra, color, titulo, subtitulo, formula, descripcion, pros, contras }) {
  const colorClasses = {
    primary:   { bg: 'bg-primary/10', border: 'border-primary/40', badge: 'badge-primary', text: 'text-primary' },
    secondary: { bg: 'bg-secondary/10', border: 'border-secondary/40', badge: 'badge-secondary', text: 'text-secondary' },
  }[color];

  return (
    <div className={`card border-2 ${colorClasses.border} ${colorClasses.bg}`}>
      <div className="card-body">
        <div className="flex items-center gap-3 mb-2">
          <div className={`badge badge-lg ${colorClasses.badge} font-bold`}>Método {letra}</div>
          <div>
            <h3 className={`font-bold ${colorClasses.text}`}>{titulo}</h3>
            <p className="text-xs text-base-content/50">{subtitulo}</p>
          </div>
        </div>
        <div className={`font-mono text-sm p-2 rounded bg-base-100/60 ${colorClasses.text} mb-3`}>
          {formula}
        </div>
        <p className="text-sm text-base-content/70 mb-3">{descripcion}</p>
        <div className="space-y-1">
          {pros.map((p, i) => (
            <div key={i} className="flex gap-2 text-xs text-success"><span>✓</span><span>{p}</span></div>
          ))}
          {contras.map((c, i) => (
            <div key={i} className="flex gap-2 text-xs text-error"><span>✗</span><span>{c}</span></div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Analisis({ datos }) {
  const { resultado } = datos;

  // El más perjudicado con el método B (mayor difRelativa positiva)
  const masCaroConB = [...resultado].sort((a, b) => b.difRelativa - a.difRelativa)[0];
  // El más beneficiado con el método B (mayor difRelativa negativa)
  const masBaratoConB = [...resultado].sort((a, b) => a.difRelativa - b.difRelativa)[0];

  const tieneGranDiferencia = masCaroConB && masCaroConB.difRelativa > 5;

  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body">
        <h2 className="card-title mb-4 flex items-center gap-2">
          <Scale className="w-5 h-5 text-primary" /> Análisis de la diferencia
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {masCaroConB && (
            <div className="p-4 bg-error/10 border border-error/30 rounded-xl">
              <h3 className="font-bold text-error flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4" />
                Con Método B, el más perjudicado es:
              </h3>
              <p className="font-semibold">{masCaroConB.referencia}</p>
              <div className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="opacity-70">€/metro Método A</span>
                  <span className="font-mono font-bold text-primary">{fmt(masCaroConB.euroMetroA, 4)} €</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-70">€/metro Método B</span>
                  <span className="font-mono font-bold text-secondary">{fmt(masCaroConB.euroMetroB, 4)} €</span>
                </div>
                <div className="flex justify-between border-t border-error/20 pt-1 mt-1">
                  <span className="font-semibold">Diferencia</span>
                  <span className="font-mono font-bold text-error">{fmtPct(masCaroConB.difRelativa)} más caro</span>
                </div>
                <p className="text-xs text-base-content/60 mt-2">
                  Markup de gastos: {fmt(masCaroConB.markupA, 1)} % (Método A) vs {fmt(masCaroConB.markupB, 1)} % (Método B)
                </p>
              </div>
            </div>
          )}

          {masBaratoConB && masBaratoConB.difRelativa < -0.5 && (
            <div className="p-4 bg-success/10 border border-success/30 rounded-xl">
              <h3 className="font-bold text-success flex items-center gap-2 mb-2">
                <TrendingDown className="w-4 h-4" />
                Con Método B, el más beneficiado es:
              </h3>
              <p className="font-semibold">{masBaratoConB.referencia}</p>
              <div className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="opacity-70">€/metro Método A</span>
                  <span className="font-mono font-bold text-primary">{fmt(masBaratoConB.euroMetroA, 4)} €</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-70">€/metro Método B</span>
                  <span className="font-mono font-bold text-secondary">{fmt(masBaratoConB.euroMetroB, 4)} €</span>
                </div>
                <div className="flex justify-between border-t border-success/20 pt-1 mt-1">
                  <span className="font-semibold">Diferencia</span>
                  <span className="font-mono font-bold text-success">{fmtPct(masBaratoConB.difRelativa)} más barato</span>
                </div>
                <p className="text-xs text-base-content/60 mt-2">
                  Markup de gastos: {fmt(masBaratoConB.markupA, 1)} % (Método A) vs {fmt(masBaratoConB.markupB, 1)} % (Método B)
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Conclusión */}
        <div className="mt-6 p-4 bg-base-200 rounded-xl">
          <h3 className="font-bold mb-2 flex items-center gap-2">
            <Info className="w-4 h-4" /> ¿Por qué el Método A es más justo?
          </h3>
          <div className="space-y-2 text-sm text-base-content/80">
            <p>
              <strong>El Método A garantiza que todos los artículos asuman el mismo porcentaje de gastos
              respecto a su valor.</strong> Si los gastos suponen un 15 % del valor total de la mercancía,
              cada artículo se encarece exactamente un 15 %, sin importar cuánto valga ni cuántos metros tenga.
              Esto preserva la estructura de costes relativa.
            </p>
            <p>
              Con el <strong>Método B</strong>, el coste del transporte se distribuye a partes iguales
              entre los metros. Esto es razonable desde la perspectiva logística (un metro ocupa igual
              en el contenedor), pero provoca que los materiales de bajo precio por metro asuman un
              <strong> porcentaje de gastos mucho mayor</strong> en términos relativos:
              si un material vale 0,80 €/m y se le añaden 0,57 €/m de gastos fijos, su precio de coste
              sube un 71 %. Si otro vale 12 €/m, los mismos 0,57 €/m suponen solo un 4,7 %.
            </p>
            <p>
              <strong>Consecuencia práctica:</strong> con el Método B, al calcular precios de venta con
              un margen uniforme, el material barato resulta comparativamente más caro para el cliente
              que el material de gama alta. El Método A evita esta distorsión.
            </p>
          </div>
        </div>

        {/* Nota matemática */}
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-base-content/50 hover:text-base-content">
            Nota: los totales de gastos son idénticos en ambos métodos
          </summary>
          <p className="text-sm text-base-content/60 mt-2 pl-4 border-l-2 border-base-300">
            Ambos métodos distribuyen exactamente la misma cantidad de gastos totales.
            La diferencia no está en cuánto se gasta, sino en cómo se reparte entre artículos.
            Por eso el total de la columna &quot;Gastos A&quot; y &quot;Gastos B&quot; en la tabla son siempre iguales.
          </p>
        </details>
      </div>
    </div>
  );
}
