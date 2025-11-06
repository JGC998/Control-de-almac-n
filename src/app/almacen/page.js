"use client";
import React, { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { Warehouse, PlusCircle, ArrowRightLeft } from 'lucide-react';

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function AlmacenPage() {
  const [formData, setFormData] = useState({ material: '', espesor: '', metrosDisponibles: 0, proveedor: '', ubicacion: 'Almacén', stockMinimo: 100 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState(null);

  const { data: stock, error: stockError, isLoading: stockLoading } = useSWR('/api/almacen-stock', fetcher);
  const { data: movimientos, error: movError, isLoading: movLoading } = useSWR('/api/movimientos', fetcher);

  const isLoading = stockLoading || movLoading;

  const openModal = () => {
    setFormData({ material: '', espesor: '', metrosDisponibles: 0, proveedor: '', ubicacion: 'Almacén', stockMinimo: 100 });
    setError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch('/api/almacen-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          metrosDisponibles: parseFloat(formData.metrosDisponibles),
          stockMinimo: parseFloat(formData.stockMinimo)
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Error al añadir stock');
      }
      mutate('/api/almacen-stock'); // Revalida stock
      mutate('/api/movimientos'); // Revalida movimientos
      closeModal();
    } catch (err) {
      setError(err.message);
    }
  };

  if (isLoading) return <div className="flex justify-center items-center h-screen"><span className="loading loading-spinner loading-lg"></span></div>;
  if (stockError || movError) return <div className="text-red-500 text-center">Error al cargar datos del almacén.</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 flex items-center"><Warehouse className="mr-2" /> Gestión de Almacén</h1>
      
      <button onClick={openModal} className="btn btn-primary mb-6">
        <PlusCircle className="w-4 h-4" /> Añadir Stock Manual
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Inventario Actual</h2>
            <div className="overflow-x-auto max-h-96">
              {/*
                AQUÍ ESTÁ LA CORRECCIÓN:
                He compactado <thead>, <tr>, <tbody> y el map
                para eliminar cualquier nodo de texto de espacio en blanco
                que cause el error de hidratación de React.
              */}
              <table className="table table-pin-rows table-sm">
                <thead><tr>
                  <th>Material</th>
                  <th>Espesor</th>
                  <th>Metros Disp.</th>
                  <th>Stock Mín.</th>
                  <th>Proveedor</th>
                  <th>Ubicación</th>
                </tr></thead>
                <tbody>
                  {stock?.map(item => (
                    <tr key={item.id} className="hover">
                      <td className="font-bold">{item.material}</td>
                      <td>{item.espesor}</td>
                      <td>{item.metrosDisponibles.toFixed(2)} m</td>
                      <td>{item.stockMinimo ? `${item.stockMinimo.toFixed(2)} m` : 'N/A'}</td>
                      <td>{item.proveedor}</td>
                      <td>{item.ubicacion}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Movimientos Recientes</h2>
            <div className="overflow-y-auto max-h-96">
              <ul className="timeline timeline-vertical">
                {movimientos?.map((mov, index) => (
                  <li key={mov.id}>
                    {index > 0 && <hr />}
                    <div className="timeline-start">{new Date(mov.fecha).toLocaleDateString()}</div>
                    <div className="timeline-middle">
                      <ArrowRightLeft className="w-4 h-4" />
                    </div>
                    <div className="timeline-end timeline-box">
                      <p className="font-bold">{mov.tipo} ({mov.cantidad}m)</p>
                      <p className="text-xs">{mov.referencia}</p>
                    </div>
                    {index < movimientos.length - 1 && <hr />}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Modal para Añadir Stock */}
      {isModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Añadir Stock Manualmente</h3>
            <form onSubmit={handleSubmit} className="py-4 space-y-4">
              <input type="text" name="material" value={formData.material} onChange={handleChange} placeholder="Material" className="input input-bordered w-full" required />
              <input type="text" name="espesor" value={formData.espesor} onChange={handleChange} placeholder="Espesor" className="input input-bordered w-full" />
              <input type="number" step="0.01" name="metrosDisponibles" value={formData.metrosDisponibles} onChange={handleChange} placeholder="Metros Disponibles" className="input input-bordered w-full" required />
              <input type="number" step="0.01" name="stockMinimo" value={formData.stockMinimo} onChange={handleChange} placeholder="Stock Mínimo" className="input input-bordered w-full" required />
              <input type="text" name="proveedor" value={formData.proveedor} onChange={handleChange} placeholder="Proveedor" className="input input-bordered w-full" />
              <input type="text" name="ubicacion" value={formData.ubicacion} onChange={handleChange} placeholder="Ubicación" className="input input-bordered w-full" />
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <div className="modal-action">
                <button type="button" onClick={closeModal} className="btn">Cancelar</button>
                <button type="submit" className="btn btn-primary">Añadir</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
