'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { FileText, Plus, Trash2, Download, Package, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';

const fetcher = (url) => fetch(url).then(r => r.json());

const AGENCIAS = ['SEUR', 'DHL', 'MRW', 'GLS', 'Correos Express', 'ASM', 'TNT', 'UPS', 'Otro'];

const emptyExpedidor = { nombre: '', direccion: '', cp: '', ciudad: '', telefono: '', nif: '' };
const emptyDestinatario = { nombre: '', direccion: '', cp: '', ciudad: '', telefono: '', nif: '' };
const emptyMercancia = { descripcion: '', numPales: 1, numBultos: '', pesoBruto: '', valorDeclarado: '' };
const emptyPaleItem = { referencia: '', descripcion: '', numRollos: '', metros: '', peso: '' };

export default function CartaPortePage() {
  const { data: config } = useSWR('/api/config', fetcher);

  const [expedidor, setExpedidor] = useState(emptyExpedidor);
  const [destinatario, setDestinatario] = useState(emptyDestinatario);
  const [detalles, setDetalles] = useState({
    referencia: '',
    fecha: new Date().toISOString().split('T')[0],
    agencia: '',
    observaciones: '',
  });
  const [mercancias, setMercancias] = useState([{ ...emptyMercancia }]);
  const [pales, setPales] = useState([]);
  const [mostrarPales, setMostrarPales] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Prefill expedidor con datos de empresa al cargar
  useEffect(() => {
    if (!config) return;
    setExpedidor({
      nombre: config.empresa_nombre || '',
      direccion: config.empresa_direccion || '',
      cp: String(config.empresa_cp || ''),
      ciudad: config.empresa_ciudad || '',
      telefono: String(config.empresa_telefono || ''),
      nif: config.empresa_nif || '',
    });
  }, [config]);

  // ── Expedidor / Destinatario helpers ────────────────────────
  const setExpField = (field, val) => setExpedidor(p => ({ ...p, [field]: val }));
  const setDestField = (field, val) => setDestinatario(p => ({ ...p, [field]: val }));

  // ── Mercancías ───────────────────────────────────────────────
  const setMercanciaField = (idx, field, val) =>
    setMercancias(prev => prev.map((m, i) => i === idx ? { ...m, [field]: val } : m));
  const addMercancia = () => setMercancias(prev => [...prev, { ...emptyMercancia }]);
  const removeMercancia = (idx) => setMercancias(prev => prev.filter((_, i) => i !== idx));

  // ── Palés (T-35) ─────────────────────────────────────────────
  const addPale = () => setPales(prev => [
    ...prev,
    { numero: prev.length + 1, descripcion: '', items: [{ ...emptyPaleItem }] }
  ]);
  const removePale = (idx) => setPales(prev => prev.filter((_, i) => i !== idx));
  const setPaleField = (pIdx, field, val) =>
    setPales(prev => prev.map((p, i) => i === pIdx ? { ...p, [field]: val } : p));
  const setPaleItem = (pIdx, iIdx, field, val) =>
    setPales(prev => prev.map((p, i) =>
      i !== pIdx ? p : {
        ...p,
        items: p.items.map((it, j) => j === iIdx ? { ...it, [field]: val } : it),
      }
    ));
  const addPaleItem = (pIdx) =>
    setPales(prev => prev.map((p, i) =>
      i === pIdx ? { ...p, items: [...p.items, { ...emptyPaleItem }] } : p
    ));
  const removePaleItem = (pIdx, iIdx) =>
    setPales(prev => prev.map((p, i) =>
      i === pIdx ? { ...p, items: p.items.filter((_, j) => j !== iIdx) } : p
    ));

  // ── Generar PDF ──────────────────────────────────────────────
  const handleGenerarPDF = async () => {
    setLoading(true);
    setError(null);

    const payload = {
      referencia: detalles.referencia,
      fecha: detalles.fecha,
      agencia: detalles.agencia,
      observaciones: detalles.observaciones,
      expedidor,
      destinatario,
      mercancias: mercancias.map(m => ({
        ...m,
        numPales: m.numPales !== '' ? Number(m.numPales) : null,
        numBultos: m.numBultos !== '' ? Number(m.numBultos) : null,
        pesoBruto: m.pesoBruto !== '' ? Number(m.pesoBruto) : null,
        valorDeclarado: m.valorDeclarado !== '' ? Number(m.valorDeclarado) : null,
      })),
      pales: pales.map(p => ({
        ...p,
        items: p.items.map(it => ({
          ...it,
          numRollos: it.numRollos !== '' ? Number(it.numRollos) : null,
          metros: it.metros !== '' ? Number(it.metros) : null,
          peso: it.peso !== '' ? Number(it.peso) : null,
        })),
      })),
    };

    try {
      const res = await fetch('/api/herramientas/carta-porte', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Error al generar el PDF');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `carta-porte-${detalles.referencia || Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || 'Error desconocido al generar el PDF.');
    } finally {
      setLoading(false);
    }
  };

  // ── Resumen totales mercancía ────────────────────────────────
  const totalPales = mercancias.reduce((s, m) => s + (Number(m.numPales) || 0), 0);
  const totalBultos = mercancias.reduce((s, m) => s + (Number(m.numBultos) || 0), 0);
  const totalPeso = mercancias.reduce((s, m) => s + (Number(m.pesoBruto) || 0), 0);

  const inputCls = 'input input-bordered input-sm w-full';
  const labelCls = 'label-text text-xs font-medium';

  const AddressSection = ({ title, data, setField }) => (
    <div className="card bg-base-100 border border-base-300 shadow-sm">
      <div className="card-body p-4">
        <h3 className="font-bold text-sm uppercase tracking-wide text-base-content/60 mb-3">{title}</h3>
        <div className="grid grid-cols-1 gap-2">
          <div className="form-control">
            <label className="label py-0.5"><span className={labelCls}>Nombre / Razón social *</span></label>
            <input type="text" className={inputCls} value={data.nombre}
              onChange={e => setField('nombre', e.target.value)} placeholder="Empresa S.L." />
          </div>
          <div className="form-control">
            <label className="label py-0.5"><span className={labelCls}>Dirección</span></label>
            <input type="text" className={inputCls} value={data.direccion}
              onChange={e => setField('direccion', e.target.value)} placeholder="C/ Ejemplo, 42" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="form-control">
              <label className="label py-0.5"><span className={labelCls}>CP</span></label>
              <input type="text" className={inputCls} value={data.cp}
                onChange={e => setField('cp', e.target.value)} placeholder="14000" maxLength={10} />
            </div>
            <div className="form-control">
              <label className="label py-0.5"><span className={labelCls}>Ciudad</span></label>
              <input type="text" className={inputCls} value={data.ciudad}
                onChange={e => setField('ciudad', e.target.value)} placeholder="Córdoba" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="form-control">
              <label className="label py-0.5"><span className={labelCls}>Teléfono</span></label>
              <input type="text" className={inputCls} value={data.telefono}
                onChange={e => setField('telefono', e.target.value)} placeholder="957 000 000" />
            </div>
            <div className="form-control">
              <label className="label py-0.5"><span className={labelCls}>NIF / CIF</span></label>
              <input type="text" className={inputCls} value={data.nif}
                onChange={e => setField('nif', e.target.value)} placeholder="B12345678" maxLength={15} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto p-4 max-w-5xl">
      {/* Cabecera */}
      <div className="flex items-center gap-3 mb-6">
        <FileText className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Carta de Porte</h1>
          <p className="text-sm text-base-content/60">Genera un albarán de expedición para la agencia de transporte.</p>
        </div>
        <div className="ml-auto">
          <Link href="/herramientas" className="btn btn-ghost btn-sm">← Herramientas</Link>
        </div>
      </div>

      {error && (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
          <button className="btn btn-xs btn-ghost" onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Datos del envío */}
      <div className="card bg-base-100 border border-base-300 shadow-sm mb-4">
        <div className="card-body p-4">
          <h3 className="font-bold text-sm uppercase tracking-wide text-base-content/60 mb-3">Datos del envío</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="form-control">
              <label className="label py-0.5"><span className={labelCls}>Referencia</span></label>
              <input type="text" className={inputCls} value={detalles.referencia}
                onChange={e => setDetalles(p => ({ ...p, referencia: e.target.value }))}
                placeholder="PED-001-2026" />
            </div>
            <div className="form-control">
              <label className="label py-0.5"><span className={labelCls}>Fecha</span></label>
              <input type="date" className={inputCls} value={detalles.fecha}
                onChange={e => setDetalles(p => ({ ...p, fecha: e.target.value }))} />
            </div>
            <div className="form-control col-span-2">
              <label className="label py-0.5"><span className={labelCls}>Agencia de transporte</span></label>
              <div className="flex gap-2">
                <select className="select select-bordered select-sm flex-1"
                  value={AGENCIAS.includes(detalles.agencia) ? detalles.agencia : 'Otro'}
                  onChange={e => {
                    if (e.target.value !== 'Otro') setDetalles(p => ({ ...p, agencia: e.target.value }));
                    else setDetalles(p => ({ ...p, agencia: '' }));
                  }}>
                  <option value="">— Seleccionar —</option>
                  {AGENCIAS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                {(!AGENCIAS.includes(detalles.agencia) || detalles.agencia === '') && (
                  <input type="text" className="input input-bordered input-sm flex-1"
                    value={detalles.agencia}
                    onChange={e => setDetalles(p => ({ ...p, agencia: e.target.value }))}
                    placeholder="Nombre agencia..." />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Expedidor y Destinatario */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <AddressSection title="Expedidor (remitente)" data={expedidor} setField={setExpField} />
        <AddressSection title="Destinatario (consignatario)" data={destinatario} setField={setDestField} />
      </div>

      {/* Mercancía */}
      <div className="card bg-base-100 border border-base-300 shadow-sm mb-4">
        <div className="card-body p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm uppercase tracking-wide text-base-content/60">Mercancía</h3>
            {totalPales > 0 && (
              <div className="flex gap-3 text-xs text-base-content/60">
                <span>{totalPales} palés</span>
                {totalBultos > 0 && <span>{totalBultos} bultos</span>}
                {totalPeso > 0 && <span>{totalPeso} kg</span>}
              </div>
            )}
          </div>

          <div className="space-y-2">
            {/* Cabecera columnas */}
            <div className="hidden md:grid grid-cols-12 gap-2 text-xs text-base-content/50 font-medium px-1">
              <span className="col-span-4">Descripción</span>
              <span className="col-span-2 text-center">Nº Palés</span>
              <span className="col-span-2 text-center">Nº Bultos</span>
              <span className="col-span-2 text-center">Peso bruto (kg)</span>
              <span className="col-span-2 text-center">Valor (€)</span>
            </div>

            {mercancias.map((m, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                <input type="text" className={`${inputCls} col-span-12 md:col-span-4`}
                  placeholder="Ej: Bobinas PVC, rollos industriales..."
                  value={m.descripcion}
                  onChange={e => setMercanciaField(idx, 'descripcion', e.target.value)} />
                <input type="number" className={`${inputCls} col-span-3 md:col-span-2`}
                  placeholder="Palés" min="0"
                  value={m.numPales}
                  onChange={e => setMercanciaField(idx, 'numPales', e.target.value)} />
                <input type="number" className={`${inputCls} col-span-3 md:col-span-2`}
                  placeholder="Bultos" min="0"
                  value={m.numBultos}
                  onChange={e => setMercanciaField(idx, 'numBultos', e.target.value)} />
                <input type="number" className={`${inputCls} col-span-3 md:col-span-2`}
                  placeholder="kg" min="0" step="0.1"
                  value={m.pesoBruto}
                  onChange={e => setMercanciaField(idx, 'pesoBruto', e.target.value)} />
                <div className="col-span-3 md:col-span-2 flex gap-1">
                  <input type="number" className={`${inputCls} flex-1`}
                    placeholder="€" min="0" step="0.01"
                    value={m.valorDeclarado}
                    onChange={e => setMercanciaField(idx, 'valorDeclarado', e.target.value)} />
                  {mercancias.length > 1 && (
                    <button className="btn btn-xs btn-ghost text-error" onClick={() => removeMercancia(idx)}>
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button className="btn btn-xs btn-ghost btn-outline mt-2 w-fit" onClick={addMercancia}>
            <Plus className="w-3 h-3" /> Añadir línea de mercancía
          </button>
        </div>
      </div>

      {/* Observaciones */}
      <div className="form-control mb-4">
        <label className="label py-0.5">
          <span className="label-text text-sm font-medium">Observaciones / Instrucciones de entrega</span>
        </label>
        <textarea className="textarea textarea-bordered text-sm h-20"
          placeholder="Ej: Entregar en horario de mañana. Frágil. No apilar."
          value={detalles.observaciones}
          onChange={e => setDetalles(p => ({ ...p, observaciones: e.target.value }))} />
      </div>

      {/* Inventario de palés (T-35) */}
      <div className="card bg-base-100 border border-base-300 shadow-sm mb-6">
        <div className="card-body p-4">
          <button
            className="flex items-center justify-between w-full text-left"
            onClick={() => setMostrarPales(p => !p)}
          >
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              <span className="font-bold text-sm uppercase tracking-wide text-base-content/60">
                Inventario de palés
              </span>
              {pales.length > 0 && (
                <span className="badge badge-primary badge-sm">{pales.length} palé{pales.length !== 1 ? 's' : ''}</span>
              )}
            </div>
            {mostrarPales ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <p className="text-xs text-base-content/50 mt-1">
            Opcional. Detalla el contenido de cada palé para el albarán de expedición.
          </p>

          {mostrarPales && (
            <div className="mt-4 space-y-6">
              {pales.map((pale, pIdx) => (
                <div key={pIdx} className="border border-base-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="badge badge-neutral badge-sm">Palé {pale.numero}</span>
                    <input type="text" className="input input-bordered input-xs flex-1"
                      placeholder="Descripción del palé (opcional)"
                      value={pale.descripcion}
                      onChange={e => setPaleField(pIdx, 'descripcion', e.target.value)} />
                    <button className="btn btn-xs btn-ghost text-error" onClick={() => removePale(pIdx)}>
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Items del palé */}
                  <div className="space-y-2">
                    <div className="hidden md:grid grid-cols-12 gap-2 text-xs text-base-content/40 font-medium px-1">
                      <span className="col-span-2">Referencia</span>
                      <span className="col-span-4">Descripción</span>
                      <span className="col-span-2 text-center">Nº Rollos</span>
                      <span className="col-span-2 text-center">Metros</span>
                      <span className="col-span-2 text-center">Peso (kg)</span>
                    </div>

                    {pale.items.map((item, iIdx) => (
                      <div key={iIdx} className="grid grid-cols-12 gap-2 items-center">
                        <input type="text" className="input input-bordered input-xs col-span-6 md:col-span-2"
                          placeholder="Ref." value={item.referencia}
                          onChange={e => setPaleItem(pIdx, iIdx, 'referencia', e.target.value)} />
                        <input type="text" className="input input-bordered input-xs col-span-6 md:col-span-4"
                          placeholder="Descripción" value={item.descripcion}
                          onChange={e => setPaleItem(pIdx, iIdx, 'descripcion', e.target.value)} />
                        <input type="number" className="input input-bordered input-xs col-span-3 md:col-span-2"
                          placeholder="Rollos" min="0" value={item.numRollos}
                          onChange={e => setPaleItem(pIdx, iIdx, 'numRollos', e.target.value)} />
                        <input type="number" className="input input-bordered input-xs col-span-3 md:col-span-2"
                          placeholder="Metros" min="0" step="0.1" value={item.metros}
                          onChange={e => setPaleItem(pIdx, iIdx, 'metros', e.target.value)} />
                        <div className="col-span-6 md:col-span-2 flex gap-1">
                          <input type="number" className="input input-bordered input-xs flex-1"
                            placeholder="kg" min="0" step="0.1" value={item.peso}
                            onChange={e => setPaleItem(pIdx, iIdx, 'peso', e.target.value)} />
                          {pale.items.length > 1 && (
                            <button className="btn btn-xs btn-ghost text-error" onClick={() => removePaleItem(pIdx, iIdx)}>
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button className="btn btn-xs btn-ghost mt-2" onClick={() => addPaleItem(pIdx)}>
                    <Plus className="w-3 h-3" /> Añadir referencia
                  </button>
                </div>
              ))}

              <button className="btn btn-sm btn-outline btn-primary w-fit" onClick={addPale}>
                <Plus className="w-4 h-4" /> Añadir palé
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Botón generar */}
      <div className="flex justify-end">
        <button
          className="btn btn-primary gap-2"
          onClick={handleGenerarPDF}
          disabled={loading || !destinatario.nombre}
        >
          {loading
            ? <span className="loading loading-spinner loading-sm" />
            : <Download className="w-4 h-4" />}
          {loading ? 'Generando PDF...' : 'Generar carta de porte PDF'}
        </button>
      </div>
      {!destinatario.nombre && (
        <p className="text-xs text-base-content/40 text-right mt-1">
          El nombre del destinatario es obligatorio para generar el PDF.
        </p>
      )}
    </div>
  );
}
