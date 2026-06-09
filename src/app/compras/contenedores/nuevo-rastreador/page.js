"use client";
import { useState } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetcher } from '@/lib/fetcher';
import { Ship, Save, ArrowLeft, MapPin } from 'lucide-react';

const ESTADOS_OPCIONES = [
  { value: 'PEDIDO',   label: 'Pedido',      desc: 'Aún no ha salido del origen' },
  { value: 'TRANSITO', label: 'En tránsito', desc: 'Ya está navegando' },
  { value: 'ADUANA',   label: 'En aduana',   desc: 'Llegó al destino, en trámites' },
];

export default function NuevoRastreadorPage() {
  const router = useRouter();
  const { data: proveedores } = useSWR('/api/proveedores', fetcher);

  const [descripcion,    setDescripcion]    = useState('');
  const [numFactura,     setNumFactura]      = useState('');
  const [proveedorId,    setProveedorId]     = useState('');
  const [estado,         setEstado]          = useState('PEDIDO');
  const [tipoTracking,   setTipoTracking]    = useState('contenedor'); // 'contenedor' | 'bl'
  const [codigoTracking, setCodigoTracking]  = useState('');
  const [courierCode,    setCourierCode]     = useState('');
  const [saving,         setSaving]          = useState(false);
  const [error,          setError]           = useState(null);

  const NAVIERAS = [
    { value: '',              label: '— No especificada —' },
    { value: 'yang-ming',     label: 'Yang Ming' },
    { value: 'cosco',         label: 'COSCO' },
    { value: 'msc',           label: 'MSC' },
    { value: 'evergreen',     label: 'Evergreen' },
    { value: 'maersk',        label: 'Maersk' },
    { value: 'cma-cgm',       label: 'CMA CGM' },
    { value: 'hapag-lloyd',   label: 'Hapag-Lloyd' },
    { value: 'one-line',      label: 'ONE (Ocean Network Express)' },
    { value: 'oocl',          label: 'OOCL' },
    { value: 'hmm',           label: 'HMM (Hyundai)' },
    { value: 'zim',           label: 'ZIM' },
    { value: 'pil',           label: 'PIL (Pacific Int. Lines)' },
  ];

  const hayCodigoTracking = codigoTracking.trim().length > 0;

  const handleGuardar = async () => {
    if (!descripcion.trim() && !numFactura.trim() && !codigoTracking.trim()) {
      setError('Introduce al menos una descripción, nº de factura o código de tracking');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/importaciones/borrador', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          descripcion:    descripcion.trim()    || null,
          numFactura:     numFactura.trim()      || null,
          proveedorId:    proveedorId            || null,
          numContenedor:  tipoTracking === 'contenedor' ? codigoTracking.trim() || null : null,
          blNumber:       tipoTracking === 'bl'          ? codigoTracking.trim() || null : null,
          trackingActivo: hayCodigoTracking,
          courierCode:    courierCode || null,
          estado,
          bobinas: '[]',
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Error ${res.status}`);
      }
      router.push('/compras/contenedores');
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-lg">

      {/* Cabecera */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/compras/contenedores" className="btn btn-ghost btn-sm btn-circle">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-3">
          <Ship className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-xl font-bold">Nuevo rastreador</h1>
            <p className="text-sm text-base-content/50">Seguimiento automático con aviso por WhatsApp</p>
          </div>
        </div>
      </div>

      <div className="card bg-base-100 shadow-sm">
        <div className="card-body gap-5">

          {/* Descripción */}
          <div className="form-control">
            <label className="label pt-0">
              <span className="label-text font-medium">Descripción / identificador</span>
            </label>
            <input
              type="text"
              className="input input-bordered"
              placeholder="Ej: PVC junio 2026 — Proveedor China"
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              autoFocus
            />
          </div>

          {/* Proveedor + Factura */}
          <div className="grid grid-cols-2 gap-3">
            <div className="form-control">
              <label className="label pt-0">
                <span className="label-text font-medium">Proveedor</span>
              </label>
              <select
                className="select select-bordered"
                value={proveedorId}
                onChange={e => setProveedorId(e.target.value)}
              >
                <option value="">— Sin asignar —</option>
                {(proveedores || []).map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>
            <div className="form-control">
              <label className="label pt-0">
                <span className="label-text font-medium">Nº Factura proveedor</span>
              </label>
              <input
                type="text"
                className="input input-bordered font-mono"
                placeholder="INV-2026-001"
                value={numFactura}
                onChange={e => setNumFactura(e.target.value)}
              />
            </div>
          </div>

          {/* Estado inicial */}
          <div className="form-control">
            <label className="label pt-0">
              <span className="label-text font-medium">Estado actual del envío</span>
            </label>
            <div className="flex gap-2 flex-wrap">
              {ESTADOS_OPCIONES.map(opt => (
                <label
                  key={opt.value}
                  className={`flex-1 flex flex-col cursor-pointer px-3 py-2 rounded-lg border text-sm transition-colors min-w-24 ${
                    estado === opt.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-base-300 hover:border-base-content/30'
                  }`}
                >
                  <input
                    type="radio"
                    className="hidden"
                    value={opt.value}
                    checked={estado === opt.value}
                    onChange={() => setEstado(opt.value)}
                  />
                  <span className="font-semibold">{opt.label}</span>
                  <span className="text-xs opacity-60 mt-0.5">{opt.desc}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Naviera */}
          <div className="form-control">
            <label className="label pt-0">
              <span className="label-text font-medium">Naviera</span>
              <span className="label-text-alt text-base-content/40">Mejora la precisión del tracking</span>
            </label>
            <select
              className="select select-bordered"
              value={courierCode}
              onChange={e => setCourierCode(e.target.value)}
            >
              {NAVIERAS.map(n => (
                <option key={n.value} value={n.value}>{n.label}</option>
              ))}
            </select>
          </div>

          {/* Código de tracking */}
          <div className="form-control">
            <label className="label pt-0">
              <span className="label-text font-medium">Código de seguimiento</span>
              <span className="label-text-alt text-base-content/40">Para Terminal49</span>
            </label>
            <div className="flex gap-2 mb-2">
              <label className={`flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-lg border text-sm transition-colors ${tipoTracking === 'contenedor' ? 'border-primary bg-primary/10' : 'border-base-300'}`}>
                <input type="radio" className="radio radio-primary radio-xs" checked={tipoTracking === 'contenedor'} onChange={() => setTipoTracking('contenedor')} />
                Nº Contenedor
              </label>
              <label className={`flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-lg border text-sm transition-colors ${tipoTracking === 'bl' ? 'border-primary bg-primary/10' : 'border-base-300'}`}>
                <input type="radio" className="radio radio-primary radio-xs" checked={tipoTracking === 'bl'} onChange={() => setTipoTracking('bl')} />
                Nº BL
              </label>
            </div>
            <input
              type="text"
              className="input input-bordered font-mono uppercase"
              placeholder={tipoTracking === 'contenedor' ? 'MSCU1234567' : 'MSCUABCD12345678'}
              value={codigoTracking}
              onChange={e => setCodigoTracking(e.target.value.toUpperCase())}
            />
            {hayCodigoTracking ? (
              <p className="text-xs text-success mt-1.5 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                Tracking activado — recibirás WhatsApp cuando haya cambios
              </p>
            ) : (
              <p className="text-xs text-base-content/40 mt-1.5">
                Sin código el contenedor se guarda pero sin seguimiento automático
              </p>
            )}
          </div>

          {error && (
            <div className="alert alert-error text-sm py-2">{error}</div>
          )}

          {/* Acciones */}
          <div className="flex gap-2">
            <Link href="/compras/contenedores" className="btn btn-ghost flex-1">
              Cancelar
            </Link>
            <button
              className="btn btn-primary flex-1 gap-2"
              onClick={handleGuardar}
              disabled={saving}
            >
              {saving
                ? <span className="loading loading-spinner loading-sm" />
                : <Save className="w-4 h-4" />}
              Guardar rastreador
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
