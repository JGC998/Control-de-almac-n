"use client";
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import useSWR, { mutate } from 'swr';
import { Package2, Plus, Trash2, Info, Save, History, X, ChevronDown, ChevronUp, Download, Copy, Pencil, FileSpreadsheet, AlertTriangle, ScanLine, MapPin, RefreshCw, Wifi } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';

import { fetcher } from '@/lib/fetcher';
import ModalEscanearEtiqueta from '@/componentes/calculadoras/ModalEscanearEtiqueta';

const nuevaBobina = (id) => ({
  id,
  tipo: 'BOBINA', // 'BOBINA' | 'TACO' | 'GRAPA' | 'MAQUINA' | 'OTRO'
  referencia: '',
  material: '',    // Tipo de material (PVC, LONA…) — filtra el dropdown de tarifa
  espesor: '',
  ancho: '',
  longitud: '',
  paresPorCaja: '',
  numRollos: '1',
  precio: '',
  unidadPrecio: 'M', // 'M' = USD/metro lineal | 'SQM' = USD/m² (solo BOBINA)
  notas: '',
  tarifaMaterialId: '', // ID de TarifaMaterial a actualizar al guardar, o '__nuevo__' para crear
});

const n = (v) => parseFloat(v) || 0;
const fmt = (v, dec = 2) => isFinite(v)
  ? v.toLocaleString('es-ES', { minimumFractionDigits: dec, maximumFractionDigits: dec })
  : (0).toLocaleString('es-ES', { minimumFractionDigits: dec, maximumFractionDigits: dec });
const fmtEur = (v) => `${fmt(v)} €`;
const fmtUsd = (v) => `${fmt(v)} $`;

const ESTADOS_CONTENEDOR = [
  { value: 'BORRADOR', label: 'Borrador',    color: 'badge-warning' },
  { value: 'PEDIDO',   label: 'Pedido',      color: 'badge-ghost' },
  { value: 'TRANSITO', label: 'En tránsito', color: 'badge-info' },
  { value: 'ADUANA',   label: 'En aduana',   color: 'badge-warning' },
  { value: 'RECIBIDO', label: 'Recibido',    color: 'badge-success' },
];

// Fuente única de verdad para el estado vacío de trazabilidad (MAINT-02)
const TRAZABILIDAD_VACIA = {
  descripcion: '', proveedorId: '', numFactura: '', numContenedor: '',
  estado: 'RECIBIDO', fechaPedido: '', fechaLlegada: '',
  blNumber: '', trackingActivo: false,
};

function EstadoBadge({ estado }) {
  const e = ESTADOS_CONTENEDOR.find(x => x.value === estado) || ESTADOS_CONTENEDOR[3];
  return <span className={`badge badge-sm ${e.color}`}>{e.label}</span>;
}

function ModalGuardar({ datos, editandoId, onClose }) {
  const { data: proveedores } = useSWR('/api/proveedores', fetcher);
  const [descripcion, setDescripcion] = useState(datos.descripcion || '');
  const [proveedorId, setProveedorId] = useState(datos.proveedorId || '');
  const [numFactura, setNumFactura] = useState(datos.numFactura || '');
  const [numContenedor, setNumContenedor] = useState(datos.numContenedor || '');
  const [estado, setEstado] = useState(datos.estado || 'RECIBIDO');
  const [fechaPedido, setFechaPedido] = useState(datos.fechaPedido ? datos.fechaPedido.slice(0, 10) : '');
  const [fechaLlegada, setFechaLlegada] = useState(datos.fechaLlegada ? datos.fechaLlegada.slice(0, 10) : '');
  const [blNumber, setBlNumber] = useState(datos.blNumber || '');
  const [trackingActivo, setTrackingActivo] = useState(datos.trackingActivo || false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const esEdicion = !!editandoId;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const url = esEdicion ? `/api/importaciones/${editandoId}` : '/api/importaciones';
      const method = esEdicion ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...datos,
          descripcion: descripcion.trim() || null,
          proveedorId: proveedorId || null,
          numFactura: numFactura.trim() || null,
          numContenedor: numContenedor.trim() || null,
          estado,
          fechaPedido: fechaPedido || null,
          fechaLlegada: fechaLlegada || null,
          blNumber: blNumber.trim() || null,
          trackingActivo,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Error al guardar');
      mutate('/api/importaciones');
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal modal-open z-50">
      <div className="modal-box max-w-lg">
        <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" onClick={onClose}><X className="w-4 h-4" /></button>
        <h3 className="font-bold text-lg mb-4">{esEdicion ? 'Actualizar importación guardada' : 'Guardar importación'}</h3>

        {/* Resumen de costes */}
        <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
          <div className="bg-base-200 rounded p-2">
            <p className="text-xs text-base-content/50">Artículos</p>
            <p className="font-mono font-bold">{fmtEur(datos.totalBobinasEUR)}</p>
            <p className="text-xs text-base-content/40">{fmtUsd(datos.totalBobinasUSD)}</p>
          </div>
          <div className="bg-base-200 rounded p-2">
            <p className="text-xs text-base-content/50">Coste producto</p>
            <p className="font-mono font-bold text-success">{fmtEur(datos.costeProducto)}</p>
          </div>
        </div>

        {/* Campos de trazabilidad */}
        <div className="space-y-3 mb-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="form-control">
              <label className="label py-1"><span className="label-text text-xs">Proveedor</span></label>
              <select className="select select-bordered select-sm" value={proveedorId} onChange={e => setProveedorId(e.target.value)}>
                <option value="">— Sin asignar —</option>
                {(proveedores || []).map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
            <div className="form-control">
              <label className="label py-1"><span className="label-text text-xs">Estado</span></label>
              <select className="select select-bordered select-sm" value={estado} onChange={e => setEstado(e.target.value)}>
                {ESTADOS_CONTENEDOR.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="form-control">
              <label className="label py-1"><span className="label-text text-xs">Nº factura proveedor</span></label>
              <input type="text" className="input input-bordered input-sm" placeholder="INV-2026-001" value={numFactura} onChange={e => setNumFactura(e.target.value)} />
            </div>
            <div className="form-control">
              <label className="label py-1"><span className="label-text text-xs">Nº contenedor naviera</span></label>
              <input type="text" className="input input-bordered input-sm" placeholder="MSCU1234567" value={numContenedor} onChange={e => setNumContenedor(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="form-control">
              <label className="label py-1"><span className="label-text text-xs">Fecha de pedido</span></label>
              <input type="date" className="input input-bordered input-sm" value={fechaPedido} onChange={e => setFechaPedido(e.target.value)} />
            </div>
            <div className="form-control">
              <label className="label py-1"><span className="label-text text-xs">Fecha de llegada</span></label>
              <input type="date" className="input input-bordered input-sm" value={fechaLlegada} onChange={e => setFechaLlegada(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="form-control">
              <label className="label py-1"><span className="label-text text-xs">Nº BL (conocimiento de embarque)</span></label>
              <input type="text" className="input input-bordered input-sm font-mono" placeholder="MSCUABCD12345678" value={blNumber} onChange={e => setBlNumber(e.target.value)} />
            </div>
            <div className="form-control">
              <label className="label py-1"><span className="label-text text-xs">Tracking automático 3×/día</span></label>
              <label className="flex items-center gap-3 cursor-pointer mt-1.5">
                <input type="checkbox" className="toggle toggle-primary toggle-sm" checked={trackingActivo} onChange={e => setTrackingActivo(e.target.checked)} />
                <span className="text-xs">{trackingActivo ? '✅ Activado' : 'Desactivado'}</span>
              </label>
              {trackingActivo && !blNumber.trim() && !numContenedor.trim() && (
                <p className="text-xs text-warning mt-1">Necesitas Nº contenedor o BL para el tracking</p>
              )}
            </div>
          </div>
          <div className="form-control">
            <label className="label py-1"><span className="label-text text-xs">Descripción (opcional)</span></label>
            <input
              type="text" className="input input-bordered input-sm"
              placeholder="Ej: Contenedor enero 2026 — PVC y fieltros"
              value={descripcion} onChange={e => setDescripcion(e.target.value)}
              autoFocus onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
          </div>
        </div>

        {error && <div className="alert alert-error py-2 text-sm mb-3">{error}</div>}

        <div className="modal-action">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className={`btn gap-2 ${esEdicion ? 'btn-warning' : 'btn-primary'}`} onClick={handleSave} disabled={saving}>
            {saving ? <span className="loading loading-spinner loading-sm" /> : <Save className="w-4 h-4" />}
            {esEdicion ? 'Actualizar' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Iconos por estado de tracking (Ship24 status codes)
const TRACKING_ICONS = {
  in_transit:        { icon: '🚢', label: 'En tránsito' },
  customs:           { icon: '🏛️', label: 'En aduana' },
  available_for_pickup: { icon: '✅', label: 'Listo para recoger' },
  delivered:         { icon: '📦', label: 'Entregado' },
  out_for_delivery:  { icon: '🚚', label: 'En reparto' },
  exception:         { icon: '⚠️', label: 'Incidencia' },
  info_received:     { icon: '📋', label: 'Info recibida' },
};

function ModalTracking({ importacionId, numContenedor, blNumber, onClose }) {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const cargar = async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(`/api/importaciones/${importacionId}/tracking`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Error ${res.status}`);
      }
      setDatos(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const fmtFecha = (str) => {
    if (!str) return '';
    return new Date(str).toLocaleString('es-ES', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="modal modal-open z-50">
      <div className="modal-box max-w-2xl max-h-screen overflow-y-auto">
        <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" onClick={onClose}>
          <X className="w-4 h-4" />
        </button>

        <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          Seguimiento del contenedor
        </h3>
        <p className="text-sm text-base-content/50 mb-4 font-mono">
          {numContenedor || blNumber || '—'}
        </p>

        {cargando && (
          <div className="flex justify-center py-10">
            <span className="loading loading-spinner loading-md text-primary" />
          </div>
        )}

        {error && (
          <div className="alert alert-warning text-sm gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!cargando && datos && (
          <div className="space-y-4">
            {/* ETA */}
            {datos.eta && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-center gap-3">
                <span className="text-2xl">🎯</span>
                <div>
                  <p className="text-xs text-base-content/50">ETA estimada</p>
                  <p className="font-bold">{fmtFecha(datos.eta)}</p>
                </div>
              </div>
            )}

            {/* Timeline de eventos */}
            {datos.eventos?.length > 0 ? (
              <div>
                <p className="text-xs font-medium text-base-content/50 mb-2">
                  {datos.eventos.length} eventos registrados
                </p>
                <ol className="relative border-l border-base-content/20 space-y-4 ml-3">
                  {datos.eventos.map((ev, i) => {
                    const info = TRACKING_ICONS[ev.status] || { icon: '📍', label: ev.status };
                    return (
                      <li key={i} className="ml-4">
                        <span className="absolute -left-3 flex items-center justify-center w-6 h-6 rounded-full bg-base-200 ring-2 ring-base-100 text-sm">
                          {info.icon}
                        </span>
                        <div className={`p-2 rounded-lg ${i === 0 ? 'bg-primary/5 border border-primary/20' : 'bg-base-200'}`}>
                          <p className={`text-sm font-medium ${i === 0 ? 'text-primary' : ''}`}>
                            {ev.description || info.label}
                          </p>
                          {ev.location && (
                            <p className="text-xs text-base-content/50 mt-0.5">📍 {ev.location}</p>
                          )}
                          <p className="text-xs text-base-content/40 mt-0.5">
                            {fmtFecha(ev.occurrenceDatetime)}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ) : (
              <div className="text-center py-6 text-base-content/30">
                <p>Sin eventos de tracking todavía.</p>
                <p className="text-xs mt-1">Puede tardar 24-48h desde que el contenedor se registra en la naviera.</p>
              </div>
            )}

            <p className="text-xs text-base-content/30 text-right">
              Consultado: {new Date(datos.consultadoEn).toLocaleString('es-ES')}
            </p>
          </div>
        )}

        <div className="modal-action">
          <button className="btn btn-ghost gap-2" onClick={cargar} disabled={cargando}>
            <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} />
            Actualizar ahora
          </button>
          <button className="btn btn-primary" onClick={onClose}>Cerrar</button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  );
}

function HistorialImportaciones({ onCargar, onVerTracking }) {
  const { data: importaciones, isLoading } = useSWR('/api/importaciones', fetcher);
  const [abierto, setAbierto] = useState(false);

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta importación del historial?')) return;
    await fetch(`/api/importaciones/${id}`, { method: 'DELETE' });
    mutate('/api/importaciones');
  };

  return (
    <div className="card bg-base-200 shadow-sm mt-6">
      <div className="card-body p-4">
        <button className="flex items-center justify-between w-full text-left" onClick={() => setAbierto(p => !p)}>
          <h2 className="font-bold text-base flex items-center gap-2">
            <History className="w-4 h-4" /> Historial de importaciones guardadas
            {importaciones?.length > 0 && <span className="badge badge-ghost badge-sm">{importaciones.length}</span>}
          </h2>
          {abierto ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {abierto && (
          <div className="mt-4">
            {isLoading && <span className="loading loading-spinner loading-sm" />}
            {!isLoading && importaciones?.length === 0 && (
              <p className="text-sm text-base-content/40">No hay importaciones guardadas todavía.</p>
            )}
            {importaciones?.length > 0 && (
              <div className="overflow-x-auto">
                <table className="table table-sm w-full">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Estado</th>
                      <th>Descripción / Proveedor</th>
                      <th>Nº Factura</th>
                      <th>Nº Contenedor</th>
                      <th className="text-right">TC</th>
                      <th className="text-right">Coste producto</th>
                      <th className="text-right">€/metro</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {importaciones.map(imp => {
                      const esBorrador = imp.estado === 'BORRADOR';
                      return (
                        <tr key={imp.id} className={esBorrador ? 'bg-warning/10 hover' : 'hover'}>
                          <td className="text-xs text-base-content/50 whitespace-nowrap">
                            {new Date(imp.creadaEn).toLocaleDateString('es-ES')}
                            {imp.fechaLlegada && <div className="text-[10px] opacity-50">llegada: {new Date(imp.fechaLlegada).toLocaleDateString('es-ES')}</div>}
                          </td>
                          <td><EstadoBadge estado={imp.estado || 'RECIBIDO'} /></td>
                          <td className="text-sm">
                            <div className="max-w-xs truncate">
                              {esBorrador && <span className="text-warning font-semibold mr-1">Borrador tablet —</span>}
                              {imp.descripcion || <span className="text-base-content/30">Sin descripción</span>}
                            </div>
                            {imp.proveedor && <div className="text-xs text-base-content/50">{imp.proveedor.nombre}</div>}
                          </td>
                          <td className="text-xs font-mono">{imp.numFactura || '—'}</td>
                          <td className="text-xs font-mono">{imp.numContenedor || '—'}</td>
                          <td className="text-right font-mono text-xs">
                            {esBorrador ? <span className="text-base-content/30">—</span> : fmt(imp.tasaCambio, 4)}
                          </td>
                          <td className="text-right font-mono font-bold text-success">
                            {esBorrador ? <span className="text-base-content/30 font-normal">pendiente</span> : fmtEur(imp.costeProducto)}
                          </td>
                          <td className="text-right font-mono font-bold text-success">
                            {esBorrador ? '—' : (imp.totalMetros > 0 ? fmtEur(imp.costeProducto / imp.totalMetros) + '/m' : '—')}
                          </td>
                          <td>
                            <div className="flex gap-1 flex-wrap">
                              <button
                                className={`btn btn-xs ${esBorrador ? 'btn-warning' : 'btn-ghost'}`}
                                title={esBorrador ? 'Completar esta recepción con TC y gastos' : 'Cargar estos datos en la calculadora'}
                                onClick={() => onCargar(imp)}
                              >
                                {esBorrador ? 'Completar' : 'Cargar'}
                              </button>
                              {imp.trackingActivo && !esBorrador && (
                                <button
                                  className="btn btn-xs btn-ghost text-primary"
                                  title="Ver seguimiento del contenedor"
                                  onClick={() => onVerTracking(imp)}
                                >
                                  <MapPin className="w-3 h-3" />
                                </button>
                              )}
                              <button
                                className="btn btn-xs btn-ghost text-error"
                                onClick={() => handleDelete(imp.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CalculadoraContenedorPage() {
  // Historial para T-58 (autocompletar) y T-64 (alerta precio)
  const { data: importacionesHistorial } = useSWR('/api/importaciones', fetcher);
  // Tarifas de material para vincular y auto-actualizar precio €/m²
  const { data: tarifasMaterial } = useSWR('/api/precios', fetcher);

  // T-58 — referencias únicas usadas en importaciones anteriores
  const referenciasHistoricas = useMemo(() => {
    if (!importacionesHistorial) return [];
    const refs = new Set();
    importacionesHistorial.forEach(imp => {
      try {
        const bobs = typeof imp.bobinas === 'string' ? JSON.parse(imp.bobinas) : imp.bobinas;
        if (Array.isArray(bobs)) bobs.forEach(b => { if (b.referencia?.trim()) refs.add(b.referencia.trim()); });
      } catch { /* JSON inválido — ignorar */ }
    });
    return [...refs].sort();
  }, [importacionesHistorial]);

  // T-74 — lista única de materiales para el selector de tipo
  const materialesUnicos = useMemo(() => {
    if (!tarifasMaterial) return [];
    return [...new Set(tarifasMaterial.map(t => t.material))].sort();
  }, [tarifasMaterial]);

  // T-64 — último precio conocido por referencia { ref → { precio, unidad } }
  const preciosAnteriores = useMemo(() => {
    if (!importacionesHistorial) return {};
    const map = {};
    [...importacionesHistorial].reverse().forEach(imp => {
      try {
        const bobs = typeof imp.bobinas === 'string' ? JSON.parse(imp.bobinas) : imp.bobinas;
        if (!Array.isArray(bobs)) return;
        bobs.forEach(b => {
          if (b.referencia?.trim() && n(b.precio) > 0) {
            map[b.referencia.trim()] = { precio: n(b.precio), unidad: b.unidadPrecio || 'M' };
          }
        });
      } catch { /* ignorar */ }
    });
    return map;
  }, [importacionesHistorial]);

  const [tasaCambio, setTasaCambio] = useState('0.9300');
  const [bobinas, setBobinas] = useState([nuevaBobina(1)]);
  const [suplidos, setSuplidos] = useState('');
  const [exentos, setExentos] = useState('');
  const [sujetos, setSujetos] = useState('');
  const [ivaAduana, setIvaAduana] = useState('');
  const [pesoTotalKg, setPesoTotalKg] = useState('');
  const [volumenM3, setVolumenM3] = useState('');
  const [nextId, setNextId] = useState(2);
  const [modalGuardar, setModalGuardar] = useState(false);
  const [modalEscaner, setModalEscaner] = useState(false);
  const [modalTracking, setModalTracking] = useState(null); // { id, numContenedor, blNumber }

  // Soporte ?cargar=ID — carga automáticamente una importación desde la URL
  const searchParams = useSearchParams();
  useEffect(() => {
    const id = searchParams?.get('cargar');
    if (!id) return;
    fetch(`/api/importaciones/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(imp => { if (imp) handleCargarImportacion(imp); })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [editandoId, setEditandoId] = useState(null);
  const [datosTrazabilidad, setDatosTrazabilidad] = useState(TRAZABILIDAD_VACIA);

  const tc = n(tasaCambio);

  // --- Cálculos artículos ---
  const bobinasCals = bobinas.map(b => {
    const tipo = b.tipo || 'BOBINA';
    const precio = n(b.precio ?? b.usdPorMetro);
    const numRollos = Math.max(n(b.numRollos), 1);
    const longitud = n(b.longitud);
    const anchoM = n(b.ancho) / 1000;

    let totalMetrosBobina = 0;
    let subtotalUSD = 0;
    let usdPorMetro = 0;

    if (tipo === 'TACO') {
      // cantidad en metros × USD/m  (numRollos implícito = 1)
      totalMetrosBobina = longitud;
      subtotalUSD = precio * longitud;
      usdPorMetro = precio;
    } else if (tipo === 'GRAPA') {
      // nº cajas × USD/caja  (longitud no aplica)
      subtotalUSD = precio * numRollos;
    } else if (tipo === 'MAQUINA' || tipo === 'ESTRELLA' || tipo === 'OTRO') {
      // cantidad × USD/unidad
      subtotalUSD = precio * numRollos;
    } else {
      // BOBINA (default): puede ser $/M o $/M²
      usdPorMetro = b.unidadPrecio === 'SQM' ? precio * anchoM : precio;
      totalMetrosBobina = longitud * numRollos;
      subtotalUSD = usdPorMetro * totalMetrosBobina;
    }

    const subtotalEUR = subtotalUSD * tc;
    return { ...b, tipo, longitud, numRollos, anchoM, usdPorMetro, totalMetrosBobina, subtotalUSD, subtotalEUR };
  });

  const totalBobinasUSD = bobinasCals.reduce((s, b) => s + b.subtotalUSD, 0);
  const totalBobinasEUR = totalBobinasUSD * tc;
  const totalMetros = bobinasCals.reduce((s, b) => s + b.totalMetrosBobina, 0);

  // --- Gastos ---
  const supl = n(suplidos);
  const exen = n(exentos);
  const suj = n(sujetos);         // Total General (base imponible, sin IVA)
  const ivaDuana = n(ivaAduana);  // IVA Aduana dentro de suplidos (deducible)
  const ivaGeneral = suj * 0.21;  // Solo para display y totalDesembolso — NO repercute

  // REGLA: Total General (suj) + Exentos + (Suplidos − IVA Aduana). Sin IVA en ningún concepto.
  const gastosRepercutibles = suj + exen + (supl - ivaDuana);
  const costeProducto = totalBobinasEUR + gastosRepercutibles;
  const totalDesembolso = totalBobinasEUR + supl + exen + suj + ivaGeneral;

  // --- Métricas logísticas ---
  const pesoKg = n(pesoTotalKg);
  const volM3 = n(volumenM3);
  const kgPorMetro = totalMetros > 0 && pesoKg > 0 ? pesoKg / totalMetros : 0;
  const densidad = volM3 > 0 && pesoKg > 0 ? pesoKg / volM3 : 0;
  const costeFletePorKg = pesoKg > 0 ? gastosRepercutibles / pesoKg : 0;
  const costePorKg = pesoKg > 0 ? costeProducto / pesoKg : 0;
  const ocupacion20ft = volM3 > 0 ? Math.min(100, (volM3 / 33) * 100) : 0;
  const ocupacion40ft = volM3 > 0 ? Math.min(100, (volM3 / 67) * 100) : 0;

  // --- Prorrateo por valor ---
  const bobinasFinal = bobinasCals.map(b => {
    if (totalBobinasEUR === 0 || b.subtotalEUR === 0) {
      return { ...b, proporcion: 0, gastosProrrateados: 0, costeFinalEUR: b.subtotalEUR, costePorMetro: 0, pesoEstimadoKg: kgPorMetro > 0 ? b.totalMetrosBobina * kgPorMetro : null };
    }
    const proporcion = b.subtotalEUR / totalBobinasEUR;
    const gastosProrrateados = gastosRepercutibles * proporcion;
    const costeFinalEUR = b.subtotalEUR + gastosProrrateados;
    const costePorMetro = b.totalMetrosBobina > 0 ? costeFinalEUR / b.totalMetrosBobina : 0;
    const pesoEstimadoKg = kgPorMetro > 0 ? b.totalMetrosBobina * kgPorMetro : null;
    return { ...b, proporcion, gastosProrrateados, costeFinalEUR, costePorMetro, pesoEstimadoKg };
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

  const duplicarBobina = (id) => {
    const original = bobinas.find(b => b.id === id);
    if (!original) return;
    const copia = { ...original, id: nextId };
    setBobinas(prev => {
      const idx = prev.findIndex(b => b.id === id);
      const arr = [...prev];
      arr.splice(idx + 1, 0, copia);
      return arr;
    });
    setNextId(n => n + 1);
  };

  const handleCargarImportacion = (imp) => {
    try {
      const bobs = typeof imp.bobinas === 'string' ? JSON.parse(imp.bobinas) : imp.bobinas;
      if (!Array.isArray(bobs)) throw new Error('Formato inválido');
      setBobinas(bobs.map((b, i) => ({
        ...b,
        id: i + 1,
        tipo: b.tipo || 'BOBINA',
        precio: b.precio ?? b.usdPorMetro ?? '',
        unidadPrecio: b.unidadPrecio || 'M',
        notas: b.notas || '',
      })));
      setNextId(bobs.length + 1);
      // BUG-05: los borradores tienen tasaCambio=0 — usar el default en lugar de cero
      setTasaCambio(imp.tasaCambio > 0 ? String(imp.tasaCambio) : '0.9300');
      setSuplidos(String(imp.suplidos));
      setExentos(String(imp.exentos));
      setSujetos(String(imp.sujetos));
      setIvaAduana(String(imp.ivaAduana ?? 0));
      setPesoTotalKg(imp.pesoTotalKg > 0 ? String(imp.pesoTotalKg) : '');
      setVolumenM3(imp.volumenM3 > 0 ? String(imp.volumenM3) : '');
      setEditandoId(imp.id);
      setDatosTrazabilidad({
        ...TRAZABILIDAD_VACIA,
        descripcion:    imp.descripcion    || '',
        proveedorId:    imp.proveedorId    || '',
        numFactura:     imp.numFactura     || '',
        numContenedor:  imp.numContenedor  || '',
        estado:         imp.estado         || 'RECIBIDO',
        fechaPedido:    imp.fechaPedido  ? String(imp.fechaPedido).slice(0, 10)  : '',
        fechaLlegada:   imp.fechaLlegada ? String(imp.fechaLlegada).slice(0, 10) : '',
        blNumber:       imp.blNumber       || '',        // BUG-12
        trackingActivo: imp.trackingActivo ?? false,     // BUG-12
      });
    } catch {
      alert('No se pudieron cargar los datos de esta importación.');
    }
  };

  const handleNuevaImportacion = () => {
    setBobinas([nuevaBobina(1)]);
    setNextId(2);
    setTasaCambio('0.9300');
    setSuplidos(''); setExentos(''); setSujetos('');
    setEditandoId(null);
    setDatosTrazabilidad(TRAZABILIDAD_VACIA);
  };

  const handleEtiquetaEscaneada = (campos) => {
    const nueva = {
      ...nuevaBobina(nextId),
      tipo: campos.tipo || 'BOBINA',
      referencia: campos.referencia || '',
      espesor: campos.espesor || '',
      ancho: campos.ancho || '',
      longitud: campos.longitud || '',
      numRollos: campos.numRollos || '1',
      notas: campos.notas || '',
    };
    setBobinas(prev => [...prev, nueva]);
    setNextId(id => id + 1);
  };

  const hayResultados = bobinasFinal.some(b => b.subtotalEUR > 0);
  // PERF-01: calculado una vez, reutilizado en tabla de resultados y tfoot
  const articulosConValor = bobinasFinal.filter(b => b.subtotalEUR > 0);

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 14;
    let y = 20;

    // ── CABECERA ──
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORME DE IMPORTACIÓN', margin, y);
    y += 8;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, margin, y);
    doc.text(`1 USD = ${fmt(tc, 4)} EUR`, pageW - margin, y, { align: 'right' });
    y += 5;
    doc.setDrawColor(180); doc.line(margin, y, pageW - margin, y);
    y += 8;

    // ── TABLA DE ARTÍCULOS ──
    doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.text('Artículos del pedido', margin, y);
    y += 5;
    autoTable(doc, {
      startY: y,
      head: [['Referencia', 'Tipo', 'Detalle', 'Cant./Metros', 'Total USD', 'Total EUR']],
      body: bobinasCals.map(b => {
        const tipo = b.tipo || 'BOBINA';
        let detalle = '—';
        if (tipo === 'BOBINA' && (b.espesor || b.ancho)) {
          detalle = [b.espesor && `${b.espesor}mm`, b.ancho && `${b.ancho}mm ancho`].filter(Boolean).join(' · ');
        } else if (tipo === 'GRAPA' && b.ancho) {
          detalle = `${b.ancho}mm ancho`;
        }
        let cantMetros = '';
        if (tipo === 'BOBINA' || tipo === 'TACO') {
          cantMetros = (b.numRollos > 1 && tipo === 'BOBINA')
            ? `${b.numRollos}×${fmt(b.longitud, 0)} = ${fmt(b.totalMetrosBobina, 0)} m`
            : `${fmt(b.totalMetrosBobina, 0)} m`;
        } else {
          const uLabel = tipo === 'GRAPA' ? 'caj.' : 'ud.';
          cantMetros = `${b.numRollos} ${uLabel}`;
        }
        return [b.referencia || '—', tipo, detalle, cantMetros, fmtUsd(b.subtotalUSD), fmtEur(b.subtotalEUR)];
      }),
      foot: [['', '', '', 'TOTAL', fmtUsd(totalBobinasUSD), fmtEur(totalBobinasEUR)]],
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 30, 80], textColor: 255, fontStyle: 'bold' },
      footStyles: { fillColor: [30, 30, 80], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 32 }, 1: { cellWidth: 20 }, 2: { cellWidth: 38 },
        3: { cellWidth: 38 }, 4: { cellWidth: 26, halign: 'right' }, 5: { cellWidth: 26, halign: 'right' },
      },
      margin: { left: margin, right: margin },
    });
    y = doc.lastAutoTable.finalY + 10;

    // ── GASTOS DE IMPORTACIÓN ──
    doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.text('Gastos de importación', margin, y);
    y += 5;
    const gastosBody = [
      ['Total General — base imponible (repercute sin IVA)', fmtEur(suj)],
      ['Total Exento / Aranceles (repercute)', fmtEur(exen)],
      ['Total Suplidos — agente, handling, B/L (repercute)', fmtEur(supl)],
    ];
    if (ivaDuana > 0) {
      gastosBody.push([`  − IVA Aduana (dentro de suplidos, deducible)`, `−${fmtEur(ivaDuana)}`]);
    }
    if (suj > 0) {
      gastosBody.push([`IVA General (21% s/ ${fmtEur(suj)}) — deducible, no repercute`, fmtEur(ivaGeneral)]);
    }
    gastosBody.push(['Gastos repercutidos en producto', fmtEur(gastosRepercutibles)]);
    autoTable(doc, {
      startY: y,
      body: gastosBody,
      theme: 'plain',
      styles: { fontSize: 9 },
      columnStyles: { 0: { cellWidth: 'auto' }, 1: { cellWidth: 32, halign: 'right', fontStyle: 'bold' } },
      margin: { left: margin, right: margin },
    });
    y = doc.lastAutoTable.finalY + 10;

    // ── DATOS LOGÍSTICOS ──
    if (pesoKg > 0 || volM3 > 0) {
      doc.setFontSize(11); doc.setFont('helvetica', 'bold');
      doc.text('Datos logísticos', margin, y);
      y += 5;
      const logBody = [];
      if (pesoKg > 0) logBody.push(['Peso total del lote', `${fmt(pesoKg, 0)} kg`]);
      if (volM3 > 0) logBody.push(['Volumen total del lote', `${fmt(volM3, 2)} m³`]);
      if (kgPorMetro > 0) logBody.push(['kg / metro lineal', `${fmt(kgPorMetro, 3)} kg/m`]);
      if (densidad > 0) logBody.push(['Densidad del lote', `${fmt(densidad, 1)} kg/m³`]);
      if (costeFletePorKg > 0) logBody.push(['Coste flete / kg', fmtEur(costeFletePorKg)]);
      if (costePorKg > 0) logBody.push(['Coste producto / kg', fmtEur(costePorKg)]);
      if (ocupacion20ft > 0) logBody.push([`Ocupación contenedor 20ft (~33 m³)`, `${fmt(ocupacion20ft, 1)}%`]);
      if (ocupacion40ft > 0) logBody.push([`Ocupación contenedor 40ft (~67 m³)`, `${fmt(ocupacion40ft, 1)}%`]);
      autoTable(doc, {
        startY: y,
        body: logBody,
        theme: 'plain',
        styles: { fontSize: 9 },
        columnStyles: { 0: { cellWidth: 'auto' }, 1: { cellWidth: 40, halign: 'right', fontStyle: 'bold' } },
        margin: { left: margin, right: margin },
      });
      y = doc.lastAutoTable.finalY + 10;
    }

    // ── RESUMEN FINAL ──
    doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.text('Resumen', margin, y);
    y += 5;
    const resumenBody = [
      ['Coste total artículos (convertido a EUR)', fmtEur(totalBobinasEUR)],
      ['+ Gastos repercutidos (general + exentos + suplidos netos)', fmtEur(gastosRepercutibles)],
      ['= COSTE PRODUCTO', fmtEur(costeProducto)],
      ['Total desembolso real (todo incluido)', fmtEur(totalDesembolso)],
    ];
    autoTable(doc, {
      startY: y,
      body: resumenBody,
      theme: 'plain',
      styles: { fontSize: 9 },
      didParseCell: (data) => {
        if (data.row.index === 2) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fontSize = 11;
        }
      },
      columnStyles: { 0: { cellWidth: 'auto' }, 1: { cellWidth: 38, halign: 'right', fontStyle: 'bold' } },
      margin: { left: margin, right: margin },
    });
    y = doc.lastAutoTable.finalY + 10;

    // ── DESGLOSE POR ARTÍCULO ──
    const artConValor = bobinasFinal.filter(b => b.subtotalEUR > 0);
    if (artConValor.length > 0) {
      if (y > 220) { doc.addPage(); y = 20; }
      doc.setFontSize(11); doc.setFont('helvetica', 'bold');
      doc.text('Desglose de gastos por artículo', margin, y);
      y += 5;
      autoTable(doc, {
        startY: y,
        head: [['Referencia', 'Esp.\n(mm)', 'Ancho\n(mm)', '% Valor', 'Gastos repartidos', 'Coste final €', 'Coste real']],
        body: artConValor.map((b, idx) => {
          const anchoMm = n(b.ancho);
          const esPorUnidad = b.tipo === 'GRAPA' || b.tipo === 'MAQUINA' || b.tipo === 'ESTRELLA' || b.tipo === 'OTRO';
          // Coste real: €/m² para bobinas con ancho, €/m para el resto con metros, €/ud para artículos por unidad
          let costeReal = '—';
          if (esPorUnidad) {
            if (b.costeFinalEUR > 0 && b.numRollos > 0) costeReal = `${fmt(b.costeFinalEUR / b.numRollos, 4)} €/ud`;
          } else if (b.costePorMetro > 0 && anchoMm > 0) {
            costeReal = `${fmt(b.costePorMetro / (anchoMm / 1000), 4)} €/m²`;
          } else if (b.costePorMetro > 0) {
            costeReal = `${fmt(b.costePorMetro, 4)} €/m`;
          }
          return [
            b.referencia || `A${idx + 1}`,
            b.espesor || '—',
            anchoMm > 0 ? anchoMm : '—',
            `${fmt(totalBobinasEUR > 0 ? b.subtotalEUR / totalBobinasEUR * 100 : 0, 1)}%`,
            fmtEur(b.gastosProrrateados),
            fmtEur(b.costeFinalEUR),
            costeReal,
          ];
        }),
        theme: 'striped',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [30, 30, 80], textColor: 255, fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 32 },
          1: { cellWidth: 15, halign: 'center' },
          2: { cellWidth: 15, halign: 'center' },
          3: { cellWidth: 14, halign: 'right' },
          4: { cellWidth: 30, halign: 'right' },
          5: { cellWidth: 28, halign: 'right' },
          6: { cellWidth: 38, halign: 'right' },
        },
        margin: { left: margin, right: margin },
      });
    }

    // Footer en cada página
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(150);
      doc.text(
        `CRM Taller — Informe de Importación — ${new Date().toLocaleDateString('es-ES')} — Pág. ${i}/${pageCount}`,
        pageW / 2, 290, { align: 'center' }
      );
      doc.setTextColor(0);
    }

    doc.save(`importacion-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // T-71 — PDF simplificado: cabecera + tabla referencia/tipo/ancho/largo/$/m²/€/m²
  const handleExportPDFSimple = () => {
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 14;
    const fecha = new Date().toLocaleDateString('es-ES');
    let y = 20;

    // ── CABECERA ──
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('IMPORTACIÓN', margin, y);
    y += 8;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const parteIzq = [
      datosTrazabilidad.numFactura    && `Nº Factura: ${datosTrazabilidad.numFactura}`,
      datosTrazabilidad.numContenedor && `Nº Contenedor: ${datosTrazabilidad.numContenedor}`,
    ].filter(Boolean);
    const parteDer = [
      `Fecha: ${fecha}`,
      `1 USD = ${fmt(tc, 4)} EUR`,
    ];

    if (parteIzq.length > 0) {
      parteIzq.forEach(l => { doc.text(l, margin, y); y += 5; });
    }
    parteDer.forEach(l => { doc.text(l, margin, y); y += 5; });

    doc.setDrawColor(180);
    doc.line(margin, y, pageW - margin, y);
    y += 6;

    // ── TABLA ARTÍCULOS ──
    autoTable(doc, {
      startY: y,
      head: [['Referencia', 'Tipo', 'Ancho\n(mm)', 'Long. / Ud.', 'Precio compra', 'Coste real']],
      body: bobinasFinal.map((b, idx) => {
        const tipo = b.tipo || 'BOBINA';
        const anchoMm = n(b.ancho);
        const anchoM  = anchoMm / 1000;
        const esPorMetro = tipo === 'BOBINA' || tipo === 'TACO';
        const esPorUnidad = tipo === 'GRAPA' || tipo === 'MAQUINA' || tipo === 'ESTRELLA' || tipo === 'OTRO';

        // Cantidad
        const cantCol = esPorMetro
          ? `${fmt(b.totalMetrosBobina, 0)} m`
          : `${b.numRollos} ud`;

        // Columna "Precio compra" — precio original de la factura del proveedor
        let precioCompra = '—';
        if (esPorUnidad) {
          // Por unidad: precio directo de la factura
          const precioUd = n(b.precio);
          if (precioUd > 0) precioCompra = `${fmt(precioUd, 4)} $/ud`;
        } else if (anchoM > 0 && b.usdPorMetro > 0) {
          // Bobina con ancho: $/m²
          precioCompra = `${fmt(b.usdPorMetro / anchoM, 2)} $/m²`;
        } else if (b.usdPorMetro > 0) {
          // Bobina sin ancho o taco: $/m
          precioCompra = `${fmt(b.usdPorMetro, 4)} $/m`;
        }

        // Columna "Coste real" — precio de compra + gastos de importación prorrateados
        let costeReal = '—';
        if (esPorUnidad) {
          // Por unidad: coste final total ÷ número de unidades
          if (b.costeFinalEUR > 0 && n(b.numRollos) > 0) {
            costeReal = `${fmt(b.costeFinalEUR / n(b.numRollos), 4)} €/ud`;
          }
        } else if (b.costePorMetro > 0 && anchoM > 0) {
          // Bobina con ancho: €/m²
          costeReal = `${fmt(b.costePorMetro / anchoM, 2)} €/m²`;
        } else if (b.costePorMetro > 0) {
          // Bobina sin ancho o taco: €/m
          costeReal = `${fmt(b.costePorMetro, 4)} €/m`;
        }

        return [
          b.referencia || `Art.${idx + 1}`,
          tipo,
          anchoMm > 0 ? String(anchoMm) : '—',
          cantCol,
          precioCompra,
          costeReal,
        ];
      }),
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 30, 80], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 38 },
        1: { cellWidth: 24 },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 28, halign: 'right' },
        4: { cellWidth: 32, halign: 'right' },
        5: { cellWidth: 32, halign: 'right' },
      },
      margin: { left: margin, right: margin },
    });

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(150);
      doc.text(
        `CRM Taller — ${fecha} — Pág. ${i}/${pageCount}`,
        pageW / 2, 290, { align: 'center' }
      );
      doc.setTextColor(0);
    }

    doc.save(`importacion-resumen-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // T-63 — Exportar Excel
  const handleExportExcel = async () => {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'CRM Taller';
    wb.created = new Date();
    const fecha = new Date().toLocaleDateString('es-ES');
    const hdrFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E1E50' } };
    const hdrFont = { color: { argb: 'FFFFFFFF' }, bold: true };
    const moneda = { numFmt: '#,##0.00 €' };
    const monedaUSD = { numFmt: '#,##0.00 "$"' };

    // ── Hoja 1: Artículos ──
    const s1 = wb.addWorksheet('Artículos del pedido');
    s1.columns = [
      { header: 'Referencia', key: 'ref', width: 20 },
      { header: 'Tipo', key: 'tipo', width: 12 },
      { header: 'Esp. (mm)', key: 'esp', width: 10 },
      { header: 'Ancho (mm)', key: 'ancho', width: 12 },
      { header: 'Long./m', key: 'long', width: 10 },
      { header: 'Rollos/Cajas', key: 'rollos', width: 12 },
      { header: 'Precio USD', key: 'precio', width: 13 },
      { header: 'Unidad', key: 'unidad', width: 9 },
      { header: 'Notas', key: 'notas', width: 20 },
      { header: 'Total m', key: 'totalM', width: 10 },
      { header: 'Total USD', key: 'totalUSD', width: 13 },
      { header: 'Total EUR', key: 'totalEUR', width: 13 },
    ];
    s1.getRow(1).eachCell(c => { c.fill = hdrFill; c.font = hdrFont; });
    bobinasCals.forEach(b => {
      const row = s1.addRow({
        ref: b.referencia || '', tipo: b.tipo || 'BOBINA',
        esp: b.espesor || '', ancho: b.ancho || '', long: b.longitud || '',
        rollos: b.numRollos || 1, precio: n(b.precio), unidad: b.unidadPrecio || 'M',
        notas: b.notas || '', totalM: b.totalMetrosBobina || 0,
        totalUSD: b.subtotalUSD, totalEUR: b.subtotalEUR,
      });
      row.getCell('totalUSD').numFmt = monedaUSD.numFmt;
      row.getCell('totalEUR').numFmt = moneda.numFmt;
    });
    const totRow = s1.addRow({
      ref: 'TOTAL', tipo: '', esp: '', ancho: '', long: '', rollos: '', precio: '', unidad: '', notas: '',
      totalM: totalMetros, totalUSD: totalBobinasUSD, totalEUR: totalBobinasEUR,
    });
    totRow.font = { bold: true };
    totRow.getCell('totalUSD').numFmt = monedaUSD.numFmt;
    totRow.getCell('totalEUR').numFmt = moneda.numFmt;

    // ── Hoja 2: Desglose por artículo ──
    const s2 = wb.addWorksheet('Desglose por artículo');
    s2.columns = [
      { header: 'Referencia', key: 'ref', width: 20 },
      { header: 'Esp. (mm)', key: 'esp', width: 10 },
      { header: 'Ancho (mm)', key: 'ancho', width: 12 },
      { header: '% Valor', key: 'pct', width: 10 },
      { header: 'Gastos repartidos', key: 'gastos', width: 18 },
      { header: 'Coste final EUR', key: 'coste', width: 16 },
      { header: '€/metro lineal', key: 'eurM', width: 14 },
      { header: '€/m²', key: 'eurM2', width: 12 },
    ];
    s2.getRow(1).eachCell(c => { c.fill = hdrFill; c.font = hdrFont; });
    articulosConValor.forEach(b => {
      const anchoMm = n(b.ancho);
      const row = s2.addRow({
        ref: b.referencia || '',
        esp: b.espesor || '', ancho: anchoMm || '',
        pct: totalBobinasEUR > 0 ? b.subtotalEUR / totalBobinasEUR : 0,
        gastos: b.gastosProrrateados,
        coste: b.costeFinalEUR,
        eurM: b.costePorMetro > 0 ? b.costePorMetro : (b.costeFinalEUR > 0 && b.numRollos > 0 ? b.costeFinalEUR / b.numRollos : 0),
        eurM2: b.costePorMetro > 0 && anchoMm > 0 ? b.costePorMetro / (anchoMm / 1000) : '',
      });
      row.getCell('pct').numFmt = '0.0%';
      ['gastos', 'coste', 'eurM', 'eurM2'].forEach(k => { row.getCell(k).numFmt = moneda.numFmt; });
    });

    // ── Hoja 3: Gastos y Resumen ──
    const s3 = wb.addWorksheet('Gastos y Resumen');
    const addSection = (title, rows) => {
      const tRow = s3.addRow([title]);
      tRow.font = { bold: true, size: 12 };
      tRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8F0' } };
      rows.forEach(([label, value]) => {
        const r = s3.addRow([label, value]);
        if (typeof value === 'number') r.getCell(2).numFmt = moneda.numFmt;
      });
      s3.addRow([]);
    };
    s3.getColumn(1).width = 42; s3.getColumn(2).width = 18;
    addSection(`Informe de Importación — ${fecha}  |  TC: 1 USD = ${fmt(tc, 4)} EUR`, []);
    addSection('Gastos de importación', [
      ['Total General — base imponible (repercute sin IVA)', suj],
      ['Total Exento / Aranceles (repercute)', exen],
      ['Total Suplidos — agente, handling, B/L (repercute)', supl],
      ...(ivaDuana > 0 ? [['  − IVA Aduana (dentro de suplidos, deducible)', -ivaDuana]] : []),
      ...(suj > 0 ? [['IVA General 21% (deducible, no repercute)', ivaGeneral]] : []),
      ['Gastos repercutidos en producto', gastosRepercutibles],
    ]);
    if (pesoKg > 0 || volM3 > 0) {
      const logRows = [];
      if (pesoKg > 0) logRows.push(['Peso total del lote', `${fmt(pesoKg, 0)} kg`]);
      if (volM3 > 0) logRows.push(['Volumen total del lote', `${fmt(volM3, 2)} m³`]);
      if (kgPorMetro > 0) logRows.push(['kg / metro lineal', `${fmt(kgPorMetro, 3)} kg/m`]);
      if (densidad > 0) logRows.push(['Densidad del lote', `${fmt(densidad, 1)} kg/m³`]);
      if (costeFletePorKg > 0) logRows.push(['Coste flete / kg (€/kg)', costeFletePorKg]);
      if (costePorKg > 0) logRows.push(['Coste producto / kg (€/kg)', costePorKg]);
      if (ocupacion20ft > 0) logRows.push(['Ocupación 20ft (~33 m³) %', `${fmt(ocupacion20ft, 1)}%`]);
      if (ocupacion40ft > 0) logRows.push(['Ocupación 40ft (~67 m³) %', `${fmt(ocupacion40ft, 1)}%`]);
      addSection('Datos logísticos', logRows);
    }
    addSection('Resumen', [
      ['Coste total artículos (EUR)', totalBobinasEUR],
      ['+ Gastos repercutidos', gastosRepercutibles],
      ['= COSTE PRODUCTO', costeProducto],
      ['Total desembolso real', totalDesembolso],
      ...(totalMetros > 0 ? [['Total metros lineales', `${fmt(totalMetros, 0)} m`], ['€/metro medio', costeProducto / totalMetros]] : []),
    ]);

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `importacion-${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click(); URL.revokeObjectURL(url);
  };

  const datosParaGuardar = {
    tasaCambio: tc,
    totalBobinasUSD,
    totalBobinasEUR,
    totalMetros,
    suplidos: supl,
    exentos: exen,
    sujetos: suj,
    ivaAduana: ivaDuana,
    pesoTotalKg: pesoKg,
    volumenM3: volM3,
    gastosRepercutibles,
    costeProducto,
    totalDesembolso,
    bobinas: JSON.stringify(bobinas),
  };

  return (
    <div className="container mx-auto p-4 max-w-screen-xl print-contenedor">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <Package2 className="w-8 h-8 text-warning" />
          <div>
            <h1 className="text-3xl font-bold">Calculadora de Contenedor</h1>
            <p className="text-sm text-base-content/60">Coste real de importación por artículo, prorrateado por valor económico</p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          {editandoId && (
            <div className="flex items-center gap-2">
              <span className="badge badge-warning badge-sm gap-1">
                <Pencil className="w-3 h-3" /> Editando importación guardada
              </span>
              <button className="btn btn-ghost btn-xs" onClick={handleNuevaImportacion} title="Descartar cambios y empezar nueva importación">
                Nueva importación
              </button>
            </div>
          )}
          {hayResultados && (
            <>
              <button className="btn btn-outline btn-sm gap-2" onClick={handleExportPDFSimple}>
                <Download className="w-4 h-4" /> PDF Resumen
              </button>
              <button className="btn btn-outline btn-sm gap-2" onClick={handleExportPDF}>
                <Download className="w-4 h-4" /> PDF Completo
              </button>
              <button className="btn btn-outline btn-sm gap-2" onClick={handleExportExcel}>
                <FileSpreadsheet className="w-4 h-4" /> Excel
              </button>
              <button
                className={`btn btn-sm gap-2 ${editandoId ? 'btn-warning' : 'btn-success'}`}
                onClick={() => setModalGuardar(true)}
              >
                <Save className="w-4 h-4" />
                {editandoId ? 'Actualizar importación' : 'Guardar importación'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── FRANJA SUPERIOR: TC + Resumen ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-5">
        {/* Tipo de cambio */}
        <div className="card bg-base-200 shadow-sm">
          <div className="card-body p-4">
            <h2 className="font-bold text-sm mb-2 text-base-content/60 uppercase tracking-wide">Tipo de cambio</h2>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm">1 USD =</span>
              <input
                type="number" step="0.0001" min="0.0001"
                value={tasaCambio}
                onChange={e => setTasaCambio(e.target.value)}
                className="input input-bordered input-sm w-28 font-mono"
              />
              <span className="font-mono text-sm">EUR</span>
            </div>
            {tc > 0 && <p className="text-xs text-base-content/40 mt-1">1 EUR = {fmt(1/tc, 4)} USD</p>}
            {/* Convertidor tipo DUA: el DUA pone "1 EUR = X USD", hay que invertirlo */}
            <div className="mt-2 pt-2 border-t border-base-300">
              <p className="text-xs text-base-content/40 mb-1">Convertir tipo DUA</p>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono text-base-content/60">1 EUR =</span>
                <input
                  type="number" step="0.0001" min="0.0001"
                  placeholder="1.1733"
                  className="input input-bordered input-xs w-24 font-mono"
                  onChange={e => {
                    const v = parseFloat(e.target.value);
                    if (v > 0) setTasaCambio(String((1 / v).toFixed(4)));
                  }}
                />
                <span className="text-xs font-mono text-base-content/60">USD</span>
              </div>
              <p className="text-xs text-base-content/30 mt-0.5">→ calcula 1 ÷ tipo automáticamente</p>
            </div>
          </div>
        </div>

        {/* Resumen compacto */}
        <div className="lg:col-span-3 card bg-primary text-primary-content shadow-lg">
          <div className="card-body p-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 items-center">
              <div>
                <p className="text-xs opacity-70">Artículos</p>
                <p className="font-mono font-bold">{fmtEur(totalBobinasEUR)}</p>
                <p className="text-xs opacity-50">{fmtUsd(totalBobinasUSD)}</p>
              </div>
              <div>
                <p className="text-xs opacity-70">Gastos repercutidos</p>
                <p className="font-mono font-bold">{fmtEur(gastosRepercutibles)}</p>
                <p className="text-xs opacity-50">Gral. {fmtEur(suj)} + Exen. {fmtEur(exen)} + Supl. {fmtEur(supl - ivaDuana)}</p>
              </div>
              <div className="border-l border-primary-content/20 pl-4">
                <p className="text-xs opacity-70">Coste producto</p>
                <p className="font-mono text-2xl font-bold">{fmtEur(costeProducto)}</p>
                <p className="text-xs opacity-50">Desembolso total: {fmtEur(totalDesembolso)}</p>
              </div>
              <div className="border-l border-primary-content/20 pl-4">
                <p className="text-xs opacity-70">Total metros</p>
                <p className="font-mono font-bold">{fmt(totalMetros, 0)} m</p>
                {totalMetros > 0 && (
                  <>
                    <p className="text-xs opacity-70 mt-1">Coste medio</p>
                    <p className="font-mono text-lg font-bold">{fmtEur(costeProducto / totalMetros)}/m</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── ARTÍCULOS DEL PEDIDO — ancho completo ── */}
      <div className="card bg-base-200 shadow-sm mb-5">
        <div className="card-body p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-bold text-base">Artículos del pedido — datos de la factura del proveedor</h2>
            <div className="flex gap-2">
              <button onClick={() => setModalEscaner(true)} className="btn btn-sm btn-outline gap-1">
                <ScanLine className="w-4 h-4" /> Escanear etiqueta
              </button>
              <button onClick={addBobina} className="btn btn-sm btn-primary gap-1">
                <Plus className="w-4 h-4" /> Añadir artículo
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="table table-sm w-full">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Material<br/><span className="font-normal opacity-60">tipo</span></th>
                  <th>Referencia</th>
                  <th>Esp.<br/><span className="font-normal opacity-60">(mm)</span></th>
                  <th>Ancho<br/><span className="font-normal opacity-60">(mm)</span></th>
                  <th>Long. / Pares/caja<br/><span className="font-normal opacity-60">(m / uds)</span></th>
                  <th>Rollos/<br/><span className="font-normal opacity-60">Cajas/Ud.</span></th>
                  <th>Precio<br/><span className="font-normal opacity-60">USD/unidad</span></th>
                  <th>Tarifa €/m²<br/><span className="font-normal opacity-60">vincular</span></th>
                  <th className="text-right">Total m</th>
                  <th className="text-right">Total $</th>
                  <th className="text-right">Total €</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {bobinas.map((b, idx) => {
                  const cal = bobinasCals[idx];
                  const fin = bobinasFinal[idx];
                  const tipo = b.tipo || 'BOBINA';
                  const esBobina = tipo === 'BOBINA';
                  const esTaco   = tipo === 'TACO';
                  const esGrapa  = tipo === 'GRAPA';
                  const esMaquina = tipo === 'MAQUINA' || tipo === 'ESTRELLA' || tipo === 'OTRO';
                  const sinPrecio = !n(b.precio);
                  return (
                    <tr key={b.id} className={sinPrecio ? 'bg-warning/10' : ''}>
                      {/* Tipo */}
                      <td>
                        <select
                          className="select select-xs select-bordered w-24"
                          value={tipo}
                          onChange={e => handleBobinaChange(b.id, 'tipo', e.target.value)}
                        >
                          <option value="BOBINA">Bobina</option>
                          <option value="TACO">Taco</option>
                          <option value="GRAPA">Grapa</option>
                          <option value="MAQUINA">Máquina</option>
                          <option value="ESTRELLA">Estrella</option>
                          <option value="OTRO">Otro</option>
                        </select>
                      </td>
                      {/* Material (T-74) — selector de tipo para filtrar tarifa */}
                      <td>
                        {esBobina ? (
                          <select
                            className="select select-xs select-bordered w-28"
                            value={b.material || ''}
                            onChange={e => {
                              handleBobinaChange(b.id, 'material', e.target.value);
                              // Al cambiar material, limpiar vínculo de tarifa para evitar referencias cruzadas
                              handleBobinaChange(b.id, 'tarifaMaterialId', '');
                            }}
                          >
                            <option value="">— tipo —</option>
                            {materialesUnicos.map(m => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        ) : <span className="text-base-content/20 text-xs px-2">—</span>}
                      </td>
                      {/* Referencia + Notas (T-58: datalist autocompletar) */}
                      <td>
                        <input
                          type="text" placeholder={`A${idx + 1}`}
                          list="refs-historicas"
                          value={b.referencia}
                          onChange={e => handleBobinaChange(b.id, 'referencia', e.target.value)}
                          className="input input-xs input-bordered w-24"
                        />
                        <input
                          type="text" placeholder="notas…"
                          value={b.notas || ''}
                          onChange={e => handleBobinaChange(b.id, 'notas', e.target.value)}
                          className="input input-xs w-24 text-[10px] opacity-50 mt-0.5 border-0 border-b border-base-content/20 rounded-none bg-transparent focus:opacity-80 focus:outline-none"
                        />
                      </td>
                      {/* Espesor — solo BOBINA */}
                      <td>
                        {esBobina
                          ? <input type="number" step="0.1" min="0" placeholder="—"
                              value={b.espesor}
                              onChange={e => handleBobinaChange(b.id, 'espesor', e.target.value)}
                              className="input input-xs input-bordered w-20 font-mono"
                            />
                          : <span className="text-base-content/20 text-xs px-2">—</span>}
                      </td>
                      {/* Ancho — BOBINA, TACO y GRAPA */}
                      <td>
                        {(esBobina || esTaco || esGrapa)
                          ? <input type="number" step="1" min="0" placeholder="—"
                              value={b.ancho}
                              onChange={e => handleBobinaChange(b.id, 'ancho', e.target.value)}
                              className="input input-xs input-bordered w-20 font-mono"
                            />
                          : <span className="text-base-content/20 text-xs px-2">—</span>}
                      </td>
                      {/* Longitud (BOBINA/TACO) o Pares/caja (GRAPA) */}
                      <td>
                        {(esBobina || esTaco)
                          ? <input type="number" step="1" min="0" placeholder="0"
                              value={b.longitud}
                              onChange={e => handleBobinaChange(b.id, 'longitud', e.target.value)}
                              className="input input-xs input-bordered w-24 font-mono"
                            />
                          : esGrapa
                            ? <input type="number" step="1" min="1" placeholder="8"
                                value={b.paresPorCaja || ''}
                                onChange={e => handleBobinaChange(b.id, 'paresPorCaja', e.target.value)}
                                className="input input-xs input-bordered w-20 font-mono"
                                title="Pares de grapa por caja"
                              />
                            : <span className="text-base-content/20 text-xs px-2">—</span>}
                      </td>
                      {/* Rollos / Cajas / Cantidad — todo excepto TACO */}
                      <td>
                        {!esTaco
                          ? <input type="number" step="1" min="1" placeholder="1"
                              value={b.numRollos}
                              onChange={e => handleBobinaChange(b.id, 'numRollos', e.target.value)}
                              className="input input-xs input-bordered w-16 font-mono"
                            />
                          : <span className="text-base-content/20 text-xs px-2">—</span>}
                      </td>
                      {/* Precio */}
                      <td>
                        <div>
                          <div className="join">
                            <input
                              type="number" step="0.0001" min="0" placeholder="0.0000"
                              value={b.precio}
                              onChange={e => handleBobinaChange(b.id, 'precio', e.target.value)}
                              className="input input-xs input-bordered join-item w-32 font-mono"
                            />
                            {esBobina
                              ? <select
                                  className="select select-xs join-item border-base-300 bg-base-100 font-mono w-20"
                                  value={b.unidadPrecio}
                                  onChange={e => handleBobinaChange(b.id, 'unidadPrecio', e.target.value)}
                                >
                                  <option value="M">$/M</option>
                                  <option value="SQM">$/M²</option>
                                </select>
                              : <span className="join-item flex items-center px-2 border border-base-300 bg-base-200 text-xs font-mono whitespace-nowrap">
                                  {esGrapa ? '$/caja' : esMaquina ? '$/ud' : '$/M'}
                                </span>}
                          </div>
                          {esBobina && b.unidadPrecio === 'SQM' && n(b.ancho) > 0 && n(b.precio) > 0 && (
                            <p className="text-[10px] text-base-content/50 font-mono mt-0.5">
                              ≈{fmt(n(b.precio) * n(b.ancho) / 1000, 4)} $/M
                            </p>
                          )}
                          {esBobina && b.unidadPrecio === 'SQM' && !n(b.ancho) && (
                            <p className="text-[10px] text-warning mt-0.5">↑ falta ancho</p>
                          )}
                          {esGrapa && n(b.paresPorCaja) > 0 && n(b.ancho) > 0 && fin?.costeFinalEUR > 0 && (() => {
                            const costePorCaja = fin.costeFinalEUR / n(b.numRollos || 1);
                            const unidades100mm = n(b.paresPorCaja) * n(b.ancho) / 100;
                            const p100mm = unidades100mm > 0 ? costePorCaja / unidades100mm : 0;
                            return p100mm > 0 ? (
                              <p className="text-[10px] font-mono mt-0.5 text-info">
                                ≈{p100mm.toLocaleString('es-ES', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} €/100mm
                              </p>
                            ) : null;
                          })()}
                          {/* T-64: Alerta variación de precio vs última importación */}
                          {n(b.precio) > 0 && b.referencia?.trim() && (() => {
                            const prev = preciosAnteriores[b.referencia.trim()];
                            if (!prev) return null;
                            const pct = ((n(b.precio) - prev.precio) / prev.precio) * 100;
                            if (Math.abs(pct) < 10) return null;
                            const sube = pct > 0;
                            return (
                              <p className={`text-[10px] font-mono mt-0.5 flex items-center gap-0.5 ${sube ? 'text-error' : 'text-success'}`}
                                title={`Último precio: ${fmt(prev.precio, 4)} ${prev.unidad}`}>
                                <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                                {sube ? '▲' : '▼'} {fmt(Math.abs(pct), 1)}% vs último
                              </p>
                            );
                          })()}
                        </div>
                      </td>
                      {/* Tarifa €/m² — solo BOBINA (T-74: filtra por material seleccionado) */}
                      <td>
                        {esBobina ? (
                          <div>
                            <select
                              className="select select-xs select-bordered w-40 font-mono"
                              value={b.tarifaMaterialId || ''}
                              onChange={e => handleBobinaChange(b.id, 'tarifaMaterialId', e.target.value)}
                            >
                              <option value="">— no vincular —</option>
                              {(tarifasMaterial || [])
                                .filter(t => !b.material || t.material === b.material)
                                .map(t => (
                                  <option key={t.id} value={t.id}>
                                    {t.material} {t.espesor}mm{t.color ? ` (${t.color})` : ''}{t.lonas ? ` ${t.lonas}L` : ''}
                                  </option>
                                ))}
                              {b.material && n(b.espesor) > 0 && (
                                <option value="__nuevo__">➕ Crear: {b.material} {b.espesor}mm</option>
                              )}
                            </select>
                            {b.tarifaMaterialId && fin?.costeFinalEUR > 0 && n(b.ancho) > 0 && fin.totalMetrosBobina > 0 && (() => {
                              const m2 = fin.totalMetrosBobina * (n(b.ancho) / 1000);
                              const p = m2 > 0 ? fin.costeFinalEUR / m2 : 0;
                              return p > 0 ? (
                                <p className="text-[10px] font-mono mt-0.5 text-info">
                                  → {fmt(p, 4)} €/m²
                                </p>
                              ) : null;
                            })()}
                          </div>
                        ) : (
                          <span className="text-base-content/20 text-xs px-2">—</span>
                        )}
                      </td>
                      {/* Total m */}
                      <td className="text-right font-mono text-sm">
                        {cal.totalMetrosBobina > 0
                          ? `${fmt(cal.totalMetrosBobina, 0)} m`
                          : <span className="text-base-content/20">—</span>}
                      </td>
                      <td className="text-right font-mono text-sm">{fmtUsd(cal.subtotalUSD)}</td>
                      <td className="text-right font-mono text-sm">{fmtEur(cal.subtotalEUR)}</td>
                      <td>
                        <div className="flex gap-0.5">
                          <button onClick={() => duplicarBobina(b.id)} className="btn btn-ghost btn-xs text-base-content/40" title="Duplicar fila">
                            <Copy className="w-3 h-3" />
                          </button>
                          {bobinas.length > 1 && (
                            <button onClick={() => removeBobina(b.id)} className="btn btn-ghost btn-xs text-error">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="font-bold">
                  <td colSpan={9} className="text-sm">Total</td>
                  <td className="text-right font-mono text-sm">{totalMetros > 0 ? `${fmt(totalMetros, 0)} m` : '—'}</td>
                  <td className="text-right font-mono text-sm">{fmtUsd(totalBobinasUSD)}</td>
                  <td className="text-right font-mono text-sm">{fmtEur(totalBobinasEUR)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
            {/* Aviso de actualizaciones de tarifa al guardar */}
            {(() => {
              const actualizaciones = bobinas.map((b, idx) => {
                if (b.tipo !== 'BOBINA' || !b.tarifaMaterialId) return null;
                const fin = bobinasFinal[idx];
                const anchoM = n(b.ancho) / 1000;
                if (!fin || anchoM <= 0 || fin.totalMetrosBobina <= 0 || fin.costeFinalEUR <= 0) return null;
                const totalM2 = fin.totalMetrosBobina * anchoM;
                const nuevoPrecio = totalM2 > 0 ? fin.costeFinalEUR / totalM2 : 0;
                if (nuevoPrecio <= 0) return null;
                const tarifaActual = b.tarifaMaterialId === '__nuevo__'
                  ? null
                  : (tarifasMaterial || []).find(t => t.id === b.tarifaMaterialId);
                const label = tarifaActual
                  ? `${tarifaActual.material} ${tarifaActual.espesor}mm${tarifaActual.color ? ` (${tarifaActual.color})` : ''}`
                  : `${b.material || b.referencia?.trim() || '?'} ${b.espesor || '?'}mm`;
                return { label, precioActual: tarifaActual?.precio ?? null, nuevoPrecio, isNew: b.tarifaMaterialId === '__nuevo__' };
              }).filter(Boolean);
              if (actualizaciones.length === 0) return null;
              return (
                <div className="mt-3 mx-1 rounded-lg border border-info/40 bg-info/5 px-3 py-2.5">
                  <p className="text-xs font-semibold text-info mb-1.5">Al guardar se actualizará automáticamente en Tarifa de materiales:</p>
                  <ul className="space-y-0.5">
                    {actualizaciones.map((a, i) => (
                      <li key={i} className="text-xs font-mono text-base-content/70 flex items-center gap-1.5 flex-wrap">
                        <span className="text-info shrink-0">→</span>
                        <span className="font-semibold">{a.label}</span>
                        {a.isNew
                          ? <span className="text-success">nueva entrada → {fmt(a.nuevoPrecio, 4)} €/m²</span>
                          : a.precioActual != null
                            ? <span>{fmt(a.precioActual, 4)} → <span className="font-semibold text-success">{fmt(a.nuevoPrecio, 4)} €/m²</span></span>
                            : <span className="text-success">→ {fmt(a.nuevoPrecio, 4)} €/m²</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })()}
            {/* T-58 — datalist global de referencias históricas */}
            <datalist id="refs-historicas">
              {referenciasHistoricas.map(ref => <option key={ref} value={ref} />)}
            </datalist>
          </div>
        </div>
      </div>

          {/* Gastos de importación */}
          <div className="card bg-base-200 shadow-sm">
            <div className="card-body p-4">
              <h2 className="font-bold text-base mb-1">Gastos de importación (€)</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-3">

                {/* Total General */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">Total General</span>
                    <span className="badge badge-success badge-sm">✓ Repercute</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number" step="0.01" min="0" placeholder="0.00"
                      value={sujetos}
                      onChange={e => setSujetos(e.target.value)}
                      className="input input-bordered w-full font-mono"
                    />
                    <span className="text-sm opacity-50">€</span>
                  </div>
                  <p className="text-xs text-base-content/50">Base imponible (sin IVA) — transporte nacional, descarga</p>
                  {suj > 0 && (
                    <p className="text-xs font-mono text-base-content/40">
                      IVA 21%: {fmtEur(ivaGeneral)} → factura: {fmtEur(suj + ivaGeneral)}
                    </p>
                  )}
                </div>

                {/* Total Exento */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">Total Exento</span>
                    <span className="badge badge-success badge-sm">✓ Repercute</span>
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
                  <p className="text-xs text-base-content/50">Aranceles de aduana — sin IVA</p>
                </div>

                {/* Total Suplidos */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">Total Suplidos</span>
                    <span className="badge badge-success badge-sm">✓ Repercute (neto)</span>
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
                  {ivaDuana > 0 && (
                    <p className="text-xs font-mono text-base-content/40">
                      Neto repercutido: {fmtEur(supl - ivaDuana)}
                    </p>
                  )}
                </div>

                {/* IVA Aduana */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">IVA Aduana</span>
                    <span className="badge badge-warning badge-sm">Deducible</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number" step="0.01" min="0" placeholder="0.00"
                      value={ivaAduana}
                      onChange={e => setIvaAduana(e.target.value)}
                      className="input input-bordered w-full font-mono"
                    />
                    <span className="text-sm opacity-50">€</span>
                  </div>
                  <p className="text-xs text-base-content/50">Dentro de suplidos — te lo desgrava, no repercute</p>
                </div>
              </div>

              {/* Aviso */}
              <div className="alert py-2 mt-3 text-xs bg-base-300 border-base-content/10">
                <Info className="w-4 h-4 shrink-0" />
                <span>
                  <strong>IVA Aduana</strong> está incluido en Total Suplidos pero se descuenta del repercutido (es deducible).
                  El <strong>IVA General</strong> (21% s/ Total General) también es deducible y <strong>no entra en el €/metro</strong>.
                  Repercutido = <strong>General + Exento + (Suplidos − IVA Aduana)</strong>.
                </span>
              </div>

              {/* Subtotales */}
              <div className="mt-4 pt-3 border-t border-base-content/10 space-y-1.5">
                <div className="flex justify-between text-sm font-medium text-success">
                  <span>Gastos repercutidos en producto</span>
                  <span className="font-mono">{fmtEur(gastosRepercutibles)}</span>
                </div>
                {ivaDuana > 0 && (
                  <div className="flex justify-between text-sm text-warning/70 text-xs">
                    <span className="flex items-center gap-1"><Info className="w-3 h-3" /> IVA Aduana (deducible, descontado)</span>
                    <span className="font-mono">−{fmtEur(ivaDuana)}</span>
                  </div>
                )}
                {ivaGeneral > 0 && (
                  <div className="flex justify-between text-sm text-base-content/30 text-xs">
                    <span>IVA General 21% (deducible, no repercute)</span>
                    <span className="font-mono">{fmtEur(ivaGeneral)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold border-t border-base-content/10 pt-1">
                  <span>Total desembolso real (todo incluido)</span>
                  <span className="font-mono">{fmtEur(totalDesembolso)}</span>
                </div>
              </div>
            </div>
          </div>

      {/* Datos logísticos */}
      <div className="card bg-base-200 shadow-sm">
        <div className="card-body p-4">
          <h2 className="font-bold text-base mb-1">Datos logísticos (del albarán/factura)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            <div className="space-y-1">
              <span className="font-medium text-sm">Peso total del lote</span>
              <div className="flex items-center gap-2">
                <input
                  type="number" step="0.1" min="0" placeholder="0.0"
                  value={pesoTotalKg}
                  onChange={e => setPesoTotalKg(e.target.value)}
                  className="input input-bordered w-full font-mono"
                />
                <span className="text-sm opacity-50">kg</span>
              </div>
              <p className="text-xs text-base-content/50">Peso bruto total indicado en la factura</p>
            </div>
            <div className="space-y-1">
              <span className="font-medium text-sm">Volumen total del lote</span>
              <div className="flex items-center gap-2">
                <input
                  type="number" step="0.01" min="0" placeholder="0.00"
                  value={volumenM3}
                  onChange={e => setVolumenM3(e.target.value)}
                  className="input input-bordered w-full font-mono"
                />
                <span className="text-sm opacity-50">m³</span>
              </div>
              <p className="text-xs text-base-content/50">Volumen total indicado en la factura</p>
            </div>
          </div>

          {(pesoKg > 0 || volM3 > 0) && (
            <div className="mt-4 pt-3 border-t border-base-content/10 grid grid-cols-2 md:grid-cols-4 gap-3">
              {kgPorMetro > 0 && (
                <div className="bg-base-100 rounded-lg p-3 text-center">
                  <p className="text-xs text-base-content/50 mb-1">kg / metro lineal</p>
                  <p className="font-mono font-bold text-primary text-lg">{fmt(kgPorMetro, 3)}</p>
                  <p className="text-xs text-base-content/40">kg/m</p>
                </div>
              )}
              {densidad > 0 && (
                <div className="bg-base-100 rounded-lg p-3 text-center">
                  <p className="text-xs text-base-content/50 mb-1">Densidad del lote</p>
                  <p className="font-mono font-bold text-lg">{fmt(densidad, 1)}</p>
                  <p className="text-xs text-base-content/40">kg/m³</p>
                </div>
              )}
              {costeFletePorKg > 0 && (
                <div className="bg-base-100 rounded-lg p-3 text-center">
                  <p className="text-xs text-base-content/50 mb-1">Flete / kg</p>
                  <p className="font-mono font-bold text-lg">{fmtEur(costeFletePorKg)}</p>
                  <p className="text-xs text-base-content/40">€/kg</p>
                </div>
              )}
              {costePorKg > 0 && (
                <div className="bg-base-100 rounded-lg p-3 text-center">
                  <p className="text-xs text-base-content/50 mb-1">Coste / kg</p>
                  <p className="font-mono font-bold text-success text-lg">{fmtEur(costePorKg)}</p>
                  <p className="text-xs text-base-content/40">€/kg</p>
                </div>
              )}
              {ocupacion20ft > 0 && (
                <div className="bg-base-100 rounded-lg p-3 text-center col-span-2">
                  <p className="text-xs text-base-content/50 mb-1">Ocupación contenedor</p>
                  <div className="flex gap-4 justify-center items-center">
                    <div>
                      <p className="font-mono font-bold text-lg">{fmt(ocupacion20ft, 1)}%</p>
                      <p className="text-xs text-base-content/40">20ft (~33 m³)</p>
                    </div>
                    <div className="divider divider-horizontal m-0"></div>
                    <div>
                      <p className="font-mono font-bold text-lg">{fmt(ocupacion40ft, 1)}%</p>
                      <p className="text-xs text-base-content/40">40ft (~67 m³)</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="alert text-xs p-3 mt-4">
        <div className="space-y-1.5">
          <p className="font-bold">Metodología</p>
          <p>Prorrateo por <strong>valor económico</strong>: cada artículo (bobina, taco, grapa, máquina…) asume el porcentaje de gastos proporcional a su precio total en €.</p>
          <p className="pt-1 border-t border-base-content/10">
            <strong>Se repercute:</strong> Total General (base) + Total Exento + (Suplidos − IVA Aduana)<br />
            <strong>No se repercute:</strong> IVA General (21%) ni IVA Aduana — ambos son deducibles
          </p>
        </div>
      </div>

      {/* ── Tabla resultados ── */}
      {hayResultados && (
        <div className="card bg-base-200 shadow-sm mt-6">
          <div className="card-body p-4">
            <h2 className="font-bold text-base mb-3">Coste real por artículo</h2>
            <div className="overflow-x-auto">
              <table className="table table-sm w-full">
                <thead>
                  <tr>
                    <th>Referencia</th>
                    <th>Tipo</th>
                    <th>Detalle</th>
                    <th className="text-right">Metros/Uds.</th>
                    <th className="text-right">Valor $ → €</th>
                    <th className="text-right">% valor</th>
                    <th className="text-right">Gastos repercutidos</th>
                    <th className="text-right">Coste total €</th>
                    {kgPorMetro > 0 && <th className="text-right text-info">Peso est.</th>}
                    <th className="text-right text-success">€/metro o ud.</th>
                  </tr>
                </thead>
                <tbody>
                  {articulosConValor.map((b, idx) => {
                    const tipo = b.tipo || 'BOBINA';
                    const tieneMetos = tipo === 'BOBINA' || tipo === 'TACO';
                    const numRollosLabel = tipo === 'GRAPA' ? 'caj.' : tipo === 'MAQUINA' || tipo === 'ESTRELLA' || tipo === 'OTRO' ? 'ud.' : 'rol.';
                    return (
                      <tr key={b.id} className="hover">
                        <td className="font-medium">{b.referencia || `A${idx + 1}`}</td>
                        <td>
                          <span className="badge badge-ghost badge-xs">{tipo}</span>
                        </td>
                        <td className="text-sm opacity-70">
                          {tipo === 'BOBINA' && (b.espesor || b.ancho)
                            ? [b.espesor && `${b.espesor}mm esp.`, b.ancho && `${b.ancho}mm ancho`].filter(Boolean).join(' · ')
                            : tipo === 'GRAPA' && b.ancho
                            ? `${b.ancho}mm ancho`
                            : '—'}
                        </td>
                        <td className="text-right font-mono text-sm">
                          {tieneMetos
                            ? (b.numRollos > 1 && tipo === 'BOBINA'
                                ? <span>{b.numRollos}×{fmt(b.longitud, 0)} m<br/><span className="opacity-50">= {fmt(b.totalMetrosBobina, 0)} m</span></span>
                                : `${fmt(b.totalMetrosBobina, 0)} m`)
                            : `${b.numRollos} ${numRollosLabel}`}
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
                        {kgPorMetro > 0 && (
                          <td className="text-right font-mono text-info text-sm">
                            {b.pesoEstimadoKg != null ? `${fmt(b.pesoEstimadoKg, 1)} kg` : '—'}
                          </td>
                        )}
                        <td className="text-right font-mono font-bold text-success text-base">
                          {b.costePorMetro > 0
                            ? `${fmtEur(b.costePorMetro)}/m`
                            : b.costeFinalEUR > 0 && b.numRollos > 0
                            ? `${fmtEur(b.costeFinalEUR / b.numRollos)}/ud`
                            : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {articulosConValor.length > 1 && (
                  <tfoot>
                    <tr className="font-bold border-t-2 border-base-content/20">
                      <td colSpan={4}>Total</td>
                      <td className="text-right font-mono">
                        {fmtUsd(totalBobinasUSD)}<br />
                        <span className="font-normal opacity-60">{fmtEur(totalBobinasEUR)}</span>
                      </td>
                      <td className="text-right font-mono">100 %</td>
                      <td className="text-right font-mono">{fmtEur(gastosRepercutibles)}</td>
                      <td className="text-right font-mono">{fmtEur(costeProducto)}</td>
                      {kgPorMetro > 0 && (
                        <td className="text-right font-mono text-info">
                          {pesoKg > 0 ? `${fmt(pesoKg, 0)} kg` : '—'}
                        </td>
                      )}
                      <td className="text-right font-mono text-success">
                        {totalMetros > 0 ? `${fmtEur(costeProducto / totalMetros)}/m` : '—'}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Historial ── */}
      <div className="no-print">
        <HistorialImportaciones
          onCargar={handleCargarImportacion}
          onVerTracking={(imp) => setModalTracking({ id: imp.id, numContenedor: imp.numContenedor, blNumber: imp.blNumber })}
        />
      </div>

      {/* ── Modal guardar ── */}
      {modalGuardar && (
        <ModalGuardar
          datos={{ ...datosParaGuardar, ...datosTrazabilidad }}
          editandoId={editandoId}
          onClose={() => setModalGuardar(false)}
        />
      )}

      {/* ── Modal escanear etiqueta ── */}
      {modalEscaner && (
        <ModalEscanearEtiqueta
          onConfirmar={handleEtiquetaEscaneada}
          onClose={() => setModalEscaner(false)}
        />
      )}

      {/* ── Modal tracking contenedor ── */}
      {modalTracking && (
        <ModalTracking
          importacionId={modalTracking.id}
          numContenedor={modalTracking.numContenedor}
          blNumber={modalTracking.blNumber}
          onClose={() => setModalTracking(null)}
        />
      )}
    </div>
  );
}

import { Suspense } from 'react';
export default function Page() {
  return (
    <Suspense>
      <CalculadoraContenedorPage />
    </Suspense>
  );
}
