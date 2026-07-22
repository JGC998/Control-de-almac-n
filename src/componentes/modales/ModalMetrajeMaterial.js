"use client";
import { useState, useCallback, useEffect, useRef } from 'react';
import { X, Loader2, Scissors, BookmarkPlus, Check } from 'lucide-react';

const VACIO = { espesores: [], acabados: [], tarifa: null, tarifas: [] };

// Formatea un número en mm con separador de miles español: 10000 → "10.000"
function fmtMm(mm) {
  return Number(mm).toLocaleString('es-ES', { maximumFractionDigits: 0 });
}

export default function ModalMetrajeMaterial({ isOpen, onClose, onAñadir }) {
  const [material,   setMaterial]   = useState('');
  const [espesor,    setEspesor]    = useState('');
  const [acabado,    setAcabado]    = useState(null); // null = aún no elegido; '' = Estándar
  const [ancho,      setAncho]      = useState('');  // mm
  const [largo,      setLargo]      = useState('');  // mm
  const [opciones,   setOpciones]   = useState(VACIO);
  const [materiales, setMateriales] = useState([]);
  const [cargando,   setCargando]   = useState(false);
  const [error,      setError]      = useState(null);
  const [guardandoProducto, setGuardandoProducto] = useState(false);
  const [productoGuardado,  setProductoGuardado]  = useState(false);
  const materialesMapRef = useRef({}); // nombre → materialId

  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/tarifas-material-opciones')
      .then(r => r.json())
      .then(d => setMateriales(d.materiales ?? []));
    fetch('/api/materiales')
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) {
          materialesMapRef.current = Object.fromEntries(d.map(m => [m.nombre, m.id]));
        }
      });
  }, [isOpen]);

  const resetCampos = () => {
    setEspesor(''); setAcabado(null); setAncho(''); setLargo('');
    setOpciones(VACIO); setError(null); setProductoGuardado(false);
  };

  const handleMaterial = useCallback(async (mat) => {
    setMaterial(mat);
    resetCampos();
    if (!mat) return;
    setCargando(true);
    try {
      const r = await fetch(`/api/tarifas-material-opciones?material=${encodeURIComponent(mat)}`);
      const d = await r.json();
      setOpciones(prev => ({ ...prev, espesores: d.espesores ?? [] }));
    } finally { setCargando(false); }
  }, []);

  const handleEspesor = useCallback(async (esp) => {
    setEspesor(esp); setAcabado(null); setAncho(''); setLargo('');
    setOpciones(prev => ({ ...prev, acabados: [], tarifa: null, tarifas: [] }));
    if (!esp || !material) return;
    setCargando(true);
    try {
      const r = await fetch(`/api/tarifas-material-opciones?material=${encodeURIComponent(material)}&espesor=${esp}`);
      const d = await r.json();
      const tarifas  = d.tarifas  ?? [];
      const acabados = d.acabados ?? [];
      setOpciones(prev => ({ ...prev, tarifas, acabados, tarifa: null }));
      // Auto-seleccionar si solo hay un acabado único (aunque haya varias tarifas con distinto lonas)
      if (acabados.length <= 1) {
        const ac = acabados[0] ?? '';
        setAcabado(ac);
        const tf = tarifas.find(t => (t.acabado ?? '') === ac);
        if (tf) {
          setOpciones(prev => ({ ...prev, tarifa: tf }));
          if (tf.ancho) setAncho(String(tf.ancho));
        }
      }
    } finally { setCargando(false); }
  }, [material]);

  const handleAcabado = useCallback((ac) => {
    setAcabado(ac);
    const tf = (opciones.tarifas ?? []).find(t => (t.acabado ?? '') === ac);
    setOpciones(prev => ({ ...prev, tarifa: tf ?? null }));
    if (tf?.ancho) setAncho(String(tf.ancho));
  }, [opciones.tarifas]);

  const tarifa    = opciones.tarifa;
  const anchom    = parseFloat(ancho) / 1000 || 0;   // mm → m
  const largom    = parseFloat(largo) / 1000 || 0;   // mm → m
  const precioTotal = tarifa ? tarifa.precio * anchom * largom : 0;
  const pesoTotal   = tarifa ? tarifa.peso   * anchom * largom : 0;

  const hayAcabados = opciones.acabados.length > 1 || (opciones.acabados.length === 1 && opciones.acabados[0] !== '');
  const listo = tarifa && anchom > 0 && largom > 0;

  // Descripción para la línea del pedido — sin "Estándar", con dimensiones
  function buildDescripcion() {
    const partes = [material];
    if (acabado) partes.push(acabado);           // solo si no es vacío/estándar
    if (espesor) partes.push(`${espesor}mm`);
    partes.push(`— ${fmtMm(ancho)}mm × ${fmtMm(largo)}mm`);
    return partes.join(' ');
  }

  async function guardarComoProducto() {
    if (!listo) return;
    setGuardandoProducto(true);
    setError(null);
    try {
      const materialId = materialesMapRef.current[material] ?? null;
      const res = await fetch('/api/productos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre:         buildDescripcion(),
          tipo:           'BANDA',
          unidad:         'M2',
          activo:         true,
          materialId,
          espesor:        parseFloat(espesor),
          ancho:          parseFloat(ancho),
          largo:          parseFloat(largo),
          acabado:        acabado || null,
          precioUnitario: parseFloat(precioTotal.toFixed(2)),
          pesoUnitario:   parseFloat(pesoTotal.toFixed(3)),
          costoUnitario:  0,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Error al guardar en catálogo');
      }
      setProductoGuardado(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardandoProducto(false);
    }
  }

  function confirmar() {
    if (!listo) return;
    onAñadir({
      descripcion:    buildDescripcion(),
      unidades:       1,                              // 1 rollo/pieza de ese metraje
      precioUnitario: parseFloat(precioTotal.toFixed(2)),
      pesoUnitario:   parseFloat(pesoTotal.toFixed(3)),
      detallesTecnicos: JSON.stringify({
        tipo:     'metraje',
        material,
        acabado:  acabado || null,
        espesor:  parseFloat(espesor),
        ancho:    parseFloat(ancho),
        largo:    parseFloat(largo),
        metros:   largom,
      }),
    });
    setMaterial(''); resetCampos();
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="modal modal-open z-50">
      <div className="modal-box max-w-md">
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Scissors className="w-5 h-5 text-accent" /> Añadir metraje de material
          </h3>
          <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex flex-col gap-4">
          {/* Material */}
          <div className="form-control">
            <label className="label"><span className="label-text font-medium">Material *</span></label>
            <div className="join">
              <select className="select select-bordered join-item flex-1" value={material} onChange={e => handleMaterial(e.target.value)}>
                <option value="">— Selecciona material —</option>
                {materiales.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              {cargando && <span className="join-item btn btn-outline btn-disabled"><Loader2 className="w-4 h-4 animate-spin" /></span>}
            </div>
          </div>

          {/* Espesor */}
          {material && (
            <div className="form-control">
              <label className="label"><span className="label-text font-medium">Espesor (mm) *</span></label>
              <select className="select select-bordered" value={espesor} onChange={e => handleEspesor(e.target.value)}>
                <option value="">— Selecciona espesor —</option>
                {opciones.espesores.map(e => <option key={e} value={e}>{e} mm</option>)}
              </select>
            </div>
          )}

          {/* Acabado */}
          {espesor && hayAcabados && (
            <div className="form-control">
              <label className="label"><span className="label-text font-medium">Acabado</span></label>
              <select
                className="select select-bordered"
                value={acabado ?? '__none__'}
                onChange={e => handleAcabado(e.target.value)}
              >
                {acabado === null && <option value="__none__" disabled>— Selecciona acabado —</option>}
                {opciones.acabados.includes('') && <option value="">— Estándar —</option>}
                {opciones.acabados.filter(a => a !== '').map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          )}

          {/* Ancho y Largo en mm */}
          {espesor && (
            <div className="grid grid-cols-2 gap-3">
              <div className="form-control">
                <label className="label"><span className="label-text font-medium">Ancho (mm) *</span></label>
                <input
                  type="number" min="1" step="1"
                  className="input input-bordered"
                  placeholder="Ej: 1000"
                  value={ancho}
                  onChange={e => setAncho(e.target.value)}
                />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text font-medium">Largo (mm) *</span></label>
                <input
                  type="number" min="1" step="1"
                  className="input input-bordered"
                  placeholder="Ej: 10000"
                  value={largo}
                  onChange={e => setLargo(e.target.value)}
                />
                {largo && <span className="label text-xs text-base-content/40 pt-1">{largom.toLocaleString('es-ES', { maximumFractionDigits: 3 })} m</span>}
              </div>
            </div>
          )}

          {/* Sin tarifa — solo mostrar si el usuario ya eligió un acabado (o no hay que elegir) */}
          {espesor && !tarifa && !cargando && acabado !== null && (
            <div className="alert alert-warning text-sm py-2">
              Sin tarifa para {material}{acabado ? ' ' + acabado : ''} {espesor}mm — añádela en Configuración → Tarifas m².
            </div>
          )}

          {/* Resumen */}
          {listo && (
            <div className="bg-base-200 rounded-xl p-4 space-y-2 text-sm">
              <div className="font-medium text-base-content/60 text-xs uppercase tracking-wide mb-1">Resumen</div>
              <div className="flex justify-between">
                <span className="text-base-content/60">Tarifa base</span>
                <span>{tarifa.precio.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €/m²</span>
              </div>
              <div className="flex justify-between">
                <span className="text-base-content/60">Superficie ({fmtMm(ancho)}mm × {fmtMm(largo)}mm)</span>
                <span>{(anchom * largom).toLocaleString('es-ES', { minimumFractionDigits: 4 })} m²</span>
              </div>
              <div className="divider my-1" />
              <div className="flex justify-between font-bold text-base">
                <span>Total (1 rollo)</span>
                <span className="text-primary">{precioTotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
              </div>
              <div className="flex justify-between text-base-content/60">
                <span>Peso</span>
                <span>{pesoTotal.toLocaleString('es-ES', { minimumFractionDigits: 3 })} kg</span>
              </div>
              <div className="text-xs text-base-content/40 mt-1">
                {buildDescripcion()}
              </div>
            </div>
          )}

          {error && <div className="alert alert-error text-sm py-2">{error}</div>}
        </div>

        <div className="modal-action mt-5 flex-wrap gap-2">
          <button type="button" onClick={onClose} className="btn btn-ghost">Cancelar</button>
          {listo && (
            <button
              type="button"
              onClick={guardarComoProducto}
              disabled={guardandoProducto || productoGuardado}
              className="btn btn-outline btn-success gap-1"
              title="Guardar este metraje como producto del catálogo"
            >
              {guardandoProducto
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : productoGuardado
                  ? <Check className="w-4 h-4" />
                  : <BookmarkPlus className="w-4 h-4" />}
              {productoGuardado ? 'Guardado en catálogo' : 'Guardar en catálogo'}
            </button>
          )}
          <button type="button" onClick={confirmar} disabled={!listo} className="btn btn-accent gap-1">
            <Scissors className="w-4 h-4" /> Añadir al pedido
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  );
}
