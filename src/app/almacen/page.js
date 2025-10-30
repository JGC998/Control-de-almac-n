'use client';

import React, { useState, useEffect } from 'react';

const AlmacenPage = () => {
  const [stock, setStock] = useState([]);
  const [filteredStock, setFilteredStock] = useState([]);
  const [filters, setFilters] = useState({
    material: '',
    espesor: '',
    proveedor: '',
    ubicacion: '',
  });

  useEffect(() => {
    // Fetch stock data from /api/almacen-stock
    const fetchStock = async () => {
      try {
        const response = await fetch('/api/almacen-stock');
        if (!response) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setStock(data);
        setFilteredStock(data);
      } catch (error) {
        console.error("Error fetching stock data:", error);
        setStock([]);
        setFilteredStock([]);
      }
    };

    fetchStock();
  }, []);

  useEffect(() => {
    let currentStock = [...stock];

    if (filters.material) {
      currentStock = currentStock.filter(item =>
        item.material.toLowerCase().includes(filters.material.toLowerCase())
      );
    }
    if (filters.espesor) {
      currentStock = currentStock.filter(item =>
        item.espesor.toLowerCase().includes(filters.espesor.toLowerCase())
      );
    }
    if (filters.proveedor) {
      currentStock = currentStock.filter(item =>
        item.proveedor.toLowerCase().includes(filters.proveedor.toLowerCase())
      );
    }
    if (filters.ubicacion) {
      currentStock = currentStock.filter(item =>
        item.ubicacion.toLowerCase().includes(filters.ubicacion.toLowerCase())
      );
    }

    setFilteredStock(currentStock);
  }, [filters, stock]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prevFilters => ({
      ...prevFilters,
      [name]: value,
    }));
  };

  const saveStockToApi = async (updatedStock) => {
    try {
      const response = await fetch('/api/stock-management', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedStock),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      console.log("Stock data saved successfully!");
    } catch (error) {
      console.error("Error saving stock data:", error);
      alert("Error al guardar los datos de stock.");
    }
  };

  const handleDarDeBaja = async (id) => {
    const itemToUpdate = stock.find(item => item.id === id);
    if (!itemToUpdate) return;

    if (!window.confirm(`¿Estás seguro de que quieres dar de baja completamente la bobina de ${itemToUpdate.material} (${itemToUpdate.espesor})? Esta acción la eliminará del almacén.`)) {
      return; // User cancelled
    }

    const updatedStock = stock.filter(item => item.id !== id); // Remove the item entirely

    setStock(updatedStock);
    setFilteredStock(updatedStock); // Update filtered stock immediately
    await saveStockToApi(updatedStock);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Visualización de Almacén</h1>

      <div className="mb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <input
          type="text"
          name="material"
          placeholder="Filtrar por Material"
          className="input input-bordered w-full"
          value={filters.material}
          onChange={handleFilterChange}
        />
        <input
          type="text"
          name="espesor"
          placeholder="Filtrar por Espesor"
          className="input input-bordered w-full"
          value={filters.espesor}
          onChange={handleFilterChange}
        />
        <input
          type="text"
          name="proveedor"
          placeholder="Filtrar por Proveedor"
          className="input input-bordered w-full"
          value={filters.proveedor}
          onChange={handleFilterChange}
        />
        <input
          type="text"
          name="ubicacion"
          placeholder="Filtrar por Ubicación"
          className="input input-bordered w-full"
          value={filters.ubicacion}
          onChange={handleFilterChange}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="table w-full table-zebra">
          <thead>
            <tr>
              <th>Material</th>
              <th>Espesor</th>
              <th>Metros Disponibles</th>
              <th>Proveedor</th>
              <th>Ubicación</th>
              <th>Fecha de Entrada</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredStock.map((item) => (
              <tr key={item.id}>
                <td>{item.material}</td>
                <td>{item.espesor}</td>
                <td>{item.metrosDisponibles}</td>
                <td>{item.proveedor}</td>
                <td>{item.ubicacion}</td>
                <td>{new Date(item.fechaEntrada).toLocaleDateString('es-ES')}</td>
                <td>
                  <button
                    onClick={() => handleDarDeBaja(item.id)}
                    className="btn btn-error btn-sm"
                  >
                    Dar de Baja
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filteredStock.length === 0 && (
        <p className="text-center text-gray-500 mt-4">No hay bobinas que coincidan con los filtros.</p>
      )}
    </div>
  );
};

export default AlmacenPage;
