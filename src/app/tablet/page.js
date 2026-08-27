"use client";
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import useSWR from 'swr';
import {
  Search, Package, BarChart2, Calculator, X,
  ClipboardList, Plus, CheckCircle, AlertTriangle,
  ScanLine, Wifi, WifiOff, Trash2, RotateCcw, ExternalLink, MessageCircle,
} from 'lucide-react';
import ChatConsulta from '@/componentes/compuestos/ChatConsulta';
import ModalEscanearEtiqueta from '@/componentes/calculadoras/ModalEscanearEtiqueta';
import {
  obtenerSesion, guardarSesion, borrarSesion, sincronizarSesion,
} from '@/lib/colaOffline';

// ── Utilidad de búsqueda ─────────────────────────────────────────────────────
function useBusqueda(lista, campos) {
  const [q, setQ] = useState('');
  const filtrado = useMemo(() => {
    if (!lista?.length || !q.trim()) return lista ?? [];
    const t = q.toLowerCase();
    return lista.filter(item =>
      campos.some(c => String(item[c] ?? '').toLowerCase().includes(t))
    );
  }, [lista, q, campos]);
  return { q, setQ, filtrado };
}

// ── Mensaje de feedback ──────────────────────────────────────────────────────
function Alerta({ msg, onClose }) {
  if (!msg) return null;
  return (
    <div className={`alert ${msg.ok ? 'alert-success' : 'alert-error'} mb-4 flex items-center gap-3`}>
      {msg.ok ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
      <span className="flex-1">{msg.text}</span>
      <button onClick={onClose} className="btn btn-ghost btn-xs btn-circle"><X className="w-4 h-4" /></button>
    </div>
  );
}

// ── Tab Tarifas ──────────────────────────────────────────────────────────────
function TabTarifas() {
  const { data: materiales } = useSWR('/api/precios');
  const { data: rollos }     = useSWR('/api/tarifas-rollo');
  const [modo, setModo]      = useState('material');
  const lista                = modo === 'material' ? (materiales ?? []) : (rollos ?? []);
  const campos               = useMemo(() => modo === 'material' ? ['material', 'color'] : ['material', 'color', 'ancho'], [modo]);
  const { q, setQ, filtrado } = useBusqueda(lista, campos);

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button className={`btn btn-sm flex-1 ${modo === 'material' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => { setModo('material'); setQ(''); }}>Por lámina</button>
        <button className={`btn btn-sm flex-1 ${modo === 'rollo' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => { setModo('rollo'); setQ(''); }}>Por rollo/metro</button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
        <input type="text" value={q} onChange={e => setQ(e.target.value)}
          placeholder="Buscar material, color..."
          className="input input-bordered w-full pl-9 text-lg h-14" />
        {q && (
          <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 btn btn-ghost btn-xs btn-circle">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        {modo === 'material' ? (
          <table className="table table-zebra w-full">
            <thead><tr className="text-base">
              <th>Material</th><th>Espesor</th><th>Color</th>
              <th className="text-right">Precio/u</th><th className="text-right">Peso/u</th>
            </tr></thead>
            <tbody>
              {filtrado.map((t, i) => (
                <tr key={i} className="text-base">
                  <td className="font-semibold">{t.material}</td>
                  <td>{t.espesor} mm</td>
                  <td>{t.color || '—'}</td>
                  <td className="text-right font-bold text-primary">{Number(t.precio).toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €</td>
                  <td className="text-right">{Number(t.peso).toLocaleString('es-ES', {minimumFractionDigits: 3, maximumFractionDigits: 3})} kg</td>
                </tr>
              ))}
              {filtrado.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-base-content/40">Sin resultados</td></tr>}
            </tbody>
          </table>
        ) : (
          <table className="table table-zebra w-full">
            <thead><tr className="text-base">
              <th>Material</th><th>Espesor</th><th>Ancho</th><th>Color</th>
              <th className="text-right">Precio/m</th><th className="text-right">Mín. m</th>
            </tr></thead>
            <tbody>
              {filtrado.map((t, i) => (
                <tr key={i} className="text-base">
                  <td className="font-semibold">{t.material}</td>
                  <td>{t.espesor} mm</td>
                  <td>{t.ancho ? `${t.ancho} mm` : '—'}</td>
                  <td>{t.color || '—'}</td>
                  <td className="text-right font-bold text-primary">{Number(t.precioBase).toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €</td>
                  <td className="text-right">{t.metrajeMinimo} m</td>
                </tr>
              ))}
              {filtrado.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-base-content/40">Sin resultados</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Tab Stock ────────────────────────────────────────────────────────────────
const CAMPOS_STOCK = ['material', 'proveedorNombre'];

function TabStock() {
  const { data, isLoading, mutate } = useSWR('/api/almacen-stock');
  const stock = data?.stock ?? [];
  const { q, setQ, filtrado } = useBusqueda(stock, CAMPOS_STOCK);

  const [mostrarEntrada, setMostrarEntrada] = useState(false);
  const [entrada, setEntrada]               = useState({ material: '', espesor: '', metros: '' });
  const [salidaId, setSalidaId]             = useState(null);
  const [salidaMetros, setSalidaMetros]     = useState('');
  const [enviando, setEnviando]             = useState(false);
  const [msg, setMsg]                       = useState(null);

  const handleEntrada = async () => {
    if (!entrada.material || !entrada.metros) return;
    setEnviando(true);
    try {
      const res = await fetch('/api/almacen-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          material: entrada.material.trim(),
          espesor: entrada.espesor || 0,
          metrosDisponibles: entrada.metros,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setMsg({ ok: true, text: 'Entrada registrada correctamente.' });
        setEntrada({ material: '', espesor: '', metros: '' });
        setMostrarEntrada(false);
        mutate();
      } else {
        setMsg({ ok: false, text: json.message || 'Error al registrar.' });
      }
    } catch {
      setMsg({ ok: false, text: 'Error de conexión.' });
    }
    setEnviando(false);
  };

  const handleSalida = async () => {
    if (!salidaId || !salidaMetros) return;
    setEnviando(true);
    try {
      const res = await fetch('/api/almacen-stock?action=salida', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stockId: salidaId, cantidad: salidaMetros }),
      });
      const json = await res.json();
      if (res.ok) {
        setMsg({ ok: true, text: 'Salida registrada correctamente.' });
        setSalidaId(null);
        setSalidaMetros('');
        mutate();
      } else {
        setMsg({ ok: false, text: json.message || 'Error al registrar.' });
      }
    } catch {
      setMsg({ ok: false, text: 'Error de conexión.' });
    }
    setEnviando(false);
  };

  if (isLoading) return <div className="flex justify-center py-20"><span className="loading loading-spinner loading-lg" /></div>;

  const materialesExistentes = [...new Set(stock.map(s => s.material))].sort();

  return (
    <div>
      <Alerta msg={msg} onClose={() => setMsg(null)} />

      {/* Barra búsqueda + botón entrada */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
          <input type="text" value={q} onChange={e => setQ(e.target.value)}
            placeholder="Buscar material..."
            className="input input-bordered w-full pl-9 text-lg h-14" />
          {q && (
            <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 btn btn-ghost btn-xs btn-circle">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          className={`btn h-14 px-4 ${mostrarEntrada ? 'btn-outline btn-primary' : 'btn-primary'}`}
          onClick={() => { setMostrarEntrada(v => !v); setSalidaId(null); }}>
          <Plus className="w-5 h-5" /> Entrada
        </button>
      </div>

      {/* Formulario de entrada */}
      {mostrarEntrada && (
        <div className="bg-base-200 rounded-xl p-4 mb-4 border border-base-300">
          <h4 className="font-semibold mb-3 text-base">Nueva entrada de stock</h4>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="form-control col-span-1">
              <label className="label py-1"><span className="label-text text-sm font-medium">Material</span></label>
              <input type="text" list="materiales-list" value={entrada.material}
                onChange={e => setEntrada(v => ({ ...v, material: e.target.value }))}
                placeholder="Ej: PVC" className="input input-bordered input-lg w-full" />
              <datalist id="materiales-list">
                {materialesExistentes.map(m => <option key={m} value={m} />)}
              </datalist>
            </div>
            <div className="form-control">
              <label className="label py-1"><span className="label-text text-sm font-medium">Espesor (mm)</span></label>
              <input type="number" min="0" step="0.1" value={entrada.espesor}
                onChange={e => setEntrada(v => ({ ...v, espesor: e.target.value }))}
                placeholder="0" className="input input-bordered input-lg w-full" />
            </div>
            <div className="form-control">
              <label className="label py-1"><span className="label-text text-sm font-medium">Metros</span></label>
              <input type="number" min="0" step="1" value={entrada.metros}
                onChange={e => setEntrada(v => ({ ...v, metros: e.target.value }))}
                placeholder="0" className="input input-bordered input-lg w-full" />
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-primary flex-1" onClick={handleEntrada}
              disabled={enviando || !entrada.material || !entrada.metros}>
              {enviando ? <span className="loading loading-spinner loading-sm" /> : <CheckCircle className="w-4 h-4" />}
              Registrar entrada
            </button>
            <button className="btn btn-ghost" onClick={() => setMostrarEntrada(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Formulario de salida (inline bajo la fila) */}
      {salidaId && (
        <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 mb-4">
          <h4 className="font-semibold mb-3 text-base text-warning">
            Registrar salida — {stock.find(s => s.id === salidaId)?.material}
          </h4>
          <div className="flex gap-2 items-end">
            <div className="form-control flex-1">
              <label className="label py-1"><span className="label-text text-sm font-medium">Metros a descontar</span></label>
              <input type="number" min="0.1" step="0.1" value={salidaMetros}
                onChange={e => setSalidaMetros(e.target.value)}
                placeholder="0" className="input input-bordered input-lg w-full" autoFocus />
            </div>
            <button className="btn btn-warning h-14 px-6" onClick={handleSalida}
              disabled={enviando || !salidaMetros}>
              {enviando ? <span className="loading loading-spinner loading-sm" /> : null}
              Confirmar
            </button>
            <button className="btn btn-ghost h-14" onClick={() => { setSalidaId(null); setSalidaMetros(''); }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Tabla stock */}
      <div className="overflow-x-auto">
        <table className="table table-zebra w-full">
          <thead>
            <tr className="text-base">
              <th>Material</th><th>Espesor</th>
              <th className="text-right">Metros disp.</th><th>Proveedor</th><th></th>
            </tr>
          </thead>
          <tbody>
            {filtrado.map(s => (
              <tr key={s.id} className={`text-base ${salidaId === s.id ? 'bg-warning/5' : ''}`}>
                <td className="font-semibold">{s.material}</td>
                <td>{s.espesor ? `${s.espesor} mm` : '—'}</td>
                <td className="text-right">
                  <span className={`font-bold text-lg ${s.metrosDisponibles < 100 ? 'text-error' : s.metrosDisponibles < 300 ? 'text-warning' : 'text-success'}`}>
                    {Number(s.metrosDisponibles).toLocaleString('es-ES', {minimumFractionDigits: 0, maximumFractionDigits: 0})} m
                  </span>
                </td>
                <td className="text-sm text-base-content/60">{s.proveedorNombre || '—'}</td>
                <td className="text-right">
                  <button
                    className={`btn btn-sm ${salidaId === s.id ? 'btn-warning' : 'btn-outline btn-warning'}`}
                    onClick={() => { setSalidaId(salidaId === s.id ? null : s.id); setSalidaMetros(''); setMostrarEntrada(false); }}>
                    Salida
                  </button>
                </td>
              </tr>
            ))}
            {filtrado.length === 0 && (
              <tr><td colSpan={5} className="text-center py-10 text-base-content/40">Sin datos de stock</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Tab Pedidos ──────────────────────────────────────────────────────────────
const ESTADOS_ACTIVOS = ['PENDIENTE', 'EN_PROCESO'];
const BADGE_ESTADO = {
  PENDIENTE:   'badge-warning',
  EN_PROCESO:  'badge-info',
  COMPLETADO:  'badge-success',
  CANCELADO:   'badge-error',
};

function TabPedidos() {
  const { data, isLoading } = useSWR('/api/pedidos?limit=200');
  const pedidosFlat = useMemo(() => {
    const lista = data?.data ?? [];
    return lista
      .filter(p => ESTADOS_ACTIVOS.includes(p.estado))
      .map(p => ({ ...p, clienteNombre: p.cliente?.nombre ?? '—' }));
  }, [data]);

  const { q, setQ, filtrado } = useBusqueda(pedidosFlat, ['numero', 'clienteNombre']);

  if (isLoading) return <div className="flex justify-center py-20"><span className="loading loading-spinner loading-lg" /></div>;

  return (
    <div>
      {/* Resumen */}
      <div className="flex gap-3 mb-4">
        {ESTADOS_ACTIVOS.map(est => {
          const count = pedidosFlat.filter(p => p.estado === est).length;
          return (
            <div key={est} className={`badge ${BADGE_ESTADO[est]} badge-lg gap-1 py-3 px-4 text-sm`}>
              {count} {est.replace('_', ' ')}
            </div>
          );
        })}
        {pedidosFlat.length === 0 && (
          <p className="text-base-content/40 text-sm">No hay pedidos activos.</p>
        )}
      </div>

      {/* Búsqueda */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
        <input type="text" value={q} onChange={e => setQ(e.target.value)}
          placeholder="Buscar por número o cliente..."
          className="input input-bordered w-full pl-9 text-lg h-14" />
        {q && (
          <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 btn btn-ghost btn-xs btn-circle">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="table table-zebra w-full">
          <thead>
            <tr className="text-base">
              <th>Pedido</th><th>Cliente</th><th>Estado</th><th className="text-right">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {filtrado.map(p => (
              <tr key={p.id} className="text-base">
                <td className="font-mono font-semibold">{p.numero}</td>
                <td className="font-medium">{p.clienteNombre}</td>
                <td>
                  <span className={`badge ${BADGE_ESTADO[p.estado] ?? 'badge-neutral'}`}>
                    {p.estado?.replace('_', ' ')}
                  </span>
                </td>
                <td className="text-right text-sm text-base-content/60">
                  {p.fechaCreacion ? new Date(p.fechaCreacion).toLocaleDateString('es-ES') : '—'}
                </td>
              </tr>
            ))}
            {filtrado.length === 0 && pedidosFlat.length > 0 && (
              <tr><td colSpan={4} className="text-center py-10 text-base-content/40">Sin resultados</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Tab Calculadora ──────────────────────────────────────────────────────────
function TabCalculadora() {
  const { data: rollos }     = useSWR('/api/tarifas-rollo');
  const { data: materiales } = useSWR('/api/precios');
  const { data: configData } = useSWR('/api/config');
  // FRONT-01: leer iva_rate desde config en lugar de hardcodear 0.21
  const ivaRate = configData?.iva_rate ?? 0.21;

  const [modo, setModo]         = useState('rollo');
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
        t.material === material && Number(t.espesor) === Number(espesor) &&
        (!ancho || Number(t.ancho) === Number(ancho))
      );
      if (!tarifa) { setResultado({ error: 'No se encontró tarifa para esa combinación.' }); return; }
      const m = parseFloat(metros) || 0;
      const precioNeto = m * Number(tarifa.precioBase);
      const iva = precioNeto * ivaRate;
      setResultado({
        tipo: 'Rollo/Metro', tarifa: `${Number(tarifa.precioBase).toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €/m`,
        metros: m, peso: m * Number(tarifa.peso), precioNeto, iva, total: precioNeto + iva,
        minimo: tarifa.metrajeMinimo,
        aviso: m < tarifa.metrajeMinimo ? `Mínimo: ${tarifa.metrajeMinimo} m` : null,
      });
    } else {
      const tarifa = src.find(t => t.material === material && Number(t.espesor) === Number(espesor));
      if (!tarifa) { setResultado({ error: 'No se encontró tarifa para esa combinación.' }); return; }
      const q = parseInt(cantidad) || 1;
      const precioNeto = q * Number(tarifa.precio);
      const iva = precioNeto * ivaRate;
      setResultado({
        tipo: 'Lámina/Unidad', tarifa: `${Number(tarifa.precio).toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €/u`,
        cantidad: q, peso: q * Number(tarifa.peso), precioNeto, iva, total: precioNeto + iva, aviso: null,
      });
    }
  };

  return (
    <div className="max-w-lg mx-auto">
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

      {resultado && (
        <div className={`mt-6 rounded-xl p-5 ${resultado.error ? 'bg-error/10 border border-error/30' : 'bg-primary/5 border border-primary/20'}`}>
          {resultado.error ? (
            <p className="text-error font-semibold">{resultado.error}</p>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-base-content/60">
                <span>{resultado.tipo}</span><span>{resultado.tarifa}</span>
              </div>
              {resultado.aviso && <div className="alert alert-warning py-2 text-sm">{resultado.aviso}</div>}
              <div className="flex justify-between">
                <span>{modo === 'rollo' ? `${resultado.metros} m` : `${resultado.cantidad} ud`}</span>
                <span className="font-semibold">{resultado.precioNeto.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €</span>
              </div>
              <div className="flex justify-between text-sm text-base-content/60">
                <span>IVA (21%)</span><span>{resultado.iva.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €</span>
              </div>
              <div className="flex justify-between text-sm text-base-content/60">
                <span>Peso estimado</span><span>{resultado.peso.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} kg</span>
              </div>
              <div className="divider my-1" />
              <div className="flex justify-between font-bold text-2xl text-primary">
                <span>TOTAL</span><span>{resultado.total.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Tab Recepción offline ────────────────────────────────────────────────────
function TabRecepcion() {
  const [sesion, setSesion]         = useState(null);   // sesión activa local
  const [online, setOnline]         = useState(true);
  const [sincronizando, setSinc]    = useState(false);
  const [ultimaSync, setUltimaSync] = useState(null);   // timestamp
  const [errorSync, setErrorSync]   = useState(null);
  const [modalEscaner, setModal]    = useState(false);
  const [cargando, setCargando]     = useState(true);

  // Formulario "nueva sesión"
  const [numContenedor, setNumContenedor] = useState('');
  const [numFactura,    setNumFactura]    = useState('');
  const [descripcion,   setDescripcion]  = useState('');

  // Confirmación de borrar sesión
  const [confirmBorrar, setConfirmBorrar] = useState(false);

  const syncRef    = useRef(null);  // evita llamadas simultáneas
  const sesionRef  = useRef(null);  // BUG-03: ref siempre actualizada para evitar stale closure

  // Cargar sesión local al montar
  useEffect(() => {
    obtenerSesion().then(s => { setSesion(s); sesionRef.current = s; setCargando(false); });
  }, []);

  // Detectar cambios de conectividad
  useEffect(() => {
    const up   = () => setOnline(true);
    const down = () => setOnline(false);
    setOnline(navigator.onLine);
    window.addEventListener('online',  up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);

  // Auto-sync cuando vuelve la conexión
  // BUG-03: usa sesionRef para evitar stale closure — siempre trabaja con la sesión más reciente
  const sincronizar = useCallback(async (sesionActual) => {
    if (syncRef.current) return;  // ya hay una sync en curso
    const s = sesionActual || sesionRef.current;
    if (!s || s.items.length === 0) return;
    if (!navigator.onLine) return;

    syncRef.current = true;
    setSinc(true);
    setErrorSync(null);

    try {
      const resultado = await sincronizarSesion(s);
      if (resultado.ok) {
        setSesion(resultado.sesion); sesionRef.current = resultado.sesion;
        setUltimaSync(Date.now());
      } else if (resultado.razon !== 'offline') {
        setErrorSync(resultado.razon);
      }
    } finally {
      setSinc(false);
      syncRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (online && sesion?.pendientes > 0) {
      sincronizar();
    }
  }, [online]); // eslint-disable-line react-hooks/exhaustive-deps

  // Iniciar nueva sesión
  const handleIniciar = async () => {
    if (!numContenedor.trim() && !numFactura.trim()) return;
    const nueva = {
      realId:        null,
      numContenedor: numContenedor.trim(),
      numFactura:    numFactura.trim(),
      descripcion:   descripcion.trim(),
      items:         [],
      pendientes:    0,
      iniciadaEn:    Date.now(),
    };
    await guardarSesion(nueva);
    setSesion(nueva); sesionRef.current = nueva;
    setNumContenedor(''); setNumFactura(''); setDescripcion('');
  };

  // Añadir artículo escaneado
  // BUG-11: setter funcional para evitar stale closure si el usuario escanea dos artículos seguidos
  const handleArticuloEscaneado = useCallback((campos) => {
    setSesion(prev => {
      const nueva = {
        ...prev,
        items: [...prev.items, campos],
        pendientes: prev.pendientes + 1,
      };
      sesionRef.current = nueva;
      guardarSesion(nueva).catch(() => {});
      if (navigator.onLine) sincronizar(nueva);
      return nueva;
    });
  }, [sincronizar]);

  // Eliminar artículo de la lista
  const handleEliminar = useCallback(async (idx) => {
    const items = sesion.items.filter((_, i) => i !== idx);
    // BUG-02: pendientes refleja si hay cambios sin sincronizar, no la cantidad borrada
    const nuevaSesion = { ...sesion, items, pendientes: items.length > 0 ? 1 : 0 };
    await guardarSesion(nuevaSesion);
    setSesion(nuevaSesion); sesionRef.current = nuevaSesion;
    if (navigator.onLine) sincronizar(nuevaSesion);
  }, [sesion, sincronizar]);

  // Finalizar y abrir en calculadora
  const handleFinalizar = () => {
    if (!sesion?.realId) return;
    window.open(`/herramientas/calculadora-contenedor`, '_blank');
  };

  // Borrar sesión local (con confirmación)
  const handleBorrar = async () => {
    await borrarSesion();
    setSesion(null);
    setConfirmBorrar(false);
    setUltimaSync(null);
    setErrorSync(null);
  };

  if (cargando) {
    return <div className="flex justify-center py-20"><span className="loading loading-spinner loading-lg" /></div>;
  }

  // ── Sin sesión activa ──
  if (!sesion) {
    return (
      <div className="max-w-lg mx-auto space-y-5">
        <div className="alert alert-info text-sm">
          <ScanLine className="w-5 h-5 shrink-0" />
          <span>Introduce el número de contenedor o de factura para empezar a registrar los artículos recibidos. Puedes escanear sin wifi — los datos se sincronizan solos en cuanto vuelve la conexión.</span>
        </div>

        <div className="card bg-base-100 shadow-sm">
          <div className="card-body gap-4">
            <h3 className="font-bold text-lg">Nueva recepción de contenedor</h3>

            <div className="form-control">
              <label className="label"><span className="label-text font-semibold">Nº Contenedor naviera</span></label>
              <input
                type="text"
                className="input input-bordered input-lg"
                placeholder="MSCU1234567"
                value={numContenedor}
                onChange={e => setNumContenedor(e.target.value)}
              />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text font-semibold">Nº Factura proveedor</span></label>
              <input
                type="text"
                className="input input-bordered input-lg"
                placeholder="INV-2026-001"
                value={numFactura}
                onChange={e => setNumFactura(e.target.value)}
              />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text font-semibold">Descripción (opcional)</span></label>
              <input
                type="text"
                className="input input-bordered input-lg"
                placeholder="Ej: PVC junio 2026"
                value={descripcion}
                onChange={e => setDescripcion(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleIniciar()}
              />
            </div>

            <button
              className="btn btn-primary btn-lg w-full gap-2 mt-2"
              onClick={handleIniciar}
              disabled={!numContenedor.trim() && !numFactura.trim()}
            >
              <ScanLine className="w-5 h-5" />
              Iniciar recepción
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Sesión activa ──
  const hayItems = sesion.items.length > 0;

  return (
    <div className="space-y-4">
      {/* Cabecera sesión + estado online */}
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="font-bold text-lg">
                {sesion.numContenedor || sesion.numFactura || 'Recepción en curso'}
              </p>
              <p className="text-sm text-base-content/50">
                {sesion.numContenedor && `Contenedor: ${sesion.numContenedor}`}
                {sesion.numContenedor && sesion.numFactura && ' · '}
                {sesion.numFactura && `Factura: ${sesion.numFactura}`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Indicador online/offline */}
              <div className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1 rounded-full ${online ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
                {online ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                {online ? 'Con wifi' : 'Sin wifi'}
              </div>
              {/* Pendientes de sync */}
              {sesion.pendientes > 0 && (
                <span className="badge badge-warning badge-lg">
                  {sesion.pendientes} pendiente{sesion.pendientes !== 1 ? 's' : ''}
                </span>
              )}
              {sesion.pendientes === 0 && hayItems && (
                <span className="badge badge-success badge-lg">Sincronizado</span>
              )}
            </div>
          </div>

          {/* Sync status */}
          {sincronizando && (
            <div className="flex items-center gap-2 text-sm text-base-content/60 mt-2">
              <span className="loading loading-spinner loading-xs" />
              Sincronizando con el servidor…
            </div>
          )}
          {errorSync && (
            <div className="alert alert-warning text-sm py-2 mt-2 gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>No se pudo sincronizar: {errorSync}. Se reintentará cuando haya conexión.</span>
              <button className="btn btn-xs btn-ghost ml-auto" onClick={() => sincronizar()}>
                <RotateCcw className="w-3 h-3" /> Reintentar
              </button>
            </div>
          )}
          {ultimaSync && !sincronizando && !errorSync && (
            <p className="text-xs text-base-content/40 mt-1">
              Última sync: {new Date(ultimaSync).toLocaleTimeString('es-ES')}
              {sesion.realId && <span className="ml-2">· ID: <code className="font-mono">{sesion.realId.slice(0, 8)}…</code></span>}
            </p>
          )}
        </div>
      </div>

      {/* Botón escanear — grande, táctil */}
      <button
        className="btn btn-primary btn-lg w-full h-20 text-xl gap-3 shadow-md"
        onClick={() => setModal(true)}
      >
        <ScanLine className="w-8 h-8" />
        Escanear etiqueta
        <span className="badge badge-primary-content badge-lg">{sesion.items.length}</span>
      </button>

      {/* Lista de artículos */}
      {hayItems ? (
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body p-4">
            <h3 className="font-bold mb-3">
              Artículos registrados ({sesion.items.length})
            </h3>
            <div className="space-y-2">
              {sesion.items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-base-200 rounded-lg px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-mono font-semibold truncate">
                      {item.referencia || <span className="text-base-content/40">Sin referencia</span>}
                    </p>
                    <p className="text-xs text-base-content/50">
                      {item.tipo}
                      {item.espesor && ` · ${item.espesor}mm esp.`}
                      {item.ancho   && ` · ${item.ancho}mm ancho`}
                      {item.longitud && ` · ${item.longitud}m`}
                      {item.numRollos > 1 && ` · ${item.numRollos} rollos`}
                      {item.notas && ` · ${item.notas}`}
                    </p>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm text-error shrink-0"
                    onClick={() => handleEliminar(idx)}
                    aria-label="Eliminar artículo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-10 text-base-content/30">
          <ScanLine className="w-12 h-12 mx-auto mb-3" />
          <p>Todavía no hay artículos. ¡Escanea el primero!</p>
        </div>
      )}

      {/* Acciones finales */}
      {hayItems && (
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body p-4 gap-3">
            <p className="text-sm text-base-content/60">
              Cuando hayas terminado de descargar el camión, abre la calculadora desde el ordenador de la oficina para añadir el tipo de cambio y los gastos.
            </p>
            <button
              className="btn btn-success btn-lg w-full gap-2"
              onClick={handleFinalizar}
              disabled={!sesion.realId}
              title={!sesion.realId ? 'Necesitas wifi para enviar los datos antes de continuar' : ''}
            >
              <ExternalLink className="w-5 h-5" />
              Abrir en calculadora
              {!sesion.realId && <span className="badge badge-warning badge-sm">requiere sync</span>}
            </button>
          </div>
        </div>
      )}

      {/* Borrar sesión */}
      <div className="text-center">
        {!confirmBorrar ? (
          <button className="btn btn-ghost btn-sm text-base-content/40 gap-1" onClick={() => setConfirmBorrar(true)}>
            <Trash2 className="w-3 h-3" /> Descartar esta recepción
          </button>
        ) : (
          <div className="flex gap-2 justify-center">
            <button className="btn btn-error btn-sm gap-1" onClick={handleBorrar}>
              <Trash2 className="w-3 h-3" /> Sí, descartar todo
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setConfirmBorrar(false)}>Cancelar</button>
          </div>
        )}
      </div>

      {/* Modal escanear */}
      {modalEscaner && (
        <ModalEscanearEtiqueta
          onConfirmar={handleArticuloEscaneado}
          onClose={() => setModal(false)}
        />
      )}
    </div>
  );
}

// ── Página principal ─────────────────────────────────────────────────────────
const TABS = [
  { id: 'consultar',   label: 'Consultar',  icon: MessageCircle },
  { id: 'recepcion',   label: 'Recepción',  icon: ScanLine      },
  { id: 'tarifas',     label: 'Tarifas',    icon: BarChart2     },
  { id: 'stock',       label: 'Stock',      icon: Package       },
  { id: 'pedidos',     label: 'Pedidos',    icon: ClipboardList },
  { id: 'calculadora', label: 'Calcular',   icon: Calculator    },
];

export default function TabletPage() {
  const [tab, setTab] = useState('consultar');

  return (
    <>
      {/* Área de contenido — pb-20 para despejar la nav inferior fija */}
      <div className="p-4 pb-24 min-h-[calc(100vh-3rem)] flex flex-col">
        {tab === 'consultar'   && <ChatConsulta />}
        {tab === 'recepcion'   && <TabRecepcion />}
        {tab === 'tarifas'     && <TabTarifas />}
        {tab === 'stock'       && <TabStock />}
        {tab === 'pedidos'     && <TabPedidos />}
        {tab === 'calculadora' && <TabCalculadora />}
      </div>

      {/* Barra de navegación inferior */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 h-16 bg-base-100 border-t border-base-200 flex" style={{ boxShadow: '0 -2px 12px rgba(0,0,0,0.06)' }}>
        {TABS.map(t => {
          const activo = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors
                ${activo ? 'text-primary' : 'text-base-content/35 hover:text-base-content/60'}`}
            >
              {activo && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-b-full" />
              )}
              <t.icon className={`w-5 h-5 transition-transform duration-150 ${activo ? 'scale-110' : 'scale-100'}`} />
              <span className={`text-[10px] leading-tight ${activo ? 'font-semibold' : 'font-medium'}`}>
                {t.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
