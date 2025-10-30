'use client';

import React, { useState, useEffect } from 'react';

const ContenedoresPage = () => {
  const [containers, setContainers] = useState([]);
  const [newContainer, setNewContainer] = useState({ id: '', imo: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [trackingImo, setTrackingImo] = useState(null);

  useEffect(() => {
    fetchContainers();
  }, []);

  const fetchContainers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/contenedores');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setContainers(data);
    } catch (err) {
      console.error("Error fetching containers:", err);
      setError("No se pudieron cargar los contenedores.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewContainer(prev => ({ ...prev, [name]: value }));
  };

  const handleAddContainer = async (e) => {
    e.preventDefault();
    try {
      const containerToAdd = { ...newContainer, estado: 'En Tránsito' };
      const response = await fetch('/api/contenedores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(containerToAdd),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      setNewContainer({ id: '', imo: '' });
      fetchContainers(); // Refresh the list
    } catch (err) {
      console.error("Error adding container:", err);
      setError("No se pudo añadir el contenedor.");
    }
  };

  const handleMarkAsArrived = async (id) => {
    try {
      const response = await fetch('/api/contenedores', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      fetchContainers(); // Refresh the list
    } catch (err) {
      console.error("Error marking container as arrived:", err);
      alert("Error al actualizar el estado del contenedor.");
    }
  };

  const handleTrack = (imo) => {
    setTrackingImo(imo);
  };

  if (loading) return <div className="text-center p-4">Cargando contenedores...</div>;
  if (error) return <div className="text-center p-4 text-red-500">{error}</div>;

  const containersEnTransito = containers.filter(c => c.estado === 'En Tránsito');

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Seguimiento de Contenedores</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-1 p-6 bg-base-200 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">Añadir Nuevo Contenedor</h2>
          <form onSubmit={handleAddContainer} className="space-y-4">
            <div>
              <label className="label"><span className="label-text">ID del Contenedor</span></label>
              <input
                type="text"
                name="id"
                value={newContainer.id}
                onChange={handleInputChange}
                placeholder="Ej: MSCU1234567"
                className="input input-bordered w-full"
                required
              />
            </div>
            <div>
              <label className="label"><span className="label-text">Número IMO del Barco</span></label>
              <input
                type="text"
                name="imo"
                value={newContainer.imo}
                onChange={handleInputChange}
                placeholder="Ej: 9266891"
                className="input input-bordered w-full"
              />
            </div>
            <button type="submit" className="btn btn-primary w-full">Añadir Contenedor</button>
          </form>
        </div>

        <div className="lg:col-span-2 p-6 bg-base-100 rounded-lg shadow-md min-h-[600px]">
          <h2 className="text-2xl font-semibold mb-4">Mapa de Seguimiento</h2>
          {trackingImo ? (
            <iframe
              key={trackingImo}
              src={`https://www.vesselfinder.com/es/vessels/details/${trackingImo}`}
              className="w-full h-[550px] border-0 rounded-md"
              title="Vessel Finder Map"
            ></iframe>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p>Selecciona un contenedor de la lista para rastrearlo.</p>
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <h2 className="text-2xl font-semibold mb-4">Contenedores en Tránsito</h2>
        {containersEnTransito.length === 0 ? (
          <p className="text-center text-gray-500">No hay contenedores en tránsito.</p>
        ) : (
          <table className="table w-full table-zebra">
            <thead>
              <tr>
                <th>ID Contenedor</th>
                <th>Número IMO</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {containersEnTransito.map((container) => (
                <tr key={container.id}>
                  <td>{container.id}</td>
                  <td>{container.imo || 'N/A'}</td>
                  <td className="space-x-2">
                    {container.imo && (
                      <button onClick={() => handleTrack(container.imo)} className="btn btn-sm btn-outline btn-secondary">
                        Rastrear
                      </button>
                    )}
                    <button onClick={() => handleMarkAsArrived(container.id)} className="btn btn-sm btn-outline btn-success">
                      Marcar como Llegado
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ContenedoresPage;