"use client";
import React, { useState, useCallback } from 'react';
import useSWR from 'swr';
import { Plus, Trash2, Calculator } from 'lucide-react'; // CORREGIDO: Calculate -> Calculator

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function CalculadoraPrecios() {
  const [clienteId, setClienteId] = useState('');
  const [items, setItems] = useState([{ productId: '', quantity: 1, unitPrice: 0 }]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [calculatedItems, setCalculatedItems] = useState([]);

  // Cargar datos para los selectores
  const { data: clientes, error: clientesError } = useSWR('/api/clientes', fetcher);
  const { data: plantillas, error: plantillasError } = useSWR('/api/plantillas', fetcher);

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    const item = newItems[index];

    if (field === 'productId') {
      const plantilla = plantillas.find(p => p.id === value);
      if (plantilla) {
        item.description = plantilla.nombre;
        item.unitPrice = plantilla.precioUnitario;
        item.productId = plantilla.id;
      } else {
         item.description = 'Item manual';
         item.unitPrice = 0;
         item.productId = '';
      }
    } else {
      item[field] = value;
    }
    
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { productId: '', description: '', quantity: 1, unitPrice: 0 }]);
  };

  const removeItem = (index) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const handleCalculatePrices = async () => {
    if (!clienteId) {
      alert("Por favor, selecciona un cliente primero.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setCalculatedItems([]);
    try {
      const res = await fetch('/api/pricing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clienteId, items }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Error al recalcular precios");
      }
      const newCalculatedItems = await res.json();
      setCalculatedItems(newCalculatedItems);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Calculadora de Precios</h1>

      <div className="card bg-base-100 shadow-xl mb-6">
        <div className="card-body">
          <h2 className="card-title">Cliente</h2>
          {clientesError && <div className="text-red-500">Error al cargar clientes.</div>}
          <select 
            className="select select-bordered w-full" 
            value={clienteId} 
            onChange={(e) => setClienteId(e.target.value)} 
            required
          >
            <option value="">Selecciona un cliente</option>
            {clientes?.map(cliente => (
              <option key={cliente.id} value={cliente.id}>{cliente.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex justify-between items-center mb-4">
            <h2 className="card-title">Items a Calcular</h2>
            <button type="button" onClick={addItem} className="btn btn-primary btn-sm">
              <Plus className="w-4 h-4" /> Añadir Item
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Cantidad</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {plantillasError && <tr><td colSpan="3" className="text-red-500">Error al cargar productos.</td></tr>}
                {items.map((item, index) => (
                  <tr key={index}>
                    <td>
                      <select 
                        className="select select-bordered select-sm w-full max-w-xs" 
                        value={item.productId || ''} 
                        onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                      >
                        <option value="">Selecciona producto</option>
                        {plantillas?.map(p => (
                          <option key={p.id} value={p.id}>{p.nombre}</option>
                        ))}
                      </select>
                    </td>
                    <td><input type="number" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)} className="input input-bordered input-sm w-20" /></td>
                    <td>
                      <button type="button" onClick={() => removeItem(index)} className="btn btn-ghost btn-sm btn-circle">
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" onClick={handleCalculatePrices} className="btn btn-accent btn-wide mt-4" disabled={isLoading || !clienteId}>
            {/* CORREGIDO: Calculate -> Calculator */}
            {isLoading ? <span className="loading loading-spinner"></span> : <Calculator className="w-4 h-4" />}
            Calcular Precios
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error shadow-lg mt-4">{error}</div>}

      {calculatedItems.length > 0 && (
        <div className="card bg-base-100 shadow-xl mt-6">
            <div className="card-body">
                <h2 className="card-title">Resultados</h2>
                <div className="overflow-x-auto">
                    <table className="table w-full">
                        <thead>
                            <tr>
                                <th>Descripción</th>
                                <th>Cantidad</th>
                                <th>Precio Unit. Calculado</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {calculatedItems.map((item, index) => (
                                <tr key={index}>
                                    <td>{item.description}</td>
                                    <td>{item.quantity}</td>
                                    <td className="font-bold text-success">{item.unitPrice.toFixed(2)} €</td>
                                    <td>{(item.quantity * item.unitPrice).toFixed(2)} €</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
