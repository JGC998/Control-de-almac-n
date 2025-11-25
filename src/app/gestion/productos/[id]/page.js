"use client";
import React, { useState } from 'react';
import { useParams, notFound } from 'next/navigation';
import useSWR, { mutate } from 'swr';
import Link from 'next/link';
import { ArrowLeft, Package, DollarSign, Ruler, Factory, Layers, MinusCircle, FileText, Upload, Trash2 } from 'lucide-react';

const fetcher = (url) => fetch(url).then((res) => res.json());

const InfoCard = ({ title, value, unit = '', icon: Icon = Package }) => (
  <div className="flex items-center p-4 bg-base-200 rounded-lg shadow-inner">
    <Icon className="w-5 h-5 mr-3 text-primary" />
    <div>
      <div className="text-sm font-medium text-gray-500">{title}</div>
      <div className="text-lg font-semibold">{value} {unit}</div>
    </div>
  </div>
);

// --- NUEVO COMPONENTE PARA LA GESTIÓN DE DOCUMENTOS ---
function DocumentosProducto({ productoId, documentos }) {
  const [file, setFile] = useState(null);
  const [referencia, setReferencia] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !referencia) {
      setError('Se requiere un archivo y una referencia.');
      return;
    }

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('fileUpload', file);
    formData.append('productoId', productoId);
    formData.append('referencia', referencia);
    formData.append('tipo', 'PLANO'); // Tipo fijo para este contexto

    try {
      const res = await fetch('/api/documentos', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error al subir el archivo.');
      }

      // Limpiar formulario y refrescar datos
      setFile(null);
      setReferencia('');
      e.target.reset(); // Resetea el input de archivo
      mutate(`/api/productos/${productoId}`); // Refresca los datos del producto
    } catch (err) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleDelete = async (docId) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este documento? Esta acción es irreversible.')) {
      return;
    }
    try {
      const res = await fetch(`/api/documentos/${docId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error al eliminar');
      }
      mutate(`/api/productos/${productoId}`);
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <div className="mt-8">
      <div className="divider">Documentación Técnica / Planos</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* --- Lista de Documentos --- */}
        <div className="card bg-base-200 p-4">
          <h3 className="text-lg font-semibold mb-2">Archivos Asociados</h3>
          {documentos && documentos.length > 0 ? (
            <ul className="space-y-2">
              {documentos.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between p-2 bg-base-100 rounded-md">
                  <div className="flex items-center">
                    <FileText className="w-4 h-4 mr-2" />
                    <a href={doc.rutaArchivo} target="_blank" rel="noopener noreferrer" className="link link-primary">
                      {doc.referencia}
                    </a>
                  </div>
                  <button onClick={() => handleDelete(doc.id)} className="btn btn-xs btn-ghost text-error">
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No hay documentos asociados a este producto.</p>
          )}
        </div>

        {/* --- Formulario de Subida --- */}
        <div className="card bg-base-200 p-4">
          <h3 className="text-lg font-semibold mb-2">Subir Nuevo Documento</h3>
          <form onSubmit={handleUpload} className="space-y-3">
            <div>
              <label className="label">Referencia / Nombre del Plano</label>
              <input
                type="text"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                className="input input-bordered w-full"
                placeholder="Ej: Plano de corte v2"
                required
              />
            </div>
            <div>
              <label className="label">Archivo (PDF, PNG, JPG)</label>
              <input
                type="file"
                onChange={handleFileChange}
                className="file-input file-input-bordered w-full"
                accept=".pdf,.png,.jpg,.jpeg"
                required
              />
            </div>
            <button type="submit" className="btn btn-primary w-full" disabled={isUploading}>
              {isUploading ? <span className="loading loading-spinner"></span> : <Upload className="w-4 h-4 mr-2" />}
              Subir Archivo
            </button>
            {error && <p className="text-error text-sm mt-2">{error}</p>}
          </form>
        </div>
      </div>
    </div>
  );
}


export default function ProductoDetallePage() {
  const params = useParams();
  const { id } = params;

  const { data: producto, error, isLoading } = useSWR(id ? `/api/productos/${id}` : null, fetcher);
  const { data: documentos = [], isLoading: docsLoading } = useSWR(id ? `/api/documentos?productoId=${id}` : null, fetcher);


  if (isLoading || docsLoading) return <div className="flex justify-center items-center h-screen"><span className="loading loading-spinner loading-lg"></span></div>;
  if (error || !producto) {
      if (error?.status === 404) return notFound();
      return <div className="text-red-500 text-center">Error al cargar los detalles del producto.</div>;
  }
  
  const formatValue = (value, fallback = 'N/A') => {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'number') return value.toFixed(2);
    return value;
  };

  return (
    <div className="container mx-auto p-4">
      <Link href="/gestion/productos" className="btn btn-ghost mb-4">
        <ArrowLeft className="w-4 h-4" /> Volver a Productos
      </Link>
      
      <div className="bg-base-100 shadow-xl rounded-lg p-6">
        <div className="flex items-center mb-6">
          <Package className="w-8 h-8 mr-3 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">{producto.nombre}</h1>
            <p className="text-gray-500">Ref. Fabricante: {producto.referenciaFabricante || 'N/A'}</p>
          </div>
        </div>

        <div className="divider">Detalles Técnicos y de Costo</div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <InfoCard title="Material" value={producto.material?.nombre || 'N/A'} icon={Layers} />
          <InfoCard title="Fabricante" value={producto.fabricante?.nombre || 'N/A'} icon={Factory} />
          <InfoCard title="Espesor" value={producto.espesor || 'N/A'} unit="mm" icon={Ruler} />
          <InfoCard title="Peso Unitario" value={formatValue(producto.pesoUnitario, '0.00')} unit="kg" icon={MinusCircle} />
          <InfoCard title="Largo" value={producto.largo || 'N/A'} unit="mm" icon={Ruler} />
          <InfoCard title="Ancho" value={producto.ancho || 'N/A'} unit="mm" icon={Ruler} />
          <InfoCard 
            title="Precio Tarifa (€/m²)" 
            value={formatValue(producto.tarifaPrecioM2)} 
            unit="€" 
            icon={DollarSign} 
          />
          <InfoCard 
            title="Costo Total Pieza" 
            value={formatValue(producto.precioUnitario, '0.00')} 
            unit="€" 
            icon={DollarSign} 
          />
        </div>
        
        <div className="divider">Precios de Venta (Pre-calculados por Tier)</div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InfoCard 
            title="Precio FABRICANTE" 
            value={formatValue(producto.precioVentaFab)} 
            unit="€" 
            icon={DollarSign}
          />
          <InfoCard 
            title="Precio INTERMEDIARIO" 
            value={formatValue(producto.precioVentaInt)} 
            unit="€" 
            icon={DollarSign}
          />
          <InfoCard 
            title="Precio CLIENTE FINAL" 
            value={formatValue(producto.precioVentaFin)} 
            unit="€" 
            icon={DollarSign}
          />
        </div>

        <div className="divider">Documentación</div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* InfoCard con el conteo de documentos */}
          <InfoCard title="Documentos Asociados" value={documentos.length} unit="" icon={FileText} />

          {/* Enlace a la gestión de planos. Usamos justify-end y md:col-span-3 para alinear a la derecha. */}
          {documentos.length > 0 && (
            <div className="md:col-span-3 flex justify-end">
                <Link 
                  href={`/gestion/documentos?productoId=${id}`} 
                  className="btn btn-secondary self-end"
                >
                  Ver Planos Asociados ({documentos.length})
                </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
