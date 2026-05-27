"use client";
import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import { Search, Package, BarChart2, Calculator, X } from 'lucide-react';

// ── Utilidad de búsqueda ─────────────────────────────────────────────────────
function useBusqueda(lista, campos) {
  const [q, setQ] = useState('');
  const filtrado = useMemo(() => {
    if (!lista || !q.trim()) return lista ?? [];
    const t = q.toLowerCase();
    return lista.filter(item =>
      campos.some(c => String(item[c] ?? '').toLowerCase().includes(t))
    );
  }, [lista, q, campos]);
  return { q, setQ, filtrado };
}

// ── Tab Tarifas ──────────────────────────────────────────────────────────────
function TabTarifas() {
  const { data: materiales } = useSWR('/api/precios');
  const { data: rollos }     = useSWR('/api/tarifas-rollo');
  const [modo, setModo]      = useState('material');
  const lista                = modo === 'material' ? (materiales ?? []) : (rollos ?? []);
  const campos               = modo === 'material'
    ? ['material', 'color']
    : ['material', 'color', 'ancho'];
  const { q, setQ, filtrado } = useBusqueda(lista, campos);

  return (
    <div>
      {/* Selector tipo */}
      <div className="flex gap-2 mb-4">
        <button className={`btn btn-sm flex-1 ${modo === 'material' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => { setModo('material'); setQ(''); }}>
          Por lámina
        </button>
        <button className={`btn btn-sm flex-1 ${modo === 'rollo' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => { setModo('rollo'); setQ(''); }}>
          Por rollo/metro
        </button>
      </div>

      {/* Búsqueda */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
        <input
          type="text"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Buscar material, color..."
          className="input input-bordered w-full pl-9 text-lg h-14"
        />
        {q && (
          <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 btn btn-ghost btn-xs btn-circle">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        {modo === 'material' ? (
          <table className="table table-zebra w-full">
            <thead>
              <tr className="text-base">
                <th>Material</th><th>Espesor</th><th>Color</th>
                <th className="text-right">Precio/u</th><th className="text-right">Peso/u</th>
              </tr>
            </thead>
            <tbody>
              {filtrado.map((t, i) => (
                <tr key={i} className="text-base">
                  <td className="font-semibold">{t.material}</td>
                  <td>{t.espesor} mm</td>
                  <td>{t.color || '—'}</td>
                  <td className="text-right font-bold text-primary">{Number(t.precio).toFixed(2)} €</td>
                  <td className="text-right">{Number(t.peso).toFixed(3)} kg</td>
                </tr>
              ))}
              {filtrado.length === 0 && (
                <tr><td colSpan={5} className="text-center py-10 text-base-content/40">Sin resultados</td></tr>
              )}
            </tbody>
          </table>
        ) : (
          <table className="table table-zebra w-full">
            <thead>
              <tr className="text-base">
                <th>Material</th><th>Espesor</th><th>Ancho</th><th>Color</th>
                <th className="text-right">Precio/m</th><th className="text-right">Mín. m</th>
              </tr>
            </thead>
            <tbody>
              {filtrado.map((t, i) => (
                <tr key={i} className="text-base">
                  <td className="font-semibold">{t.material}</td>
                  <td>{t.espesor} mm</td>
                  <td>{t.ancho ? `${t.ancho} mm` : '—'}</td>
                  <td>{t.color || '—'}</td>
                  <td className="text-right font-bold text-primary">{Number(t.precioBase).toFixed(2)} €</td>
                  <td className="text-right">{t.metrajeMinimo} m</td>
                </tr>
              ))}
              {filtrado.length === 0 && (
                <tr><td colSpan={6} className="text-center py-10 text-base-content/40">Sin resultados</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Tab Stock ────────────────────────────────────────────────────────────────
function TabStock() {
  const { data, isLoading } = useSWR('/api/almacen-stock');
  const stock = data?.stockItems ?? data ?? [];
  const { q, setQ, filtrado } = useBusqueda(stock, ['material', 'proveedor']);

  if (isLoading) return <div className="flex justify-center py-20"><span className="loading loading-spinner loading-lg" /></div>;

  return (
    <div>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
        <input
          type="text"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Buscar material..."
          className="input input-bordered w-full pl-9 text-lg h-14"
        />
        {q && (
          <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 btn btn-ghost btn-xs btn-circle">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="table table-zebra w-full">
          <thead>
            <tr className="text-base">
              <th>Material</th><th>Espesor</th>
              <th className="text-right">Metros disp.</th><th>Proveedor</th>
            </tr>
          </thead>
          <tbody>
            {filtrado.map(s => (
              <tr key={s.id} className="text-base">
                <td className="font-semibold">{s.material}</td>
                <td>{s.espesor ? `${s.espesor} mm` : '—'}</td>
                <td className="text-right">
                  <span className={`font-bold text-lg ${s.metrosDisponibles < 100 ? 'text-error' : s.metrosDisponibles < 300 ? 'text-warning' : 'text-success'}`}>
                    {Number(s.metrosDisponibles).toFixed(0)} m
                  </span>
                </td>
                <td className="text-sm text-base-content/60">{s.proveedorNombre || s.proveedor || '—'}</td>
              </tr>
            ))}
            {filtrado.length === 0 && (
              <tr><td colSpan={4} className="text-center py-10 text-base-content/40">Sin datos de stock</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Tab Calculadora ──────────────────────────────────────────────────────────
function TabCalculadora() {
  const { data: rollos }   = useSWR('/api/tarifas-rollo');
  const { data: materiales } = useSWR('/api/precios');

  const [modo, setModo]     = useState('rollo');   // 'rollo' | 'lamina'
  const [material, setMaterial] = useState('');
  const [espesor, setEspesor]   = useState('');
  const [ancho, setAncho]       = useState('');
  const [metros, setMetros]     = useState('');
  const [cantidad, setCantidad] = useState('1');
  const [resultado, setResultado] = useState(null);

  const materialesUnicos = useMemo(() => {
    const src = modo === 'rollo' ? rollos : materiales;
    if (!src) return [];
    return [...new Set(src.map(t => t.material))].sort();
  }, [rollos, materiales, modo]);

  const espesoresDisponibles = useMemo(() => {
    const src = modo === 'rollo' ? rollos : materiales;
    if (!src || !material) return [];
    return [...new Set(src.filter(t => t.material === material).map(t => t.espesor))].sort((a, b) => a - b);
  }, [rollos, materiales, material, modo]);

  const anchoDisponibles = useMemo(() => {
    if (modo !== 'rollo' || !rollos || !material || !espesor) return [];
    return [...new Set(rollos.filter(t => t.material === material && Number(t.espesor) === Number(espesor) && t.ancho).map(t => t.ancho))].sort((a, b) => a - b);
  }, [rollos, material, espesor, modo]);

  const calcular = () => {
    const src = modo === 'rollo' ? rollos : materiales;
    if (!src) return;

    if (modo === 'rollo') {
      const tarifa = src.find(t =>
        t.material === material &&
        Number(t.espesor) === Number(espesor) &&
        (!ancho || Number(t.ancho) === Number(ancho))
      );
      if (!tarifa) { setResultado({ error: 'No se encontró tarifa para esa combinación.' }); return; }
      const m = parseFloat(metros) || 0;
      const precioNeto = m * Number(tarifa.precioBase);
      const iva = precioNeto * 0.21;
      setResultado({
        tipo: 'Rollo/Metro',
        tarifa: `${Number(tarifa.precioBase).toFixed(2)} €/m`,
        metros: m,
        peso: m * Number(tarifa.peso),
        precioNeto,
        iva,
        total: precioNeto + iva,
        minimo: tarifa.metrajeMinimo,
        aviso: m < tarifa.metrajeMinimo ? `Mínimo: ${tarifa.metrajeMinimo} m` : null,
      });
    } else {
      const tarifa = src.find(t =>
        t.material === material && Number(t.espesor) === Number(espesor)
      );
      if (!tarifa) { setResultado({ error: 'No se encontró tarifa para esa combinación.' }); return; }
      const q = parseInt(cantidad) || 1;
      const precioNeto = q * Number(tarifa.precio);
      const iva = precioNeto * 0.21;
      setResultado({
        tipo: 'Lámina/Unidad',
        tarifa: `${Number(tarifa.precio).toFixed(2)} €/u`,
        cantidad: q,
        peso: q * Number(tarifa.peso),
        precioNeto,
        iva,
        total: precioNeto + iva,
        aviso: null,
      });
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      {/* Selector modo */}
      <div className="flex gap-2 mb-6">
        <button className={`btn flex-1 ${modo === 'rollo' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => { setModo('rollo'); setResultado(null); setMaterial(''); setEspesor(''); setAncho(''); }}>
          Metros de rollo
        </button>
        <button className={`btn flex-1 ${modo === 'lamina' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => { setModo('lamina'); setResultado(null); setMaterial(''); setEspesor(''); }}>
          Láminas/unidades
        </button>
      </div>

      <div className="space-y-4">
        <div className="form-control">
          <label className="label"><span className="label-text text-base font-semibold">Material</span></label>
          <select className="select select-bordered select-lg w-full" value={material}
            onChange={e => { setMaterial(e.target.value); setEspesor(''); setAncho(''); setResultado(null); }}>
            <option value="">-- Seleccionar --</option>
            {materialesUnicos.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {material && (
          <div className="form-control">
            <label className="label"><span className="label-text text-base font-semibold">Espesor (mm)</span></label>
            <select className="select select-bordered select-lg w-full" value={espesor}
              onChange={e => { setEspesor(e.target.value); setAncho(''); setResultado(null); }}>
              <option value="">-- Seleccionar --</option>
              {espesoresDisponibles.map(e => <option key={e} value={e}>{e} mm</option>)}
            </select>
          </div>
        )}

        {modo === 'rollo' && espesor && anchoDisponibles.length > 0 && (
          <div className="form-control">
            <label className="label"><span className="label-text text-base font-semibold">Ancho (mm)</span></label>
            <select className="select select-bordered select-lg w-full" value={ancho}
              onChange={e => { setAncho(e.target.value); setResultado(null); }}>
              <option value="">Cualquier ancho</option>
              {anchoDisponibles.map(a => <option key={a} value={a}>{a} mm</option>)}
            </select>
          </div>
        )}

        {modo === 'rollo' && espesor && (
          <div className="form-control">
            <label className="label"><span className="label-text text-base font-semibold">Metros</span></label>
            <input type="number" min="0" step="0.1" value={metros}
              onChange={e => { setMetros(e.target.value); setResultado(null); }}
              className="input input-bordered input-lg w-full text-xl" placeholder="0" />
          </div>
        )}

        {modo === 'lamina' && espesor && (
          <div className="form-control">
            <label className="label"><span className="label-text text-base font-semibold">Cantidad</span></label>
            <input type="number" min="1" step="1" value={cantidad}
              onChange={e => { setCantidad(e.target.value); setResultado(null); }}
              className="input input-bordered input-lg w-full text-xl" placeholder="1" />
          </div>
        )}

        <button className="btn btn-primary btn-lg w-full text-lg mt-2" onClick={calcular}
          disabled={!material || !espesor || (modo === 'rollo' ? !metros : !cantidad)}>
          <Calculator className="w-5 h-5" /> Calcular precio
        </button>
      </div>

      {/* Resultado */}
      {resultado && (
        <div className={`mt-6 rounded-xl p-5 ${resultado.error ? 'bg-error/10 border border-error/30' : 'bg-primary/5 border border-primary/20'}`}>
          {resultado.error ? (
            <p className="text-error font-semibold">{resultado.error}</p>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-base-content/60">
                <span>{resultado.tipo}</span>
                <span>{resultado.tarifa}</span>
              </div>
              {resultado.aviso && (
                <div className="alert alert-warning py-2 text-sm">{resultado.aviso}</div>
              )}
              <div className="flex justify-between">
                <span>{modo === 'rollo' ? `${resultado.metros} m` : `${resultado.cantidad} ud`}</span>
                <span className="font-semibold">{resultado.precioNeto.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-sm text-base-content/60">
                <span>IVA (21%)</span>
                <span>{resultado.iva.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-sm text-base-content/60">
                <span>Peso estimado</span>
                <span>{resultado.peso.toFixed(2)} kg</span>
              </div>
              <div className="divider my-1" />
              <div className="flex justify-between font-bold text-2xl text-primary">
                <span>TOTAL</span>
                <span>{resultado.total.toFixed(2)} €</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Página principal ─────────────────────────────────────────────────────────
const TABS = [
  { id: 'tarifas',      label: 'Tarifas',      icon: BarChart2   },
  { id: 'stock',        label: 'Stock',         icon: Package     },
  { id: 'calculadora',  label: 'Calculadora',   icon: Calculator  },
];

export default function TabletPage() {
  const [tab, setTab] = useState('tarifas');

  return (
    <div>
      {/* Tab bar táctil */}
      <div className="flex gap-2 mb-6">
        {TABS.map(t => (
          <button key={t.id}
            className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl text-sm font-semibold transition-colors
              ${tab === t.id ? 'bg-primary text-primary-content shadow' : 'bg-base-100 text-base-content/60 hover:bg-base-100'}`}
            onClick={() => setTab(t.id)}>
            <t.icon className="w-6 h-6" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-base-100 rounded-2xl shadow p-4">
        {tab === 'tarifas'     && <TabTarifas />}
        {tab === 'stock'       && <TabStock />}
        {tab === 'calculadora' && <TabCalculadora />}
      </div>
    </div>
  );
}
