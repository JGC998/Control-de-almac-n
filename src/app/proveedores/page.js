"use client";
import React, { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { Truck, PlusCircle, CheckSquare, PackageOpen } from 'lucide-react';

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function ProveedoresPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({ proveedor: '', material: '', bobinas: [{ precioMetro: 0, longitud: 0, ancho: 0, espesor: '' }] });

  const { data: pedidos, error: pedidosError, isLoading } = useSWR('/api/pedidos-proveedores-data', fetcher);

  const openModal = () => {
    setFormData({ proveedor: '', material: '', bobinas: [{ precioMetro: 0, longitud: 0, ancho: 0, espesor: '' }] });
    setError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleBobinaChange = (index, field, value) => {
    const newBobinas = [...formData.bobinas];
    newBobinas[index][field] = value;
    setFormData(prev => ({ ...prev, bobinas: newBobinas }));
  };

  const addBobina = () => {
    setFormData(prev => ({ ...prev, bobinas: [...prev.bobinas, { precioMetro: 0, longitud: 0, ancho: 0, espesor: '' }] }));
  };

  const removeBobina = (index) => {
    setFormData(prev => ({ ...prev, bobinas: prev.bobinas.filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch('/api/pedidos-proveedores-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Error al crear pedido');
      }
      mutate('/api/pedidos-proveedores-data');
      closeModal();
    } catch (err) {
      setError(err.message);
    }
  };
  
  const handleReceiveOrder = async (pedidoId) => {
     if (confirm('¿Estás seguro de que quieres recibir este pedido? Esto añadirá las bobinas al stock.')) {
        try {
             const res = await fetch('/api/stock-management/receive-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pedidoId }),
            });
             if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || 'Error al recibir el pedido');
            }
            mutate('/api/pedidos-proveedores-data'); // Revalida pedidos
            mutate('/api/almacen-stock'); // Revalida stock
            mutate('/api/movimientos'); // Revalida movimientos
        } catch (err) {
            alert(err.message);
        }
     }
  };

  if (isLoading) return <div className="flex justify-center items-center h-screen"><span className="loading loading-spinner loading-lg"></span></div>;
  if (pedidosError) return <div className="text-red-500 text-center">Error al cargar los pedidos a proveedores.</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 flex items-center"><Truck className="mr-2" /> Pedidos a Proveedores</h1>
      
      <button onClick={openModal} className="btn btn-primary mb-6">
        <PlusCircle className="w-4 h-4" /> Nuevo Pedido a Proveedor
      </button>

      <div className="space-y-4">
        {pedidos?.map(pedido => (
          <div key={pedido.id} className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="card-title">{pedido.proveedor} - {pedido.material}</h2>
                  <p>Fecha: {new Date(pedido.fecha).toLocaleDateString()}</p>
                  <span className={`badge ${pedido.estado === 'Recibido' ? 'badge-success' : 'badge-warning'}`}>{pedido.estado}</span>
                </div>
                {pedido.estado === 'Pendiente' && (
                  <button onClick={() => handleReceiveOrder(pedido.id)} className="btn btn-sm btn-success">
                    <CheckSquare className="w-4 h-4" /> Marcar como Recibido
                  </button>
                )}
              </div>
              <div className="overflow-x-auto mt-4">
                <table className="table table-sm w-full">
                  <thead>
                    <tr>
                      <th>Espesor</th>
                      <th>Ancho (m)</th>
                      <th>Longitud (m)</th>
                      <th>Precio/m</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pedido.bobinas.map(bobina => (
                      <tr key={bobina.id}>
                        <td>{bobina.espesor}</td>
                        <td>{bobina.ancho}</td>
                        <td>{bobina.longitud}</td>
                        <td>{bobina.precioMetro.toFixed(2)} €</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal para Nuevo Pedido */}
      {isModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box w-11/1VE max-w-3xl">
            <h3 className="font-bold text-lg">Nuevo Pedido a Proveedor</h3>
            <form onSubmit={handleSubmit} className="py-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" name="proveedor" value={formData.proveedor} onChange={handleChange} placeholder="Proveedor" className="input input-bordered w-full" required />
                <input type="text" name="material" value={formData.material} onChange={handleChange} placeholder="Material" className="input input-bordered w-full" required />
              </div>
              <h4 className="font-bold mt-4">Bobinas</h4>
              {formData.bobinas.map((bobina, index) => (
                <div key={index} className="grid grid-cols-2 md:grid-cols-5 gap-2 items-center">
                  <input type="text" value={bobina.espesor} onChange={(e) => handleBobinaChange(index, 'espesor', e.target.value)} placeholder="Espesor" className="input input-bordered input-sm w-full" />
                  <input type="number" step="0.01" value={bobina.ancho} onChange={(e) => handleBobinaChange(index, 'ancho', parseFloat(e.target.value))} placeholder="Ancho (m)" className="input input-bordered input-sm w-full" />
                  <input type="number" step="0.01" value={bobina.longitud} onChange={(e) => handleBobinaChange(index, 'longitud', parseFloat(e.target.value))} placeholder="Longitud (m)" className="input input-bordered input-sm w-full" />
                  <input type="number" step="0.01" value={bobina.precioMetro} onChange={(e) => handleBobinaChange(index, 'precioMetro', parseFloat(e.target.value))} placeholder="Precio/m" className="input input-bordered input-sm w-full" />
                  <button type="button" onClick={() => removeBobina(index)} className="btn btn-sm btn-error btn-outline">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button type="button" onClick={addBobina} className="btn btn-sm btn-outline">Añadir Bobina</button>
              
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <div className="modal-action">
                <button type="button" onClick={closeModal} className="btn">Cancelar</button>
                <button type="submit" className="btn btn-primary">Crear Pedido</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
