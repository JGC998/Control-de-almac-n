"use client";
import React, { useState } from 'react';
import { useParams, notFound, useRouter } from 'next/navigation';
import useSWR, { mutate } from 'swr';
import Link from 'next/link';
import { ArrowLeft, Package, DollarSign, Tag, Info, List, FileText, Upload, Trash2, Edit } from 'lucide-react';


const InfoCard = ({ title, value, unit = '', icon: Icon = Package }) => (
  <div className="flex items-center p-4 bg-base-200 rounded-lg shadow-inner">
    <Icon className="w-5 h-5 mr-3 text-primary" />
    <div>
      <div className="text-sm font-medium text-gray-500">{title}</div>
      <div className="text-lg font-semibold">{value} {unit}</div>
    </div>
  </div>
);

// --- COMPONENTE PARA LA GESTIÓN DE DOCUMENTOS (Sin cambios funcionales, solo estilo si necesario) ---
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
    formData.append('tipo', 'PLANO');

    try {
      const res = await fetch('/api/documentos', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error al subir el archivo.');
      }

      setFile(null);
      setReferencia('');
      e.target.reset();
      mutate(`/api/documentos?productoId=${productoId}`);
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
      mutate(`/api/documentos?productoId=${productoId}`);
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <div className="mt-8">
      <div className="divider">Documentación Técnica</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

        <div className="card bg-base-200 p-4">
          <h3 className="text-lg font-semibold mb-2">Subir Nuevo Documento</h3>
          <form onSubmit={handleUpload} className="space-y-3">
            <div>
              <label className="label">Nombre del Documento</label>
              <input
                type="text"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                className="input input-bordered w-full"
                placeholder="Ej: Ficha técnica"
                required
              />
            </div>
            <div>
              <label className="label">Archivo</label>
              <input
                type="file"
                onChange={handleFileChange}
                className="file-input file-input-bordered w-full"
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

// Importar el modal de edición
import ModalEditarProducto from '@/componentes/modales/ModalEditarProducto';

// ... (código existente)

export default function ProductoDetallePage() {
  const params = useParams();
  const router = useRouter(); // <-- AÑADIDO: router
  const { id } = params;

  const { data: producto, error, isLoading, mutate } = useSWR(id ? `/api/productos/${id}` : null); // <-- AÑADIDO: mutate
  const { data: documentos = [], isLoading: docsLoading } = useSWR(id ? `/api/documentos?productoId=${id}` : null);

  // Estado para el modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const openEditModal = () => setIsEditModalOpen(true);
  const closeEditModal = () => setIsEditModalOpen(false);

  // Manejador de eliminación
  const handleDeleteProduct = async () => {
    if (!confirm('¿Estás seguro de que quieres eliminar este producto? Esta acción también eliminará documentos asociados.')) {
      return;
    }
    try {
      const res = await fetch(`/api/productos/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar producto');
      router.push('/gestion/productos');
    } catch (err) {
      alert(err.message);
    }
  };

  if (isLoading || docsLoading) return <div className="flex justify-center items-center h-screen"><span className="loading loading-spinner loading-lg text-primary"></span></div>;
  if (error || !producto) {
    if (error?.status === 404) return notFound();
    return <div className="text-error text-center p-10">Error al cargar los detalles del producto.</div>;
  }

  const formatValue = (value, fallback = 'N/A') => {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'number') return value.toFixed(2);
    return value;
  };

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <Link href="/gestion/productos" className="btn btn-ghost mb-6 gap-2">
        <ArrowLeft className="w-4 h-4" /> Volver al Catálogo
      </Link>

      <div className="bg-base-100 shadow-xl rounded-2xl overflow-hidden hover:shadow-2xl transition-shadow duration-300">
        <div className="p-8 bg-gradient-to-r from-base-100 to-base-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-primary/10 rounded-full">
                <Package className="w-10 h-10 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl font-extrabold text-base-content">{producto.nombre}</h1>
                <div className="flex gap-2 mt-2">
                  {producto.color && <span className="badge badge-secondary badge-outline">{producto.color}</span>}
                  {producto.material?.nombre && <span className="badge badge-outline">{producto.material.nombre}</span>}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-base-content/60 uppercase font-bold tracking-wider">Precio</div>
              <div className="text-4xl font-mono font-bold text-primary">{formatValue(parseFloat(producto.precioUnitario))} €</div>
              <div className="flex justify-end gap-2 mt-2">
                <button onClick={openEditModal} className="btn btn-sm btn-outline btn-info">
                  <Edit className="w-4 h-4" /> Editar
                </button>
                <button onClick={handleDeleteProduct} className="btn btn-sm btn-outline btn-error">
                  <Trash2 className="w-4 h-4" /> Eliminar
                </button>
              </div>
            </div>

            <ModalEditarProducto
              producto={producto}
              isOpen={isEditModalOpen}
              onClose={closeEditModal}
              onUpdate={mutate}
            />
          </div>
        </div>

        <div className="p-8">
          <div className="divider text-base-content/50 font-semibold uppercase tracking-widest text-xs">Información General</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="bg-base-200/50 p-6 rounded-xl">
              <h3 className="flex items-center gap-2 font-bold text-lg mb-4 text-secondary">
                <Info className="w-5 h-5" /> Detalles técnicos
              </h3>
              <div className="space-y-2 text-base-content/80 text-sm">
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
              <InfoCard title="Costo Unitario" value={formatValue(parseFloat(producto.costoUnitario ?? 0))} unit="€" icon={DollarSign} />
              <InfoCard title="Peso Unitario" value={formatValue(parseFloat(producto.pesoUnitario ?? 0))} unit="kg" icon={List} />
            </div>
          </div>

          <DocumentosProducto productoId={id} documentos={documentos} />
        </div>
      </div>
    </div>
  );
}
