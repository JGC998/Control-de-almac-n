"use client";
import { useState, useEffect, useCallback, useRef } from 'react';
import useSWR from 'swr';
import { Package, Loader2 } from 'lucide-react';
import SelectorFamiliaSubfamilia from './SelectorFamiliaSubfamilia';
import SelectorFabricante from './SelectorFabricante';

const VACIO = { materiales: [], espesores: [], acabados: [], colores: [], lonasOpciones: [], tarifa: null, tarifas: [], sinTarifas: null };

export default function FormularioProductoInteligente({ productoAEditar, onGuardado, onCancelar, initialNombre = '' }) {
  const materialesDBRef = useRef([]);  // [{id, nombre}] para lookup de IDs

  const [form, setForm] = useState({
    nombre: initialNombre,
    tipo: 'BANDA',
    unidad: 'M2',
    activo: true,
    descripcion: '',
    material: '',
    materialId: null,
    espesor: '',
    acabado: '',
    color: '',
    lonas: '',
    ancho: '',
    largo: '',
    precioUnitario: '',
    costoUnitario: '',
    pesoUnitario: '',
    referenciaFabricante: '',
    subfamiliaId: null,
    fabricanteId: null,
  });

  const { data: familias = [] } = useSWR('/api/familias');
  const { data: fabricantes = [] } = useSWR('/api/fabricantes');
  const [familiaIdSugerida, setFamiliaIdSugerida] = useState(null);

  const [opciones, setOpciones] = useState(VACIO);
  const [tarifaEncontrada, setTarifaEncontrada] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  // Cargar materiales al montar (nombres para dropdown + registros con ID para guardar)
  useEffect(() => {
    let cancelled = false;
    fetch('/api/tarifas-material-opciones')
      .then(r => r.json())
      .then(d => { if (!cancelled) setOpciones(prev => ({ ...prev, materiales: d.materiales ?? [] })); })
      .catch(() => {});
    fetch('/api/materiales')
      .then(r => r.json())
      .then(d => { if (!cancelled && Array.isArray(d)) materialesDBRef.current = d; })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Precargar si es edición
  useEffect(() => {
    if (productoAEditar) {
      setForm({
        nombre:               productoAEditar.nombre ?? '',
        tipo:                 productoAEditar.tipo ?? 'BANDA',
        unidad:               productoAEditar.unidad ?? 'M2',
        activo:               productoAEditar.activo ?? true,
        descripcion:          productoAEditar.descripcion ?? '',
        material:             productoAEditar.material?.nombre ?? '',
        materialId:           productoAEditar.materialId ?? null,
        espesor:              productoAEditar.espesor ?? '',
        acabado:              productoAEditar.acabado ?? '',
        color:                productoAEditar.color ?? '',
        lonas:                productoAEditar.lonas != null ? String(productoAEditar.lonas) : '',
        ancho:                productoAEditar.ancho ?? '',
        largo:                productoAEditar.largo ?? '',
        precioUnitario:       productoAEditar.precioUnitario ?? '',
        costoUnitario:        productoAEditar.costoUnitario ?? '',
        pesoUnitario:         productoAEditar.pesoUnitario ?? '',
        referenciaFabricante: productoAEditar.referenciaFabricante ?? '',
        subfamiliaId:         productoAEditar.subfamiliaId ?? null,
        fabricanteId:         productoAEditar.fabricanteId ?? null,
      });
    }
  }, [productoAEditar?.id]);

  // En modo edición: disparar la cascada una vez que los materiales estén cargados
  useEffect(() => {
    if (!productoAEditar || !opciones.materiales.length) return;
    const mat = productoAEditar.material?.nombre ?? '';
    const esp = productoAEditar.espesor;
    if (!mat || esp == null) return;

    (async () => {
      try {
        // Espesores del material
        const r1 = await fetch(`/api/tarifas-material-opciones?material=${encodeURIComponent(mat)}`);
        const d1 = await r1.json();
        const espesores = d1.espesores ?? [];
        setOpciones(prev => ({ ...prev, espesores, sinTarifas: espesores.length === 0 }));

        // Tarifas + acabados + colores del material+espesor
        const r2 = await fetch(`/api/tarifas-material-opciones?material=${encodeURIComponent(mat)}&espesor=${esp}`);
        const d2 = await r2.json();
        const tarifas = d2.tarifas ?? [];
        const acabados = d2.acabados ?? [];
        const colores  = d2.colores  ?? [];
        setOpciones(prev => ({ ...prev, tarifas, acabados, colores }));

        // Buscar la tarifa que coincide con acabado + color + lonas del producto
        const acabadoProd = productoAEditar.acabado ?? '';
        const colorProd   = productoAEditar.color   ?? '';
        const lonasProd   = productoAEditar.lonas   ?? null;

        // Extraer opciones de lonas para mostrar el selector si hay múltiples
        const lonasOpciones = [...new Set(tarifas.map(t => t.lonas))].sort((a, b) => (a ?? -1) - (b ?? -1));
        setOpciones(prev => ({ ...prev, lonasOpciones }));

        let tarifa = tarifas.find(t =>
          (t.acabado ?? '') === acabadoProd && (t.color ?? '') === colorProd && (t.lonas ?? null) === lonasProd,
        );
        // Fallback: ignorar lonas si no hay coincidencia exacta
        if (!tarifa) {
          tarifa = tarifas.find(t => (t.acabado ?? '') === acabadoProd && (t.color ?? '') === colorProd);
        }
        // Fallback: el color del producto fue guardado en el campo 'acabado' de la tarifa
        if (!tarifa && colorProd && !acabadoProd) {
          tarifa = tarifas.find(t => (t.acabado ?? '') === colorProd && !(t.color));
        }
        // Fallback: el acabado del producto fue guardado en el campo 'color' de la tarifa
        if (!tarifa && acabadoProd && !colorProd) {
          tarifa = tarifas.find(t => (t.color ?? '') === acabadoProd && !(t.acabado));
        }
        // Último recurso: si solo hay una tarifa para este material+espesor, usarla
        if (!tarifa && tarifas.length === 1) {
          tarifa = tarifas[0];
        }

        if (tarifa) {
          setOpciones(prev => ({ ...prev, tarifa }));
          setTarifaEncontrada(true);
          // Sincronizar form si el acabado/color del producto no coincidía con la tarifa
          setForm(f => ({
            ...f,
            acabado: f.acabado || tarifa.acabado || f.acabado,
            color:   f.color   || tarifa.color   || f.color,
          }));
        }
      } catch { /* silencioso — el usuario puede rellenar precio manualmente */ }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productoAEditar?.id, opciones.materiales.length]);

  // Material → espesores
  const handleMaterialChange = useCallback(async (material) => {
    const registro = materialesDBRef.current.find(m => m.nombre === material);
    setForm(f => ({ ...f, material, materialId: registro?.id ?? null, espesor: '', acabado: '', color: '', lonas: '', precioUnitario: '', pesoUnitario: '' }));
    setOpciones(prev => ({ ...prev, espesores: [], acabados: [], colores: [], lonasOpciones: [], tarifa: null, tarifas: [], sinTarifas: null }));
    setTarifaEncontrada(false);

    // Autodetect familia por nombre de material
    if (material && familias.length) {
      const norm = material.toLowerCase().trim();
      const fam = familias.find(f => {
        const fn = f.nombre.toLowerCase().trim();
        return fn === norm || norm.startsWith(fn) || fn.startsWith(norm);
      });
      setFamiliaIdSugerida(fam?.id ?? null);
    } else {
      setFamiliaIdSugerida(null);
    }

    if (!material) return;
    setCargando(true);
    try {
      const r = await fetch(`/api/tarifas-material-opciones?material=${encodeURIComponent(material)}`);
      const d = await r.json();
      const espesores = d.espesores ?? [];
      setOpciones(prev => ({ ...prev, espesores, sinTarifas: espesores.length === 0 }));
    } catch {
      setError('No se pudieron cargar las opciones de espesor.');
    } finally {
      setCargando(false);
    }
  }, [familias]);

  // Espesor → acabados (+ colores si no hay acabados + lonas si es el factor diferenciador)
  const handleEspesorChange = useCallback(async (espesor) => {
    setForm(f => ({ ...f, espesor, acabado: '', color: '', lonas: '', precioUnitario: '', pesoUnitario: '' }));
    setOpciones(prev => ({ ...prev, acabados: [], colores: [], lonasOpciones: [], tarifa: null, tarifas: [] }));
    setTarifaEncontrada(false);
    if (!espesor || !form.material) return;
    setCargando(true);
    try {
      const r = await fetch(`/api/tarifas-material-opciones?material=${encodeURIComponent(form.material)}&espesor=${espesor}`);
      const d = await r.json();
      const tarifas  = d.tarifas ?? [];
      const acabados = d.acabados ?? [];
      const colores  = d.colores  ?? [];

      // Extraer opciones de lonas únicas (null = sin lona)
      const lonasOpciones = [...new Set(tarifas.map(t => t.lonas))].sort((a, b) => (a ?? -1) - (b ?? -1));
      const hayLonasVariantes = lonasOpciones.length > 1;

      setOpciones(prev => ({ ...prev, tarifas, acabados, colores, lonasOpciones, tarifa: null }));

      // Auto-aplicar solo cuando no hay ninguna dimensión variable (acabado, color, lonas)
      const sinVariantes = acabados.every(a => a === '') && colores.length === 0 && !hayLonasVariantes;
      if (tarifas.length === 1 && sinVariantes) {
        aplicarTarifa(tarifas[0]);
      }
      // Si hay acabados → esperar selección del usuario
      // Si hay colores sin acabados → mostrar selector de color (PVC)
      // Si hay lonas → mostrar selector de lonas (CARAMELO)
    } catch {
      setError('No se pudieron cargar las tarifas para ese espesor.');
    } finally {
      setCargando(false);
    }
  }, [form.material]);

  // Acabado → filtra tarifas, obtiene colores, auto-aplica si solo hay una
  const handleAcabadoChange = useCallback((acabado) => {
    setForm(f => ({ ...f, acabado, color: '', precioUnitario: '', pesoUnitario: '' }));
    setTarifaEncontrada(false);

    const tarifasFiltradas = (opciones.tarifas ?? []).filter(t => (t.acabado ?? '') === acabado);
    const coloresFiltrados = [...new Set(tarifasFiltradas.map(t => t.color).filter(Boolean))];

    setOpciones(prev => ({ ...prev, colores: coloresFiltrados, tarifa: null }));

    if (tarifasFiltradas.length === 1) {
      aplicarTarifa(tarifasFiltradas[0]);
    }
  }, [opciones.tarifas]);

  // Color → busca tarifa exacta
  const handleColorChange = useCallback((color) => {
    setForm(f => ({ ...f, color }));
    const tarifa = (opciones.tarifas ?? []).find(
      t => (t.acabado ?? '') === (form.acabado ?? '') && (t.color ?? '') === color
    ) ?? opciones.tarifa ?? null;
    if (tarifa) aplicarTarifa(tarifa);
  }, [opciones.tarifas, opciones.tarifa, form.acabado]);

  // Lonas → busca tarifa exacta (para materiales como CARAMELO con variantes de lona)
  // Sentinel: '' = sin seleccionar, 'null' = sin lona (lonas=null en BD), '1'/'2'/... = número
  const handleLonasChange = useCallback((lonasStr) => {
    setForm(f => ({ ...f, lonas: lonasStr, precioUnitario: '', pesoUnitario: '' }));
    setTarifaEncontrada(false);
    if (lonasStr === '') return; // sin seleccionar todavía
    const lonasVal = lonasStr === 'null' ? null : parseInt(lonasStr, 10);
    const tarifa = (opciones.tarifas ?? []).find(t =>
      (t.lonas ?? null) === lonasVal &&
      (t.acabado ?? '') === (form.acabado ?? '') &&
      (t.color ?? '') === (form.color ?? '')
    ) ?? null;
    if (tarifa) aplicarTarifa(tarifa);
  }, [opciones.tarifas, form.acabado, form.color]);

  function aplicarTarifa(tarifa) {
    if (!tarifa) return;
    setTarifaEncontrada(true);
    setOpciones(prev => ({ ...prev, tarifa }));
    // Sentinel: 'null' para lonas=null (sin lona), '' para sin seleccionar
    const lonasForm = tarifa.lonas != null ? String(tarifa.lonas) : 'null';
    setForm(f => {
      const a = parseFloat(f.ancho) / 1000 || 0;
      const l = parseFloat(f.largo) / 1000 || 0;
      if (a > 0 && l > 0) {
        return {
          ...f,
          lonas: lonasForm,
          precioUnitario: (tarifa.precio * a * l).toFixed(2),
          pesoUnitario:   (tarifa.peso   * a * l).toFixed(3),
        };
      }
      return { ...f, lonas: lonasForm };
    });
  }

  function handleDimensionChange(campo, valor) {
    setForm(f => {
      const next = { ...f, [campo]: valor };
      if (opciones.tarifa && (campo === 'ancho' || campo === 'largo')) {
        const a = parseFloat(campo === 'ancho' ? valor : f.ancho) / 1000 || 0;
        const l = parseFloat(campo === 'largo' ? valor : f.largo) / 1000 || 0;
        if (a > 0 && l > 0) {
          next.precioUnitario = (opciones.tarifa.precio * a * l).toFixed(2);
          next.pesoUnitario   = (opciones.tarifa.peso   * a * l).toFixed(3);
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
      nombre:               form.nombre.trim(),
      tipo:                 form.tipo,
      unidad:               form.unidad,
      activo:               form.activo,
      descripcion:          form.descripcion || null,
      materialId:           form.materialId ?? null,
      espesor:              form.espesor              ? parseFloat(form.espesor) : null,
      ancho:                form.ancho                ? parseFloat(form.ancho)   : null,
      largo:                form.largo                ? parseFloat(form.largo)   : null,
      color:                form.color                || null,
      acabado:              form.acabado              || null,
      lonas:                opciones.tarifa?.lonas    ??
                            (form.lonas === 'null' ? null : form.lonas !== '' ? parseInt(form.lonas, 10) : null) ??
                            productoAEditar?.lonas   ?? null,
      precioUnitario:       parseFloat(form.precioUnitario) || 0,
      costoUnitario:        parseFloat(form.costoUnitario)  || 0,
      pesoUnitario:         parseFloat(form.pesoUnitario)   || 0,
      referenciaFabricante: form.referenciaFabricante || null,
      subfamiliaId:         form.subfamiliaId ?? null,
      fabricanteId:         form.fabricanteId ?? null,
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

      if (!tarifaEncontrada && form.material) {
        fetch('/api/notificaciones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            titulo: `Tarifa pendiente: ${form.material}${form.acabado ? ' ' + form.acabado : ''}${form.espesor ? ` ${form.espesor}mm` : ''}`,
            mensaje: `El producto "${payload.nombre}" fue creado sin precio automático porque no hay tarifa configurada. Añade el precio base en Tarifas m².`,
            tipo: 'PENDIENTE',
            url: '/configuracion/margenes',
          }),
        }).catch(() => {});
      }

      if (onGuardado) onGuardado(saved);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  const tieneTarifa  = tarifaEncontrada && opciones.tarifa;
  // Mostrar acabado si hay múltiples opciones distintas (incluyendo la opción vacía = estándar)
  const hayAcabados  = opciones.acabados.length > 1 || (opciones.acabados.length === 1 && opciones.acabados[0] !== '');
  // BANDA: producto clásico con material y dimensiones
  const esAccesorio  = form.tipo !== 'BANDA';
  const mostrarMaterial   = !esAccesorio;
  const mostrarDimensiones = !esAccesorio;

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

      {/* Descripción (para accesorios / cordones) */}
      {esAccesorio && (
        <div className="form-control">
          <label className="label"><span className="label-text">Descripción</span></label>
          <textarea
            className="textarea textarea-bordered"
            rows={2}
            value={form.descripcion}
            onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
            placeholder="Descripción opcional del producto"
          />
        </div>
      )}

      {/* Activo */}
      <div className="form-control">
        <label className="label cursor-pointer justify-start gap-3">
          <input
            type="checkbox"
            className="toggle toggle-success toggle-sm"
            checked={form.activo}
            onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))}
          />
          <span className="label-text">Producto activo</span>
        </label>
      </div>

      {/* Material (oculto para ACCESORIO) */}
      {mostrarMaterial && <div className="form-control">
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
      </div>}

      {/* Espesor */}
      {mostrarMaterial && form.material && (
        <div className="form-control">
          <label className="label"><span className="label-text font-medium">Espesor (mm) *</span></label>
          {opciones.sinTarifas === true ? (
            <input
              type="number"
              min="0" step="0.5"
              value={form.espesor}
              onChange={e => setForm(f => ({ ...f, espesor: e.target.value }))}
              placeholder="Ej: 10"
              className="input input-bordered"
              required
            />
          ) : (
            <select
              className="select select-bordered"
              value={form.espesor}
              onChange={e => handleEspesorChange(e.target.value)}
              required
            >
              <option value="">— Selecciona espesor —</option>
              {opciones.espesores.map(e => <option key={e} value={e}>{e} mm</option>)}
            </select>
          )}
        </div>
      )}

      {/* Acabado — dropdown si la tarifa tiene opciones */}
      {mostrarMaterial && form.espesor && hayAcabados && (
        <div className="form-control">
          <label className="label"><span className="label-text font-medium">Acabado</span></label>
          <select
            className="select select-bordered"
            value={form.acabado}
            onChange={e => handleAcabadoChange(e.target.value)}
          >
            {opciones.acabados.includes('') && (
              <option value="">— Sin acabado —</option>
            )}
            {opciones.acabados.filter(a => a !== '').map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      )}

      {/* Acabado — texto libre cuando el material no tiene tarifas configuradas */}
      {mostrarMaterial && form.espesor && opciones.sinTarifas === true && (
        <div className="form-control">
          <label className="label"><span className="label-text font-medium">Acabado</span></label>
          <input
            type="text"
            value={form.acabado}
            onChange={e => setForm(f => ({ ...f, acabado: e.target.value }))}
            placeholder="Ej: NEGRA, VERDE, Estándar"
            className="input input-bordered"
          />
        </div>
      )}

      {/* Lonas — selector cuando hay múltiples variantes (ej: CARAMELO sin lona vs 1 lona) */}
      {mostrarMaterial && form.espesor && (opciones.lonasOpciones?.length ?? 0) > 1 && (
        <div className="form-control">
          <label className="label"><span className="label-text font-medium">Lonas</span></label>
          <select
            className="select select-bordered"
            value={form.lonas}
            onChange={e => handleLonasChange(e.target.value)}
          >
            <option value="">— Selecciona lonas —</option>
            {opciones.lonasOpciones.map(l => (
              <option key={l ?? 'none'} value={l === null ? 'null' : String(l)}>
                {l === null ? 'Sin lona' : `${l} lona${l !== 1 ? 's' : ''}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Color (solo si hay opciones, generalmente PVC) */}
      {mostrarMaterial && opciones.colores.length > 0 && (
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

      {/* Ancho y Largo (oculto para ACCESORIO) */}
      {mostrarDimensiones && <div className="grid grid-cols-2 gap-3">
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
          <label className="label"><span className="label-text font-medium">Largo (mm)</span></label>
          <input
            type="number" min="0" step="1"
            value={form.largo}
            onChange={e => handleDimensionChange('largo', e.target.value)}
            placeholder="Ej: 1000"
            className="input input-bordered"
          />
        </div>
      </div>}

      {/* Precio y Peso */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-medium">Precio venta (€)</span>
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

      {/* Familia / Subfamilia */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-medium">Familia / Subfamilia</span>
          {esAccesorio && <span className="label-text-alt text-info text-xs">Sin material ni dimensiones</span>}
        </label>
        <SelectorFamiliaSubfamilia
          value={form.subfamiliaId}
          onChange={id => setForm(f => ({ ...f, subfamiliaId: id }))}
          sugerirFamiliaId={familiaIdSugerida}
        />
      </div>

      {/* Fabricante */}
      <div className="form-control">
        <label className="label"><span className="label-text">Fabricante</span></label>
        <SelectorFabricante
          fabricantes={fabricantes}
          value={form.fabricanteId}
          onChange={id => setForm(f => ({ ...f, fabricanteId: id }))}
        />
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

      {/* Aviso si no hay tarifa — no mostrar mientras hay selectors pendientes */}
      {mostrarMaterial && form.material && form.espesor && !tieneTarifa && !cargando &&
       (opciones.lonasOpciones?.length ?? 0) <= 1 && !hayAcabados && opciones.colores.length === 0 && (
        <div className="alert alert-warning text-sm">
          No hay tarifa para <strong>{form.material}{form.acabado ? ' ' + form.acabado : ''} {form.espesor}mm</strong>. El precio se pondrá manualmente.
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
