"use client";
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import Link from 'next/link';
import { fetcher } from '@/lib/fetcher';
import {
  ArrowLeft, RefreshCw, MapPin, Package, Calendar,
  Ship, PackageCheck, Calculator, AlertTriangle,
} from 'lucide-react';

const ESTADOS = {
  BORRADOR:  { label: 'Borrador',     color: 'badge-warning' },
  PEDIDO:    { label: 'Pedido',       color: 'badge-ghost'   },
  TRANSITO:  { label: 'En tránsito',  color: 'badge-info'    },
  ADUANA:    { label: 'En aduana',    color: 'badge-warning' },
  RECIBIDO:  { label: 'Recibido',     color: 'badge-success' },
};

function fmtFecha(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDatetime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function ContenedorDetalle() {
  const params = useParams();
  const router = useRouter();
  const { id } = params;

  const { data: imp, isLoading, mutate } = useSWR(id ? `/api/importaciones/${id}` : null, fetcher);

  const [actualizando, setActualizando]   = useState(false);
  const [eventos, setEventos]             = useState(null);
  const [errorTracking, setErrorTracking] = useState(null);
  const [ultimaConsulta, setUltimaConsulta] = useState(null);
  const [marcandoRecibido, setMarcandoRecibido] = useState(false);

  // Cargar tracking automáticamente al abrir si el contenedor tiene número y está activo
  useEffect(() => {
    if (imp?.trackingActivo && (imp?.numContenedor || imp?.blNumber)) {
      handleActualizar();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imp?.id]);

  const handleActualizar = async () => {
    setActualizando(true);
    setErrorTracking(null);
    try {
      const res  = await fetch(`/api/importaciones/${id}/tracking`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al obtener tracking');
      setEventos(data.eventos || []);
      setUltimaConsulta(data.consultadoEn ? new Date(data.consultadoEn) : new Date());
      mutate();
    } catch (err) {
      setErrorTracking(err.message);
    } finally {
      setActualizando(false);
    }
  };

  const handleMarcarRecibido = async () => {
    if (!confirm('¿Marcar este contenedor como recibido? Se desactivará el tracking automático.')) return;
    setMarcandoRecibido(true);
    try {
      await fetch(`/api/importaciones/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'RECIBIDO', trackingActivo: false }),
      });
      mutate();
    } finally {
      setMarcandoRecibido(false);
    }
  };

  if (isLoading) return (
    <div className="flex justify-center items-center h-64">
      <span className="loading loading-spinner loading-lg" />
    </div>
  );
  if (!imp) return (
    <div className="container mx-auto p-4">
      <p className="text-error">Contenedor no encontrado.</p>
      <Link href="/compras/contenedores" className="btn btn-ghost mt-2">Volver</Link>
    </div>
  );

  const estado = ESTADOS[imp.estado] ?? { label: imp.estado, color: 'badge-neutral' };

  return (
    <div className="container mx-auto p-4 max-w-3xl">

      <button onClick={() => router.back()} className="btn btn-ghost mb-4 gap-2">
        <ArrowLeft className="w-4 h-4" /> Volver
      </button>

      {/* Info principal */}
      <div className="card bg-base-100 shadow-sm border border-base-200 mb-4">
        <div className="card-body p-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`badge ${estado.color}`}>{estado.label}</span>
                {imp.trackingActivo && (
                  <span className="badge badge-ghost gap-1">
                    <MapPin className="w-3 h-3" /> Tracking activo
                  </span>
                )}
              </div>
              <h1 className="text-xl font-bold">
                {imp.descripcion || imp.numContenedor || imp.blNumber || 'Sin identificar'}
              </h1>
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-base-content/60">
                {imp.numContenedor && (
                  <span className="flex items-center gap-1">
                    <Package className="w-3.5 h-3.5" />
                    <span className="font-mono">{imp.numContenedor}</span>
                  </span>
                )}
                {imp.blNumber && (
                  <span className="flex items-center gap-1">
                    <Ship className="w-3.5 h-3.5" />
                    BL: <span className="font-mono">{imp.blNumber}</span>
                  </span>
                )}
                {imp.numFactura && <span>Factura: <span className="font-mono">{imp.numFactura}</span></span>}
                {imp.proveedor  && <span>{imp.proveedor.nombre}</span>}
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-base-content/40">
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Creado: {fmtFecha(imp.creadaEn)}</span>
                {imp.fechaPedido  && <span>Pedido: {fmtFecha(imp.fechaPedido)}</span>}
                {imp.fechaLlegada && <span>Llegada: {fmtFecha(imp.fechaLlegada)}</span>}
              </div>
            </div>

            {/* Acciones rápidas */}
            <div className="flex gap-2 flex-wrap shrink-0">
              {imp.estado !== 'RECIBIDO' && (
                <button
                  className="btn btn-sm btn-success gap-1"
                  onClick={handleMarcarRecibido}
                  disabled={marcandoRecibido}
                >
                  <PackageCheck className="w-3.5 h-3.5" /> Llegó
                </button>
              )}
              <Link
                href={`/herramientas/calculadora-contenedor?cargar=${imp.id}`}
                className="btn btn-sm btn-outline gap-1"
              >
                <Calculator className="w-3.5 h-3.5" /> Gastos
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Sección de tracking */}
      {imp.trackingActivo || imp.numContenedor || imp.blNumber ? (
        <div className="card bg-base-100 shadow-sm border border-base-200">
          <div className="card-body p-5">

            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" /> Seguimiento
              </h2>
              <button
                className="btn btn-sm btn-outline gap-2"
                onClick={handleActualizar}
                disabled={actualizando}
              >
                <RefreshCw className={`w-4 h-4 ${actualizando ? 'animate-spin' : ''}`} />
                {actualizando ? 'Consultando…' : 'Actualizar ahora'}
              </button>
            </div>

            {/* ETA desde DB */}
            {imp.etaEstimada && (
              <div className="alert alert-info py-2 mb-3 text-sm">
                🎯 ETA estimada: <strong>{fmtFecha(imp.etaEstimada)}</strong>
              </div>
            )}

            {/* Último estado guardado (antes de actualizar) */}
            {!eventos && imp.ultimoEstadoTracking && (
              <div className="bg-base-200 rounded-lg p-3 mb-3 text-sm">
                <span className="text-base-content/50 text-xs">Último estado conocido</span>
                <p className="font-medium mt-0.5">{imp.ultimoEstadoTracking}</p>
                {imp.ultimoTrackingCheck && (
                  <p className="text-xs text-base-content/40 mt-1">
                    Comprobado {fmtDatetime(imp.ultimoTrackingCheck)}
                  </p>
                )}
              </div>
            )}

            {/* Sin número de tracking */}
            {!imp.numContenedor && !imp.blNumber && (
              <div className="alert alert-warning text-sm py-2">
                <AlertTriangle className="w-4 h-4" />
                Este contenedor no tiene número de contenedor ni BL asignado.
              </div>
            )}

            {/* Error */}
            {errorTracking && (
              <div className="alert alert-error text-sm py-2 mb-3">{errorTracking}</div>
            )}

            {/* Tabla de eventos */}
            {eventos !== null && eventos.length > 0 && (
              <>
                {ultimaConsulta && (
                  <p className="text-xs text-base-content/40 mb-2">
                    Datos de Yang Ming — consultado {fmtDatetime(ultimaConsulta)}
                  </p>
                )}
                <div className="overflow-x-auto">
                  <table className="table table-sm w-full">
                    <thead>
                      <tr>
                        <th>Fecha / Hora</th>
                        <th>Evento</th>
                        <th>Ubicación</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eventos.map((e, i) => (
                        <tr key={i} className={i === 0 ? 'bg-primary/5 font-semibold' : ''}>
                          <td className="whitespace-nowrap text-xs">
                            {e.occurrenceDatetime ? fmtDatetime(e.occurrenceDatetime) : '—'}
                          </td>
                          <td>{e.status}</td>
                          <td className="text-xs text-base-content/60">{e.location || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Sin eventos */}
            {eventos !== null && eventos.length === 0 && (
              <div className="text-center py-6 text-base-content/40">
                <Ship className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Sin eventos disponibles aún.</p>
                <p className="text-xs mt-1">Yang Ming puede tardar unas horas en actualizar.</p>
              </div>
            )}

            {/* Cargando */}
            {actualizando && !eventos && (
              <div className="flex justify-center py-8">
                <span className="loading loading-spinner loading-md" />
              </div>
            )}

          </div>
        </div>
      ) : null}

    </div>
  );
}
