"use client";
import { useState, useEffect, useCallback } from 'react';
import { Package, Loader2 } from 'lucide-react';

const VACIO = { materiales: [], espesores: [], colores: [], tarifa: null };

export default function FormularioProductoInteligente({ productoAEditar, onGuardado, onCancelar }) {
  const [form, setForm] = useState({
    nombre: '',
    material: '',
    espesor: '',
    color: '',
    ancho: '',
    largo: '',
    precioUnitario: '',
    pesoUnitario: '',
    referenciaFabricante: '',
  });

  const [opciones, setOpciones] = useState(VACIO);
  const [tarifaEncontrada, setTarifaEncontrada] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  // Cargar materiales al montar
  useEffect(() => {
    fetch('/api/tarifas-material-opciones')
      .then(r => r.json())
      .then(d => setOpciones(prev => ({ ...prev, materiales: d.materiales ?? [] })));
  }, []);

  // Precargar si es edición
  useEffect(() => {
    if (productoAEditar) {
      setForm({
        nombre: productoAEditar.nombre ?? '',
        material: productoAEditar.material?.nombre ?? '',
        espesor: productoAEditar.espesor ?? '',
        color: productoAEditar.color ?? '',
        ancho: productoAEditar.ancho ?? '',
        largo: productoAEditar.largo ?? '',
        precioUnitario: productoAEditar.precioUnitario ?? '',
        pesoUnitario: productoAEditar.pesoUnitario ?? '',
        referenciaFabricante: productoAEditar.referenciaFabricante ?? '',
      });
    }
  }, [productoAEditar]);

  // Cuando cambia el material → cargar espesores
  const handleMaterialChange = useCallback(async (material) => {
    setForm(f => ({ ...f, material, espesor: '', color: '', precioUnitario: '', pesoUnitario: '' }));
    setOpciones(prev => ({ ...prev, espesores: [], colores: [], tarifa: null }));
    setTarifaEncontrada(false);
    if (!material) return;
    setCargando(true);
    const r = await fetch(`/api/tarifas-material-opciones?material=${encodeURIComponent(material)}`);
    const d = await r.json();
    setOpciones(prev => ({ ...prev, espesores: d.espesores ?? [] }));
    setCargando(false);
  }, []);

  // Cuando cambia el espesor → cargar colores + tarifa
  const handleEspesorChange = useCallback(async (espesor) => {
    setForm(f => ({ ...f, espesor, color: '', precioUnitario: '', pesoUnitario: '' }));
    setOpciones(prev => ({ ...prev, colores: [], tarifa: null }));
    setTarifaEncontrada(false);
    if (!espesor || !form.material) return;
    setCargando(true);
    const r = await fetch(`/api/tarifas-material-opciones?material=${encodeURIComponent(form.material)}&espesor=${espesor}`);
    const d = await r.json();
    setOpciones(prev => ({ ...prev, colores: d.colores ?? [], tarifa: d.tarifas?.[0] ?? null }));
    // Si solo hay una tarifa sin color → autocompletar precio
    if (d.tarifas?.length === 1 && !d.colores?.length) {
      aplicarTarifa(d.tarifas[0], form.ancho, form.largo);
    }
    setCargando(false);
  }, [form.material, form.ancho, form.largo]);

  // Cuando cambia el color → buscar tarifa exacta
  const handleColorChange = useCallback((color) => {
    setForm(f => ({ ...f, color }));
    const tarifa = opciones.tarifa?.color === color
      ? opciones.tarifa
      : null;
    if (tarifa) aplicarTarifa(tarifa, form.ancho, form.largo);
  }, [opciones.tarifa, form.ancho, form.largo]);

  function aplicarTarifa(tarifa, ancho, largo) {
    if (!tarifa) return;
    const a = parseFloat(ancho) / 1000 || 0; // mm → m
    const l = parseFloat(largo) || 0;
    const area = a * l;
    if (area > 0) {
      setForm(f => ({
        ...f,
        precioUnitario: (tarifa.precio * area).toFixed(2),
        pesoUnitario: (tarifa.peso * area).toFixed(3),
      }));
    }
    setTarifaEncontrada(true);
    setOpciones(prev => ({ ...prev, tarifa }));
  }

  // Recalcular cuando cambia ancho o largo
  function handleDimensionChange(campo, valor) {
    setForm(f => {
      const next = { ...f, [campo]: valor };
      if (opciones.tarifa) {
        const a = parseFloat(campo === 'ancho' ? valor : f.ancho) / 1000 || 0;
        const l = parseFloat(campo === 'largo' ? valor : f.largo) || 0;
        const area = a * l;
        if (area > 0) {
          next.precioUnitario = (opciones.tarifa.precio * area).toFixed(2);
          next.pesoUnitario   = (opciones.tarifa.peso   * area).toFixed(3);
        }
      }
      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setGuardando(true);

    const payload = {
      nombre: form.nombre.trim(),
      espesor: form.espesor ? parseFloat(form.espesor) : null,
      ancho:   form.ancho   ? parseFloat(form.ancho)   : null,
      largo:   form.largo   ? parseFloat(form.largo)   : null,
      color:   form.color   || null,
      precioUnitario: parseFloat(form.precioUnitario) || 0,
      pesoUnitario:   parseFloat(form.pesoUnitario)   || 0,
      referenciaFabricante: form.referenciaFabricante || null,
    };

    const url    = productoAEditar ? `/api/productos/${productoAEditar.id}` : '/api/productos';
    const method = productoAEditar ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Error al guardar');
      }
      const saved = await res.json();

      // Si el material no tenía tarifa → crear notificación
      if (!tarifaEncontrada && form.material) {
        await fetch('/api/notificaciones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            titulo: `Tarifa pendiente: ${form.material}${form.espesor ? ` ${form.espesor}mm` : ''}`,
            mensaje: `El producto "${payload.nombre}" fue creado sin precio automático porque no hay tarifa para "${form.material}". Añade el precio base en Tarifas m² para que el precio se calcule solo la próxima vez.`,
            tipo: 'PENDIENTE',
            url: '/configuracion/margenes',
          }),
        });
      }

      if (onGuardado) onGuardado(saved);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  const tieneTarifa = tarifaEncontrada && opciones.tarifa;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Nombre */}
      <div className="form-control">
        <label className="label"><span className="label-text font-medium">Nombre *</span></label>
        <input
          type="text"
          value={form.nombre}
          onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
          placeholder="Ej: Banda Goma 8mm 1000mm"
          className="input input-bordered"
          required
        />
      </div>

      {/* Material */}
      <div className="form-control">
        <label className="label"><span className="label-text font-medium">Material *</span></label>
        <div className="join">
          <select
            className="select select-bordered join-item flex-1"
            value={form.material}
            onChange={e => handleMaterialChange(e.target.value)}
            required
          >
            <option value="">— Selecciona material —</option>
            {opciones.materiales.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          {cargando && <span className="join-item btn btn-outline btn-disabled"><Loader2 className="w-4 h-4 animate-spin" /></span>}
        </div>
      </div>

      {/* Espesor */}
      {form.material && (
        <div className="form-control">
          <label className="label"><span className="label-text font-medium">Espesor (mm) *</span></label>
          <select
            className="select select-bordered"
            value={form.espesor}
            onChange={e => handleEspesorChange(e.target.value)}
            required
          >
            <option value="">— Selecciona espesor —</option>
            {opciones.espesores.map(e => <option key={e} value={e}>{e} mm</option>)}
          </select>
        </div>
      )}

      {/* Color (solo si hay opciones) */}
      {opciones.colores.length > 0 && (
        <div className="form-control">
          <label className="label"><span className="label-text font-medium">Color</span></label>
          <select
            className="select select-bordered"
            value={form.color}
            onChange={e => handleColorChange(e.target.value)}
          >
            <option value="">— Sin color específico —</option>
            {opciones.colores.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      )}

      {/* Ancho y Largo */}
      <div className="grid grid-cols-2 gap-3">
        <div className="form-control">
          <label className="label"><span className="label-text font-medium">Ancho (mm)</span></label>
          <input
            type="number" min="0" step="1"
            value={form.ancho}
            onChange={e => handleDimensionChange('ancho', e.target.value)}
            placeholder="Ej: 1000"
            className="input input-bordered"
          />
        </div>
        <div className="form-control">
          <label className="label"><span className="label-text font-medium">Largo (m)</span></label>
          <input
            type="number" min="0" step="0.01"
            value={form.largo}
            onChange={e => handleDimensionChange('largo', e.target.value)}
            placeholder="Ej: 2.5"
            className="input input-bordered"
          />
        </div>
      </div>

      {/* Precio y Peso — autocalculados o manuales */}
      <div className="grid grid-cols-2 gap-3">
        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">Precio unitario (€)</span>
            {tieneTarifa && <span className="label-text-alt text-success text-xs">Auto ✓</span>}
          </label>
          <input
            type="number" min="0" step="0.01"
            value={form.precioUnitario}
            onChange={e => setForm(f => ({ ...f, precioUnitario: e.target.value }))}
            placeholder="0.00"
            className={`input input-bordered ${tieneTarifa ? 'input-success' : ''}`}
          />
        </div>
        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">Peso (kg)</span>
            {tieneTarifa && <span className="label-text-alt text-success text-xs">Auto ✓</span>}
          </label>
          <input
            type="number" min="0" step="0.001"
            value={form.pesoUnitario}
            onChange={e => setForm(f => ({ ...f, pesoUnitario: e.target.value }))}
            placeholder="0.000"
            className={`input input-bordered ${tieneTarifa ? 'input-success' : ''}`}
          />
        </div>
      </div>

      {/* Referencia fabricante */}
      <div className="form-control">
        <label className="label"><span className="label-text">Ref. fabricante</span></label>
        <input
          type="text"
          value={form.referenciaFabricante}
          onChange={e => setForm(f => ({ ...f, referenciaFabricante: e.target.value }))}
          placeholder="Opcional"
          className="input input-bordered"
        />
      </div>

      {/* Aviso si no hay tarifa */}
      {form.material && form.espesor && !tieneTarifa && !cargando && (
        <div className="alert alert-warning text-sm">
          No hay tarifa para <strong>{form.material} {form.espesor}mm</strong>. El precio se calculará manualmente. Se creará una notificación para que añadas la tarifa base después.
        </div>
      )}

      {error && <div className="alert alert-error text-sm">{error}</div>}

      <div className="modal-action mt-2">
        {onCancelar && <button type="button" onClick={onCancelar} className="btn">Cancelar</button>}
        <button type="submit" className="btn btn-primary" disabled={guardando}>
          {guardando ? <span className="loading loading-spinner loading-xs" /> : <Package className="w-4 h-4" />}
          {productoAEditar ? 'Guardar cambios' : 'Crear producto'}
        </button>
      </div>
    </form>
  );
}
