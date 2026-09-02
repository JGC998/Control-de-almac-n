"use client";
import React, { useState, useRef } from 'react';
import { useParams, notFound, useRouter } from 'next/navigation';
import useSWR, { mutate as globalMutate } from 'swr';
import Link from 'next/link';
import { ArrowLeft, Package, DollarSign, Tag, Info, List, Edit, QrCode, TrendingUp, Trash2, Camera, X, ZoomIn, Printer, FileText, ExternalLink, Ruler } from 'lucide-react';
import { toastError, toast } from '@/lib/toast';
import { useConfirmacion } from '@/componentes/ui/ModalConfirmacion';
import ModalEditarProducto from '@/componentes/modales/ModalEditarProducto';

const InfoCard = ({ title, value, unit = '', icon: Icon = Package }) => (
  <div className="flex items-center p-4 bg-base-200 rounded-lg shadow-inner">
    <Icon className="w-5 h-5 mr-3 text-primary" />
    <div>
      <div className="text-sm font-medium text-base-content/50">{title}</div>
      <div className="text-lg font-semibold">{value} {unit}</div>
    </div>
  </div>
);

function HistorialCostos({ productoId }) {
  const { data: historial = [], isLoading } = useSWR(`/api/productos/${productoId}/historial-costos`);
  if (isLoading) return <div className="flex justify-center py-4"><span className="loading loading-spinner loading-sm" /></div>;
  if (!historial.length) return <p className="text-sm text-base-content/50 italic">Sin cambios de coste registrados.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="table table-xs w-full">
        <thead>
          <tr>
            <th>Fecha</th>
            <th className="text-right">Antes</th>
            <th className="text-right">Después</th>
            <th className="text-right">Variación</th>
            <th>Fuente</th>
          </tr>
        </thead>
        <tbody>
          {historial.map((h) => {
            const variacion = h.costoAntes != null ? h.costoDespues - h.costoAntes : null;
            const pct = h.costoAntes ? ((variacion / h.costoAntes) * 100).toFixed(1) : null;
            return (
              <tr key={h.id} className="hover">
                <td className="font-mono text-xs">{new Date(h.creadoEn).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                <td className="text-right font-mono">{h.costoAntes != null ? `${h.costoAntes.toFixed(4)} €` : '—'}</td>
                <td className="text-right font-mono font-semibold">{h.costoDespues.toFixed(4)} €</td>
                <td className={`text-right font-mono text-xs ${variacion > 0 ? 'text-error' : variacion < 0 ? 'text-success' : ''}`}>
                  {variacion != null ? `${variacion > 0 ? '+' : ''}${variacion.toFixed(4)} €${pct ? ` (${variacion > 0 ? '+' : ''}${pct}%)` : ''}` : '—'}
                </td>
                <td><span className="badge badge-ghost badge-sm">{h.fuente}</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Tarjeta de foto individual (plantilla o troquel)
function TarjetaFoto({ productoId, tipo, ruta, onActualizar }) {
  const inputRef = useRef(null);
  const inputCamaraRef = useRef(null);
  const [subiendo, setSubiendo] = useState(false);
  const [fotoAmpliada, setFotoAmpliada] = useState(false);
  const { confirmar, ModalConfirmacion } = useConfirmacion();

  const etiqueta = tipo === 'plantilla' ? 'Foto Plantilla' : 'Foto Troquel';

  const handleSeleccionArchivo = async (e) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setSubiendo(true);
    try {
      const form = new FormData();
      form.append('tipo', tipo);
      form.append('archivo', archivo);
      const res = await fetch(`/api/productos/${productoId}/fotos`, { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) { toastError(data.message || 'Error al subir la foto'); return; }
      toast(`${etiqueta} guardada`);
      onActualizar();
    } catch {
      toastError('Error al subir la foto');
    } finally {
      setSubiendo(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleEliminar = async () => {
    const ok = await confirmar({ titulo: `¿Eliminar ${etiqueta}?`, mensaje: 'Se borrará del servidor.', variante: 'peligro' });
    if (!ok) return;
    try {
      const res = await fetch(`/api/productos/${productoId}/fotos?tipo=${tipo}`, { method: 'DELETE' });
      if (!res.ok) { toastError('Error al eliminar la foto'); return; }
      toast(`${etiqueta} eliminada`);
      onActualizar();
    } catch {
      toastError('Error al eliminar la foto');
    }
  };

  return (
    <>
      <ModalConfirmacion />
      {fotoAmpliada && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setFotoAmpliada(false)}
        >
          <button className="absolute top-4 right-4 btn btn-circle btn-ghost text-white" onClick={() => setFotoAmpliada(false)}>
            <X className="w-6 h-6" />
          </button>
          <img
            src={ruta}
            alt={etiqueta}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      <div className="card bg-base-100 border border-base-200 shadow">
        <div className="card-body p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Camera className="w-4 h-4 text-primary" />
              {etiqueta}
            </h4>
            {ruta && (
              <div className="flex gap-1">
                <button className="btn btn-xs btn-ghost" onClick={() => setFotoAmpliada(true)} title="Ampliar">
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button className="btn btn-xs btn-ghost text-error" onClick={handleEliminar} title="Eliminar foto">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {ruta ? (
            <div
              className="cursor-pointer overflow-hidden rounded-lg bg-base-200 w-full"
              style={{ aspectRatio: '16/9' }}
              onClick={() => setFotoAmpliada(true)}
            >
              <img
                src={ruta}
                alt={etiqueta}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
              />
            </div>
          ) : (
            <div
              className="rounded-lg border-2 border-dashed border-base-300 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary hover:bg-base-200 transition-colors w-full"
              style={{ aspectRatio: '16/9' }}
              onClick={() => !subiendo && inputRef.current?.click()}
            >
              <Camera className="w-8 h-8 text-base-content/30" />
              <span className="text-sm text-base-content/40">Sin foto</span>
              <span className="text-xs text-base-content/30">Click para subir</span>
            </div>
          )}

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleSeleccionArchivo}
          />
          <input
            ref={inputCamaraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleSeleccionArchivo}
          />

          <div className="flex gap-2 mt-2">
            <button
              className="btn btn-sm btn-outline btn-primary flex-1 gap-1"
              onClick={() => inputCamaraRef.current?.click()}
              disabled={subiendo}
            >
              {subiendo
                ? <><span className="loading loading-spinner loading-xs" /> Subiendo...</>
                : <><Camera className="w-3.5 h-3.5" /> Hacer foto</>
              }
            </button>
            <button
              className="btn btn-sm btn-outline flex-1 gap-1"
              onClick={() => inputRef.current?.click()}
              disabled={subiendo}
            >
              <ZoomIn className="w-3.5 h-3.5" /> {ruta ? 'Cambiar' : 'Galería'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// Tarjeta de plano técnico (PDF → convertido a PNG en el servidor)
function TarjetaPlano({ productoId, ruta, onActualizar }) {
  const inputRef = useRef(null);
  const [subiendo, setSubiendo] = useState(false);
  const [fotoAmpliada, setFotoAmpliada] = useState(false);
  const { confirmar, ModalConfirmacion } = useConfirmacion();

  // Los nuevos planos son siempre PNG (convertidos por pdftoppm).
  // Los planos viejos guardados como PDF todavía se sirven como enlace.
  const esPDF = ruta ? ruta.toLowerCase().endsWith('.pdf') : false;

  const handleSeleccionArchivo = async (e) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setSubiendo(true);
    try {
      const form = new FormData();
      form.append('tipo', 'plano');
      form.append('archivo', archivo);
      const res = await fetch(`/api/productos/${productoId}/fotos`, { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) { toastError(data.message || 'Error al subir el plano'); return; }
      toast('Plano guardado');
      onActualizar();
    } catch {
      toastError('Error al subir el plano');
    } finally {
      setSubiendo(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleEliminar = async () => {
    const ok = await confirmar({ titulo: '¿Eliminar plano?', mensaje: 'Se borrará del servidor.', variante: 'peligro' });
    if (!ok) return;
    try {
      const res = await fetch(`/api/productos/${productoId}/fotos?tipo=plano`, { method: 'DELETE' });
      if (!res.ok) { toastError('Error al eliminar el plano'); return; }
      toast('Plano eliminado');
      onActualizar();
    } catch {
      toastError('Error al eliminar el plano');
    }
  };

  return (
    <>
      <ModalConfirmacion />

      {/* Lightbox para imagen de plano */}
      {fotoAmpliada && ruta && !esPDF && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setFotoAmpliada(false)}
        >
          <button className="absolute top-4 right-4 btn btn-circle btn-ghost text-white" onClick={() => setFotoAmpliada(false)}>
            <X className="w-6 h-6" />
          </button>
          <img
            src={ruta}
            alt="Plano técnico"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      <div className="card bg-base-100 border border-base-200 shadow">
        <div className="card-body p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Ruler className="w-4 h-4 text-secondary" />
              Plano técnico
            </h4>
            {ruta && (
              <div className="flex gap-1">
                {!esPDF && (
                  <button className="btn btn-xs btn-ghost" onClick={() => setFotoAmpliada(true)} title="Ampliar">
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                )}
                <button className="btn btn-xs btn-ghost text-error" onClick={handleEliminar} title="Eliminar plano">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {ruta ? (
            esPDF ? (
              /* Planos viejos guardados como PDF — mostrar como enlace */
              <a
                href={ruta}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 rounded-xl border-2 border-secondary/30 bg-secondary/5 hover:bg-secondary/10 hover:border-secondary/60 transition-colors p-5 cursor-pointer group"
              >
                <div className="shrink-0 w-14 h-14 rounded-xl bg-secondary/15 flex items-center justify-center group-hover:bg-secondary/25 transition-colors">
                  <FileText className="w-7 h-7 text-secondary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-secondary">Plano PDF</p>
                  <p className="text-xs text-secondary/70 mt-1 flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" /> Clic para abrir en nueva pestaña
                  </p>
                </div>
              </a>
            ) : (
              /* Planos nuevos convertidos a PNG — mostrar como imagen */
              <div
                className="cursor-pointer overflow-hidden rounded-lg bg-base-200 w-full"
                style={{ aspectRatio: '16/9' }}
                onClick={() => setFotoAmpliada(true)}
              >
                <img
                  src={ruta}
                  alt="Plano técnico"
                  className="w-full h-full object-contain hover:scale-105 transition-transform duration-200"
                />
              </div>
            )
          ) : (
            <div
              className="rounded-xl border-2 border-dashed border-base-300 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-secondary hover:bg-base-200 transition-colors"
              style={{ aspectRatio: '16/9' }}
              onClick={() => !subiendo && inputRef.current?.click()}
            >
              <Ruler className="w-10 h-10 text-base-content/25" />
              <span className="text-sm text-base-content/40">Sin plano</span>
              <span className="text-xs text-base-content/30">Click para subir PDF o imagen</span>
            </div>
          )}

          <input
            ref={inputRef}
            type="file"
            accept=".pdf,application/pdf,image/*"
            className="hidden"
            onChange={handleSeleccionArchivo}
          />

          <div className="flex gap-2 mt-2">
            <button
              className="btn btn-sm btn-outline btn-secondary flex-1 gap-1"
              onClick={() => inputRef.current?.click()}
              disabled={subiendo}
            >
              {subiendo
                ? <><span className="loading loading-spinner loading-xs" /> Convirtiendo...</>
                : <><Ruler className="w-3.5 h-3.5" /> {ruta ? 'Cambiar plano' : 'Subir plano'}</>
              }
            </button>
            {ruta && esPDF && (
              <a
                href={ruta}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm btn-outline gap-1"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Abrir
              </a>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default function ProductoDetallePage() {
  const params = useParams();
  const router = useRouter();
  const { id } = params;
  const { confirmar, ModalConfirmacion: ModalBorrarProducto } = useConfirmacion();

  const { data: producto, error, isLoading, mutate } = useSWR(id ? `/api/productos/${id}` : null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleDeleteProduct = async () => {
    const ok = await confirmar({ titulo: '¿Eliminar producto?', mensaje: 'Esta acción es irreversible.' });
    if (!ok) return;
    try {
      const res = await fetch(`/api/productos/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar producto');
      router.push('/gestion/productos');
    } catch (err) {
      toastError(err.message);
    }
  };

  if (isLoading) return <div className="flex justify-center items-center h-screen"><span className="loading loading-spinner loading-lg text-primary" /></div>;
  if (error || !producto) {
    if (error?.status === 404) return notFound();
    return <div className="text-error text-center p-10">Error al cargar los detalles del producto.</div>;
  }

  const formatValue = (value, fallback = 'N/A') => {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'number') return value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return value;
  };

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-5xl">
      <ModalBorrarProducto />
      <Link href="/gestion/productos" className="btn btn-ghost mb-6 gap-2">
        <ArrowLeft className="w-4 h-4" /> Volver al Catálogo
      </Link>

      <div className="bg-base-100 shadow-xl rounded-2xl overflow-hidden hover:shadow-2xl transition-shadow duration-300">

        {/* Cabecera del producto */}
        <div className="p-4 sm:p-8 bg-gradient-to-r from-base-100 to-base-200">
          <div className="flex flex-col gap-4">
            {/* Nombre + badges */}
            <div className="flex items-start gap-3">
              <div className="p-3 bg-primary/10 rounded-full shrink-0">
                <Package className="w-7 h-7 sm:w-10 sm:h-10 text-primary" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-4xl font-extrabold text-base-content leading-tight break-words">{producto.nombre}</h1>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {producto.color && <span className="badge badge-secondary badge-outline">{producto.color}</span>}
                  {producto.material?.nombre && <span className="badge badge-outline">{producto.material.nombre}</span>}
                  {producto.tieneTroquel && <span className="badge badge-accent badge-outline">Con troquel</span>}
                </div>
              </div>
            </div>
            {/* Precio + botones — en móvil ocupan ancho completo */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="text-xs text-base-content/60 uppercase font-bold tracking-wider">Precio</div>
                <div className="text-3xl sm:text-4xl font-mono font-bold text-primary">{formatValue(parseFloat(producto.precioUnitario))} €</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  href={`/api/productos/${id}/etiqueta`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm btn-outline btn-success gap-1 flex-1 sm:flex-none"
                >
                  <Printer className="w-4 h-4" /> Etiqueta
                </a>
                <button onClick={() => setIsEditModalOpen(true)} className="btn btn-sm btn-outline btn-info gap-1 flex-1 sm:flex-none">
                  <Edit className="w-4 h-4" /> Editar
                </button>
                <button onClick={handleDeleteProduct} className="btn btn-sm btn-outline btn-error gap-1 flex-1 sm:flex-none">
                  <Trash2 className="w-4 h-4" /> Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-8">

          {/* ── Fotos — lo primero visible al escanear QR desde el móvil ── */}
          <div className="divider text-base-content/50 font-semibold uppercase tracking-widest text-xs">
            <Camera className="w-4 h-4 inline mr-1" />
            Fotos de referencia
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
            <TarjetaFoto
              productoId={id}
              tipo="plantilla"
              ruta={producto.fotoPlantilla}
              onActualizar={mutate}
            />
            <TarjetaFoto
              productoId={id}
              tipo="troquel"
              ruta={producto.fotoTroquel}
              onActualizar={mutate}
            />
          </div>
          <div className="mb-6">
            <TarjetaPlano
              productoId={id}
              ruta={producto.fotoPlano}
              onActualizar={mutate}
            />
          </div>

          {/* ── Información general ── */}
          <div className="divider text-base-content/50 font-semibold uppercase tracking-widest text-xs">Información General</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-base-200/50 p-4 sm:p-6 rounded-xl">
              <h3 className="flex items-center gap-2 font-bold text-lg mb-4 text-secondary">
                <Info className="w-5 h-5" /> Detalles técnicos
              </h3>
              <div className="space-y-2 text-base-content/80 text-sm">
                {producto.subfamilia && (
                  <p>
                    <span className="font-semibold">Clasificación:</span>{' '}
                    <span
                      className="badge badge-sm font-medium"
                      style={producto.subfamilia.familia?.color ? {
                        backgroundColor: producto.subfamilia.familia.color + '22',
                        color: producto.subfamilia.familia.color,
                        borderColor: producto.subfamilia.familia.color + '55',
                      } : {}}
                    >
                      {producto.subfamilia.familia?.nombre} / {producto.subfamilia.nombre}
                    </span>
                  </p>
                )}
                {producto.referenciaFabricante && <p><span className="font-semibold">Ref. Fabricante:</span> {producto.referenciaFabricante}</p>}
                {producto.fabricante?.nombre && <p><span className="font-semibold">Fabricante:</span> {producto.fabricante.nombre}</p>}
                {producto.material?.nombre && <p><span className="font-semibold">Material:</span> {producto.material.nombre}</p>}
                {producto.espesor && <p><span className="font-semibold">Espesor:</span> {producto.espesor} mm</p>}
                {producto.ancho && <p><span className="font-semibold">Ancho:</span> {producto.ancho} mm</p>}
                {producto.largo && <p><span className="font-semibold">Largo:</span> {producto.largo} m</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 content-start">
              <InfoCard title="Precio Unitario" value={formatValue(parseFloat(producto.precioUnitario))} unit="€" icon={DollarSign} />
              <InfoCard title="Peso Unitario" value={formatValue(parseFloat(producto.pesoUnitario ?? 0))} unit="kg" icon={List} />
            </div>
          </div>

          {/* ── Historial de costos ── */}
          <div className="mt-4">
            <div className="divider">
              <TrendingUp className="w-4 h-4 inline mr-1" />
              Historial de Precio de Coste
            </div>
            <HistorialCostos productoId={id} />
          </div>
        </div>
      </div>

      <ModalEditarProducto
        producto={producto}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onUpdate={mutate}
      />
    </div>
  );
}
