"use client";
import React, { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { PlusCircle, Edit, Trash2, User } from 'lucide-react';
import Link from 'next/link';

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function GestionClientes() {
  const [formData, setFormData] = useState({ id: null, nombre: '', email: '', direccion: '', telefono: '', categoria: '' }); // <-- AÑADIDO: categoria
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState(null);

  const { data: clientes, error: clientesError, isLoading } = useSWR('/api/clientes', fetcher);

  const openModal = (cliente = null) => {
    if (cliente) {
      setFormData({ id: cliente.id, nombre: cliente.nombre, email: cliente.email || '', direccion: cliente.direccion || '', telefono: cliente.telefono || '', categoria: cliente.categoria || '' }); // <-- AÑADIDO: categoria
    } else {
      setFormData({ id: null, nombre: '', email: '', direccion: '', telefono: '', categoria: '' }); // <-- AÑADIDO: categoria
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const url = formData.id ? `/api/clientes/${formData.id}` : '/api/clientes';
    const method = formData.id ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Error al guardar el cliente');
      }

      mutate('/api/clientes'); // Revalida el cache de SWR
      closeModal();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('¿Estás seguro de que quieres eliminar este cliente?')) {
      try {
        const res = await fetch(`/api/clientes/${id}`, { method: 'DELETE' });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.message || 'Error al eliminar el cliente');
        }
        mutate('/api/clientes'); // Revalida el cache
      } catch (err) {
        alert(err.message); // Usar un modal sería mejor
      }
    }
  };

  if (isLoading) return <div className="flex justify-center items-center h-screen"><span className="loading loading-spinner loading-lg"></span></div>;
  if (clientesError) return <div className="text-red-500 text-center">Error al cargar los clientes.</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 flex items-center"><User className="mr-2" /> Gestión de Clientes</h1>
      
      <button onClick={() => openModal()} className="btn btn-primary mb-6">
        <PlusCircle className="w-4 h-4" /> Nuevo Cliente
      </button>

      <div className="overflow-x-auto bg-base-100 shadow-xl rounded-lg">
        <table className="table w-full">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Categoría</th> {/* <-- NUEVA COLUMNA */}
              <th>Email</th>
              <th>Teléfono</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clientes && clientes.map((cliente) => (
              <tr key={cliente.id} className="hover">
                <td>
                  <Link href={`/gestion/clientes/${cliente.id}`} className="link link-primary font-bold">
                    {cliente.nombre}
                  </Link>
                </td>
                <td><span className="badge badge-outline">{cliente.categoria || 'NORMAL'}</span></td> {/* <-- NUEVA CELDA */}
                <td>{cliente.email}</td>
                <td>{cliente.telefono}</td>
                <td className="flex gap-2">
                  <button onClick={() => openModal(cliente)} className="btn btn-sm btn-outline btn-info">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(cliente.id)} className="btn btn-sm btn-outline btn-error">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal para Crear/Editar Cliente */}
      {isModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">{formData.id ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
            <form onSubmit={handleSubmit} className="py-4 space-y-4">
              <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} placeholder="Nombre" className="input input-bordered w-full" required />
              
              {/* Selector de Categoría (NUEVO) */}
              <select name="categoria" value={formData.categoria} onChange={handleChange} className="select select-bordered w-full">
                <option value="">Selecciona Categoría</option>
                <option value="FABRICANTE">FABRICANTE</option>
                <option value="INTERMEDIARIO">INTERMEDIARIO</option>
                <option value="CLIENTE FINAL">CLIENTE FINAL</option>
                <option value="NORMAL">NORMAL</option>
              </select>

              <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Email" className="input input-bordered w-full" />
              <input type="text" name="direccion" value={formData.direccion} onChange={handleChange} placeholder="Dirección" className="input input-bordered w-full" />
              <input type="tel" name="telefono" value={formData.telefono} onChange={handleChange} placeholder="Teléfono" className="input input-bordered w-full" />
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <div className="modal-action">
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
