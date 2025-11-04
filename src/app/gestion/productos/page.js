"use client";
import React, { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { PlusCircle, Edit, Trash2, Package } from 'lucide-react';

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function GestionProductos() {
  const [formData, setFormData] = useState({ 
    id: null, nombre: '', modelo: '', espesor: 0, largo: 0, ancho: 0, 
    precioUnitario: 0, pesoUnitario: 0, fabricante: '', material: '' 
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState(null);

  const { data: productos, error: productosError, isLoading: productosLoading } = useSWR('/api/productos', fetcher);
  const { data: fabricantes, error: fabError, isLoading: fabLoading } = useSWR('/api/fabricantes', fetcher);
  const { data: materiales, error: matError, isLoading: matLoading } = useSWR('/api/materiales', fetcher);

  const isLoading = productosLoading || fabLoading || matLoading;

  const openModal = (producto = null) => {
    if (producto) {
      setFormData({ 
        id: producto.id, nombre: producto.nombre, modelo: producto.modelo || '', 
        espesor: producto.espesor || 0, largo: producto.largo || 0, ancho: producto.ancho || 0, 
        precioUnitario: producto.precioUnitario || 0, pesoUnitario: producto.pesoUnitario || 0, 
        fabricante: producto.fabricante?.nombre || '', // Asume que el GET trae el objeto
        material: producto.material?.nombre || ''      // Asume que el GET trae el objeto
      });
    } else {
      setFormData({ 
        id: null, nombre: '', modelo: '', espesor: 0, largo: 0, ancho: 0, 
        precioUnitario: 0, pesoUnitario: 0, fabricante: '', material: '' 
      });
    }
    setError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSelectChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const url = formData.id ? `/api/productos/${formData.id}` : '/api/productos';
    const method = formData.id ? 'PUT' : 'POST';

    // Convertir a número antes de enviar
    const dataToSend = {
      ...formData,
      espesor: parseFloat(formData.espesor),
      largo: parseFloat(formData.largo),
      ancho: parseFloat(formData.ancho),
      precioUnitario: parseFloat(formData.precioUnitario),
      pesoUnitario: parseFloat(formData.pesoUnitario),
    };

    try {
      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Error al guardar el producto');
      }

      mutate('/api/productos'); // Revalida el cache
      closeModal();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('¿Estás seguro de que quieres eliminar este producto?')) {
      try {
        const res = await fetch(`/api/productos/${id}`, { method: 'DELETE' });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.message || 'Error al eliminar el producto');
        }
        mutate('/api/productos');
      } catch (err) {
        alert(err.message);
      }
    }
  };

  if (isLoading) return <div className="flex justify-center items-center h-screen"><span className="loading loading-spinner loading-lg"></span></div>;
  if (productosError || fabError || matError) return <div className="text-red-500 text-center">Error al cargar datos.</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 flex items-center"><Package className="mr-2" /> Gestión de Productos</h1>
      
      <button onClick={() => openModal()} className="btn btn-primary mb-6">
        <PlusCircle className="w-4 h-4" /> Nuevo Producto
      </button>

      <div className="overflow-x-auto bg-base-100 shadow-xl rounded-lg">
        <table className="table w-full">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Fabricante</th>
              <th>Material</th>
              <th>Precio Unit.</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {productos && productos.map((p) => (
              <tr key={p.id} className="hover">
                <td className="font-bold">{p.nombre}</td>
                <td>{p.fabricante?.nombre || 'N/A'}</td>
                <td>{p.material?.nombre || 'N/A'}</td>
                <td>{p.precioUnitario.toFixed(2)} €</td>
                <td className="flex gap-2">
                  <button onClick={() => openModal(p)} className="btn btn-sm btn-outline btn-info">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="btn btn-sm btn-outline btn-error">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal para Crear/Editar Producto */}
      {isModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box w-11/12 max-w-2xl">
            <h3 className="font-bold text-lg">{formData.id ? 'Editar Producto' : 'Nuevo Producto'}</h3>
            <form onSubmit={handleSubmit} className="py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} placeholder="Nombre" className="input input-bordered w-full md:col-span-2" required />
              <input type="text" name="modelo" value={formData.modelo} onChange={handleChange} placeholder="Modelo" className="input input-bordered w-full" />
              
              <select name="fabricante" value={formData.fabricante} onChange={handleSelectChange} className="select select-bordered w-full" required>
                <option value="">Selecciona Fabricante</option>
                {fabricantes?.map(f => <option key={f.id} value={f.nombre}>{f.nombre}</option>)}
              </select>
              
              <select name="material" value={formData.material} onChange={handleSelectChange} className="select select-bordered w-full" required>
                <option value="">Selecciona Material</option>
                {materiales?.map(m => <option key={m.id} value={m.nombre}>{m.nombre}</option>)}
              </select>
              
              <input type="number" step="0.01" name="precioUnitario" value={formData.precioUnitario} onChange={handleChange} placeholder="Precio Unitario" className="input input-bordered w-full" />
              <input type="number" step="0.01" name="pesoUnitario" value={formData.pesoUnitario} onChange={handleChange} placeholder="Peso Unitario" className="input input-bordered w-full" />
              <input type="number" step="0.01" name="espesor" value={formData.espesor} onChange={handleChange} placeholder="Espesor (mm)" className="input input-bordered w-full" />
              <input type="number" step="0.01" name="largo" value={formData.largo} onChange={handleChange} placeholder="Largo (m)" className="input input-bordered w-full" />
              <input type="number" step="0.01" name="ancho" value={formData.ancho} onChange={handleChange} placeholder="Ancho (m)" className="input input-bordered w-full" />
              
              {error && <p className="text-red-500 text-sm md:col-span-2">{error}</p>}
              
              <div className="modal-action md:col-span-2">
                <button type="button" onClick={closeModal} className="btn">Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
