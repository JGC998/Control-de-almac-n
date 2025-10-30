'use client';

import React, { useState, useEffect } from 'react';

const ContenedoresPage = () => {
  const [containers, setContainers] = useState([]);
  const [newContainer, setNewContainer] = useState({
    id: '',
    eta: '',
    estado: 'En Tránsito',
    historialPuertos: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
      const response = await fetch('/api/contenedores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newContainer),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      setNewContainer({ id: '', eta: '', estado: 'En Tránsito', historialPuertos: [] });
      fetchContainers(); // Refresh the list
    } catch (err) {
      console.error("Error adding container:", err);
      setError("No se pudo añadir el contenedor.");
    }
  };

  if (loading) return <div className="text-center p-4">Cargando contenedores...</div>;
  if (error) return <div className="text-center p-4 text-red-500">{error}</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Seguimiento de Contenedores</h1>

      <div className="mb-8 p-6 bg-base-200 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold mb-4">Añadir Nuevo Contenedor</h2>
        <form onSubmit={handleAddContainer} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">
              <span className="label-text">ID del Contenedor</span>
            </label>
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
            <label className="label">
              <span className="label-text">Fecha Estimada de Llegada (ETA)</span>
            </label>
            <input
              type="date"
              name="eta"
              value={newContainer.eta}
              onChange={handleInputChange}
              className="input input-bordered w-full"
              required
            />
          </div>
          <div>
            <label className="label">
              <span className="label-text">Estado</span>
            </label>
            <select
              name="estado"
              value={newContainer.estado}
              onChange={handleInputChange}
              className="select select-bordered w-full"
            >
              <option>En Tránsito</option>
              <option>En Puerto</option>
              <option>Entregado</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <button type="submit" className="btn btn-primary w-full">
              Añadir Contenedor
            </button>
          </div>
        </form>
      </div>

      <div className="overflow-x-auto">
        <h2 className="text-2xl font-semibold mb-4">Contenedores Actuales</h2>
        {containers.length === 0 ? (
          <p className="text-center text-gray-500">No hay contenedores registrados.</p>
        ) : (
          <table className="table w-full table-zebra">
            <thead>
              <tr>
                <th>ID</th>
                <th>ETA</th>
                <th>Estado</th>
                <th>Historial de Puertos</th>
              </tr>
            </thead>
            <tbody>
              {containers.map((container) => (
                <tr key={container.id}>
                  <td>{container.id}</td>
                  <td>{container.eta}</td>
                  <td>{container.estado}</td>
                  <td>
                    {container.historialPuertos && container.historialPuertos.length > 0 ? (
                      <ul className="list-disc list-inside">
                        {container.historialPuertos.map((port, index) => (
                          <li key={index}>
                            {port.nombre} ({port.fechaLlegada || 'N/A'} - {port.fechaSalida || 'N/A'})
                          </li>
                        ))}
                      </ul>
                    ) : 'N/A'}
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
