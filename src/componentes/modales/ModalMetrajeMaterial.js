"use client";
import { useState, useCallback, useEffect } from 'react';
import { X, Loader2, Scissors } from 'lucide-react';

const VACIO = { espesores: [], acabados: [], tarifa: null, tarifas: [] };

export default function ModalMetrajeMaterial({ isOpen, onClose, onAñadir }) {
  const [material,  setMaterial]  = useState('');
  const [espesor,   setEspesor]   = useState('');
  const [acabado,   setAcabado]   = useState('');
  const [ancho,     setAncho]     = useState('');  // mm
  const [metros,    setMetros]    = useState('');  // metros lineales
  const [opciones,  setOpciones]  = useState(VACIO);
  const [materiales, setMateriales] = useState([]);
  const [cargando,  setCargando]  = useState(false);
  const [error,     setError]     = useState(null);

  // Cargar materiales al abrir
  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/tarifas-material-opciones')
      .then(r => r.json())
      .then(d => setMateriales(d.materiales ?? []));
  }, [isOpen]);

  const resetCampos = () => {
    setEspesor(''); setAcabado(''); setAncho(''); setMetros('');
    setOpciones(VACIO); setError(null);
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
    setEspesor(esp); setAcabado(''); setAncho('');
    setOpciones(prev => ({ ...prev, acabados: [], tarifa: null, tarifas: [] }));
    if (!esp || !material) return;
    setCargando(true);
    try {
      const r = await fetch(`/api/tarifas-material-opciones?material=${encodeURIComponent(material)}&espesor=${esp}`);
      const d = await r.json();
      const tarifas  = d.tarifas  ?? [];
      const acabados = d.acabados ?? [];
      setOpciones(prev => ({ ...prev, tarifas, acabados, tarifa: null }));
      // Auto-seleccionar si solo hay una tarifa sin acabado
      if (tarifas.length === 1 && acabados.length <= 1) {
        setAcabado(tarifas[0].acabado ?? '');
        setOpciones(prev => ({ ...prev, tarifa: tarifas[0] }));
        if (tarifas[0].ancho) setAncho(String(tarifas[0].ancho));
      }
    } finally { setCargando(false); }
  }, [material]);

  const handleAcabado = useCallback((ac) => {
    setAcabado(ac);
    const tf = (opciones.tarifas ?? []).find(t => (t.acabado ?? '') === ac);
    setOpciones(prev => ({ ...prev, tarifa: tf ?? null }));
    if (tf?.ancho) setAncho(String(tf.ancho));
  }, [opciones.tarifas]);

  const tarifa = opciones.tarifa;
  const anchom = parseFloat(ancho) / 1000 || 0;   // mm → m
  const metrosN = parseFloat(metros) || 0;
  const precioPorMetro = tarifa ? tarifa.precio * anchom : 0;
  const pesoPorMetro   = tarifa ? tarifa.peso   * anchom : 0;
  const totalPrecio    = precioPorMetro * metrosN;
  const totalPeso      = pesoPorMetro   * metrosN;

  const hayAcabados = opciones.acabados.length > 1 || (opciones.acabados.length === 1 && opciones.acabados[0] !== '');
  const listo = tarifa && anchom > 0 && metrosN > 0;

  function descripcion() {
    const partes = [material];
    if (acabado) partes.push(acabado);
    if (espesor) partes.push(`${espesor}mm`);
    partes.push(`— ${ancho}mm × ${metros}m`);
    return partes.join(' ');
  }

  function confirmar() {
    if (!listo) return;
    onAñadir({
      descripcion:   descripcion(),
      unidades:      metrosN,
      precioUnitario: parseFloat(precioPorMetro.toFixed(4)),
      pesoUnitario:   parseFloat(pesoPorMetro.toFixed(4)),
    });
    // Reset
    setMaterial(''); resetCampos();
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="modal modal-open z-50">
      <div className="modal-box max-w-md">
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Scissors className="w-5 h-5 text-secondary" /> Añadir metraje de material
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
              <select className="select select-bordered" value={acabado} onChange={e => handleAcabado(e.target.value)}>
                <option value="">— Estándar —</option>
                {opciones.acabados.filter(a => a !== '').map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          )}

          {/* Ancho y Metros */}
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
                <label className="label"><span className="label-text font-medium">Metros lineales *</span></label>
                <input
                  type="number" min="0.01" step="0.01"
                  className="input input-bordered"
                  placeholder="Ej: 5"
                  value={metros}
                  onChange={e => setMetros(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Tarifa no encontrada */}
          {espesor && !tarifa && !cargando && (
            <div className="alert alert-warning text-sm py-2">
              No hay tarifa configurada para {material}{acabado ? ' ' + acabado : ''} {espesor}mm. Ve a Configuración → Tarifas m² para añadirla.
            </div>
          )}

          {/* Resumen de precio */}
          {listo && (
            <div className="bg-base-200 rounded-xl p-4 space-y-2 text-sm">
              <div className="font-medium text-base-content/60 text-xs uppercase tracking-wide mb-1">Resumen</div>
              <div className="flex justify-between">
                <span className="text-base-content/60">Tarifa base</span>
                <span>{tarifa.precio.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €/m²</span>
              </div>
              <div className="flex justify-between">
                <span className="text-base-content/60">Precio × metro lineal ({ancho}mm)</span>
                <span>{precioPorMetro.toLocaleString('es-ES', { minimumFractionDigits: 4 })} €/m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-base-content/60">Peso × metro lineal</span>
                <span>{pesoPorMetro.toLocaleString('es-ES', { minimumFractionDigits: 4 })} kg/m</span>
              </div>
              <div className="divider my-1" />
              <div className="flex justify-between font-bold text-base">
                <span>Total ({metros} m)</span>
                <span className="text-primary">{totalPrecio.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
              </div>
              <div className="flex justify-between text-base-content/60">
                <span>Peso total</span>
                <span>{totalPeso.toLocaleString('es-ES', { minimumFractionDigits: 3 })} kg</span>
              </div>
              <div className="text-xs text-base-content/40 mt-1 truncate" title={descripcion()}>
                {descripcion()}
              </div>
            </div>
          )}

          {error && <div className="alert alert-error text-sm py-2">{error}</div>}
        </div>

        <div className="modal-action mt-5">
          <button type="button" onClick={onClose} className="btn btn-ghost">Cancelar</button>
          <button
            type="button"
            onClick={confirmar}
            disabled={!listo}
            className="btn btn-secondary gap-1"
          >
            <Scissors className="w-4 h-4" /> Añadir al pedido
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  );
}
