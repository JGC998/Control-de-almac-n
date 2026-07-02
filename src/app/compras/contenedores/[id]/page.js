"use client";
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import Link from 'next/link';
import { fetcher } from '@/lib/fetcher';
import {
  ArrowLeft, RefreshCw, MapPin, Package, Calendar,
  Ship, PackageCheck, Calculator, AlertTriangle, Anchor, Navigation,
} from 'lucide-react';

// Coordenadas de los principales puertos en rutas China–España
// Clave: portCode (UN/LOCODE, primeros 2 chars = país ISO)
const PORT_COORDS = {
  // China
  CNNBO: { lat: 29.873, lon: 121.549, nombre: 'Ningbo'    },
  CNSHA: { lat: 31.222, lon: 121.651, nombre: 'Shanghai'  },
  CNQIN: { lat: 36.087, lon: 120.358, nombre: 'Qingdao'   },
  CNYTN: { lat: 22.557, lon: 114.265, nombre: 'Yantian'   },
  CNSZN: { lat: 22.557, lon: 114.265, nombre: 'Shenzhen'  },
  CNSHK: { lat: 22.488, lon: 113.897, nombre: 'Shekou'    },
  CNGZH: { lat: 23.107, lon: 113.260, nombre: 'Guangzhou' },
  CNTXG: { lat: 39.001, lon: 117.723, nombre: 'Tianjin'   },
  CNXMN: { lat: 24.480, lon: 118.080, nombre: 'Xiamen'    },
  CNNGB: { lat: 29.873, lon: 121.549, nombre: 'Ningbo'    },
  CNTNJ: { lat: 39.001, lon: 117.723, nombre: 'Tianjin'   },
  CNDAL: { lat: 38.916, lon: 121.631, nombre: 'Dalian'    },
  CNNSA: { lat: 22.488, lon: 113.897, nombre: 'Shekou'    },
  HKHKG: { lat: 22.289, lon: 114.158, nombre: 'Hong Kong' },
  TWKHH: { lat: 22.614, lon: 120.273, nombre: 'Kaohsiung' },
  // Sudeste asiático
  SGSIN: { lat: 1.265,  lon: 103.820, nombre: 'Singapur'        },
  MYPKG: { lat: 3.000,  lon: 101.400, nombre: 'Port Klang'      },
  MYTPP: { lat: 1.363,  lon: 103.549, nombre: 'Tanjung Pelepas' },
  LKCMB: { lat: 6.935,  lon: 79.858,  nombre: 'Colombo'         },
  VNHPH: { lat: 20.861, lon: 106.679, nombre: 'Hai Phong'       },
  VNSGN: { lat: 10.783, lon: 106.700, nombre: 'Ho Chi Minh'     },
  // Sur de Asia / Golfo
  INNHV: { lat: 18.949, lon: 72.950,  nombre: 'Nhava Sheva'     },
  SAJED: { lat: 21.485, lon: 39.170,  nombre: 'Jeddah'          },
  AEJEA: { lat: 25.048, lon: 55.140,  nombre: 'Jebel Ali'       },
  OMMCT: { lat: 23.618, lon: 58.574,  nombre: 'Muscat'          },
  PKPQG: { lat: 25.003, lon: 66.990,  nombre: 'Karachi'         },
  // Mediterráneo / Europa
  EGPSD: { lat: 31.267, lon: 32.301,  nombre: 'Port Said'       },
  MAPTM: { lat: 35.889, lon: -5.498,  nombre: 'Tanger Med'      },
  ESALG: { lat: 36.140, lon: -5.452,  nombre: 'Algeciras'       },
  ESVLC: { lat: 39.432, lon: -0.316,  nombre: 'Valencia'        },
  ESBCN: { lat: 41.350, lon:  2.165,  nombre: 'Barcelona'       },
  ESMLN: { lat: 36.720, lon: -4.430,  nombre: 'Málaga'          },
  ESBIO: { lat: 43.360, lon: -3.050,  nombre: 'Bilbao'          },
  PTLEI: { lat: 41.186, lon: -8.700,  nombre: 'Leixões'         },
  PTLIS: { lat: 38.694, lon: -9.234,  nombre: 'Lisboa'          },
  FRLEH: { lat: 49.484, lon:  0.107,  nombre: 'Le Havre'        },
  NLRTM: { lat: 51.900, lon:  4.480,  nombre: 'Rotterdam'       },
  DEHAM: { lat: 53.557, lon:  9.966,  nombre: 'Hamburgo'        },
  GBFXT: { lat: 51.964, lon:  1.352,  nombre: 'Felixstowe'      },
  GBSOU: { lat: 50.897, lon: -1.404,  nombre: 'Southampton'     },
  ITGOA: { lat: 44.408, lon:  8.929,  nombre: 'Génova'          },
  GRPIR: { lat: 37.942, lon: 23.637,  nombre: 'Pireo'           },
  MTMLA: { lat: 35.900, lon: 14.512,  nombre: 'Malta'           },
  TRIZM: { lat: 38.440, lon: 27.143,  nombre: 'Izmir'           },
  BEANR: { lat: 51.233, lon:  4.400,  nombre: 'Amberes'         },
};

// Alias de nombres para puertos con múltiples denominaciones
const PORT_ALIASES = {
  SHEKOU: 'CNSHK', 'SHEK KOU': 'CNSHK',
  YANTIAN: 'CNYTN', 'CHIWAN': 'CNSZN',
  NANSHA: 'CNNSA', 'GUANGZHOU NANSHA': 'CNNSA',
  NINGBO: 'CNNBO', SHANGHAI: 'CNSHA',
  QINGDAO: 'CNQIN', TIANJIN: 'CNTXG',
  XINGANG: 'CNTXG', DALIAN: 'CNDAL',
  XIAMEN: 'CNXMN', 'HONG KONG': 'HKHKG',
  KAOHSIUNG: 'TWKHH', SINGAPORE: 'SGSIN',
  'PORT KLANG': 'MYPKG', KLANG: 'MYPKG',
  COLOMBO: 'LKCMB', JEDDAH: 'SAJED',
  'JEBEL ALI': 'AEJEA', ALGECIRAS: 'ESALG',
  VALENCIA: 'ESVLC', BARCELONA: 'ESBCN',
  ROTTERDAM: 'NLRTM', HAMBURG: 'DEHAM',
  'LE HAVRE': 'FRLEH', FELIXSTOWE: 'GBFXT',
  'PORT SAID': 'EGPSD', 'TANGER MED': 'MAPTM',
  TANGIER: 'MAPTM', LEIXOES: 'PTLEI',
  PIRAEUS: 'GRPIR', GENOA: 'ITGOA',
  ANTWERP: 'BEANR', SOUTHAMPTON: 'GBSOU',
};

// Busca coordenadas por portCode o por nombre aproximado
function coordsParaPuerto(portCode, nombrePuerto) {
  if (portCode && PORT_COORDS[portCode.toUpperCase()]) {
    return PORT_COORDS[portCode.toUpperCase()];
  }
  if (!nombrePuerto) return null;
  const nombreUp = nombrePuerto.toUpperCase().trim();
  // Buscar en aliases exactos
  if (PORT_ALIASES[nombreUp]) {
    return PORT_COORDS[PORT_ALIASES[nombreUp]] ?? null;
  }
  // Buscar alias que contenga el nombre
  const aliasKey = Object.keys(PORT_ALIASES).find(a => nombreUp.includes(a) || a.includes(nombreUp.split(/[\s,-]/)[0]));
  if (aliasKey) return PORT_COORDS[PORT_ALIASES[aliasKey]] ?? null;
  // Fallback: coincidencia parcial en nombre del puerto
  return Object.values(PORT_COORDS).find(p =>
    nombreUp.includes(p.nombre.toUpperCase()) || p.nombre.toUpperCase().includes(nombreUp.split(/[\s,-]/)[0])
  ) ?? null;
}

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

  const [actualizando, setActualizando]     = useState(false);
  const [eventos, setEventos]               = useState(null);
  const [scheduleBarco, setScheduleBarco]   = useState(null);
  const [errorTracking, setErrorTracking]   = useState(null);
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
      setScheduleBarco(data.scheduleBarco ?? null);
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
                <p className="text-xs mt-1">
                  {['MSCU','MEDU','MSDU','MSKL','MSXU'].includes((imp?.numContenedor || '').slice(0,4).toUpperCase())
                    ? 'MSC puede tardar unas horas en actualizar.'
                    : 'La naviera puede tardar unas horas en actualizar.'}
                </p>
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

      {/* Sección: Posición del barco */}
      {scheduleBarco?.puertos?.length > 0 && (
        <div className="card bg-base-100 shadow-sm border border-base-200 mt-4">
          <div className="card-body p-5">
            <h2 className="font-bold text-lg flex items-center gap-2 mb-3">
              <Navigation className="w-5 h-5 text-secondary" />
              {scheduleBarco.vesselName ?? scheduleBarco.vesselCode ?? 'Barco'}
              <span className="text-base-content/40 text-sm font-normal">— escalas</span>
            </h2>

            {/* Timeline de escalas */}
            <div className="space-y-1 mb-4">
              {scheduleBarco.puertos.map((p, i) => {
                const confirmado = !!p.ata;
                const esCurrent  = p.esPosicionActual;
                const fecha      = confirmado ? p.ata : p.eta;
                return (
                  <div key={i} className={`flex items-start gap-3 py-2 px-3 rounded-lg ${esCurrent ? 'bg-secondary/10 border border-secondary/30' : confirmado ? 'opacity-60' : ''}`}>
                    <div className="flex flex-col items-center mt-0.5">
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${esCurrent ? 'bg-secondary' : confirmado ? 'bg-success' : 'bg-base-300'}`} />
                      {i < scheduleBarco.puertos.length - 1 && <div className="w-0.5 h-4 bg-base-300 mt-1" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-medium text-sm ${esCurrent ? 'text-secondary' : ''}`}>
                          {p.puerto}
                          {p.pais && <span className="text-base-content/40 font-normal"> ({p.pais})</span>}
                        </span>
                        {esCurrent && <span className="badge badge-secondary badge-xs">Última posición</span>}
                        {confirmado && !esCurrent && <span className="badge badge-success badge-xs">Confirmado</span>}
                      </div>
                      {fecha && (
                        <p className="text-xs text-base-content/50 mt-0.5">
                          {confirmado ? 'ATA' : 'ETA'}: {fmtFecha(fecha)}
                          {p.etd && <span className="ml-2">ETD: {fmtFecha(p.etd)}</span>}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mapa OpenStreetMap del puerto actual */}
            {(() => {
              const pActual = scheduleBarco.puertos.find(p => p.esPosicionActual)
                ?? scheduleBarco.puertos.findLast(p => p.ata)
                ?? null;
              const coords = pActual ? coordsParaPuerto(pActual.portCode, pActual.puerto) : null;
              if (!coords) return null;
              const { lat, lon, nombre } = coords;
              const delta = 0.4;
              const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lon-delta},${lat-delta},${lon+delta},${lat+delta}&layer=mapnik&marker=${lat},${lon}`;
              return (
                <div className="mt-2">
                  <p className="text-xs text-base-content/40 mb-1 flex items-center gap-1">
                    <Anchor className="w-3 h-3" /> {nombre}
                  </p>
                  <div className="rounded-xl overflow-hidden border border-base-300" style={{ height: 260 }}>
                    <iframe
                      title={`Mapa puerto ${nombre}`}
                      src={mapUrl}
                      width="100%"
                      height="260"
                      style={{ border: 0, display: 'block' }}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <p className="text-xs text-base-content/30 mt-1 text-right">
                    © <a href="https://www.openstreetmap.org" target="_blank" rel="noopener noreferrer" className="underline">OpenStreetMap</a>
                  </p>
                </div>
              );
            })()}
          </div>
        </div>
      )}

    </div>
  );
}
