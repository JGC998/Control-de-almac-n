"use client";
import React, { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { Settings, PlusCircle, Trash2, Edit, DollarSign } from 'lucide-react';
import Link from 'next/link'; // Importar Link

const fetcher = (url) => fetch(url).then((res) => res.json());

const ReferenciasManager = () => {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [error, setError] = useState(null);

  const { data: referencias, error: refError, isLoading } = useSWR('/api/configuracion/referencias', fetcher);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch('/api/configuracion/referencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, descripcion }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Error al crear la referencia');
      }
      setNombre('');
      setDescripcion('');
      mutate('/api/configuracion/referencias');
    } catch (err) {
      setError(err.message);
    }
  };

  // (Faltaría lógica de Borrar/Editar, pero esto es un inicio)

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">Gestionar Referencias de Bobina</h2>
        
        <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
          <input 
            type="text" 
            placeholder="Nombre Ref. (ej: GOMA_NEGRA)" 
            className="input input-bordered w-full"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />
          <input 
            type="text" 
            placeholder="Descripción (opcional)" 
            className="input input-bordered w-full"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
          <button type="submit" className="btn btn-primary">
            <PlusCircle className="w-4 h-4" /> Añadir
          </button>
        </form>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        
        <div className="overflow-x-auto max-h-60">
          <table className="table table-sm w-full">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Descripción</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan="3"><span className="loading loading-spinner"></span></td></tr>}
              {refError && <tr><td colSpan="3" className="text-red-500">Error al cargar datos.</td></tr>}
              {referencias?.map(ref => (
                <tr key={ref.id} className="hover">
                  <td className="font-bold">{ref.nombre}</td>
                  <td>{ref.descripcion}</td>
                  <td className="flex gap-2">
                    <button className="btn btn-sm btn-outline btn-info" disabled><Edit className="w-4 h-4" /></button>
                    <button className="btn btn-sm btn-outline btn-error" disabled><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// --- AÑADIDO: Tarjeta para enlazar a la gestión de precios ---
const PreciosManagerCard = () => (
  <div className="card bg-base-100 shadow-xl">
    <div className="card-body">
      <h2 className="card-title">Reglas de Precios</h2>
      <p>Gestionar los márgenes, descuentos y precios especiales que usa la API.</p>
      <div className="card-actions justify-end">
        <Link href="/configuracion/precios" className="btn btn-primary">
          <DollarSign className="w-4 h-4" /> Ir a Gestión de Precios
        </Link>
      </div>
    </div>
  </div>
);


export default function ConfiguracionPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 flex items-center"><Settings className="mr-2" /> Configuración</h1>
      
      <div className="space-y-6">
        <PreciosManagerCard /> {/* <-- AÑADIDO */}
        <ReferenciasManager />
        {/* Aquí se podrían añadir más componentes de configuración */}
      </div>
    </div>
  );
}
