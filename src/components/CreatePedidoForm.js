"use client";
import React, { useState, useCallback } from 'react';
import useSWR, { mutate } from 'swr';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Save, Calculator } from 'lucide-react'; // Corregido: Calculate -> Calculator

const fetcher = (url) => fetch(url).then((res) => res.json());

// Este es un formulario nuevo, simplificado para crear Pedidos directamente
export default function CreatePedidoForm() {
  const router = useRouter();
  const [clienteId, setClienteId] = useState('');
  const [items, setItems] = useState([{ plantilladId: '', description: '', quantity: 1, unitPrice: 0, productId: null }]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const { data: clientes, error: clientesError } = useSWR('/api/clientes', fetcher);
  const { data: plantillas, error: plantillasError } = useSWR('/api/plantillas', fetcher);
  // Cargar configuración (para IVA)
  const { data: config } = useSWR('/api/config', fetcher);

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    const item = newItems[index];

    if (field === 'plantillaId') {
      const plantilla = plantillas.find(p => p.id === value);
      if (plantilla) {
        item.description = plantilla.nombre;
        item.unitPrice = plantilla.precioUnitario;
        item.productId = plantilla.id;
      }
    } else {
      item[field] = value;
    }
    
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { plantilladId: '', description: '', quantity: 1, unitPrice: 0, productId: null }]);
  };

  const removeItem = (index) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };
  
  const handleRecalculatePrices = async () => {
    if (!clienteId) {
      alert("Por favor, selecciona un cliente primero.");
      return;
    }
    setIsLoading(true);
    try {
      // Formatear items para la API: solo necesita productId y quantity para recalcular
      const itemsToCalculate = items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        description: item.description, // Incluir para que la API lo devuelva
        unitPrice: item.unitPrice,     // Incluir el precio actual como fallback
      }));
      
      const res = await fetch('/api/pricing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clienteId, items: itemsToCalculate }), // Usamos itemsToCalculate
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Error al recalcular precios");
      }
      const calculatedItems = await res.json();
      
      // Actualizamos los items con los precios nuevos de la API
      setItems(calculatedItems.map(item => ({
        // Mantener la estructura interna del formulario, solo actualizar unitPrice y description si viene de la API
        ...item,
        plantilladId: item.productId, // Mapeo para el selector (aunque se recomienda usar productId directamente)
        unitPrice: item.unitPrice,
      })));
      
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTotals = useCallback(() => {
    const subtotal = items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
    // Usar IVA de la config, con fallback a 0.21
    const ivaRate = config?.iva_rate ? parseFloat(config.iva_rate) : 0.21;
    const tax = subtotal * ivaRate;
    const total = subtotal + tax;
    return { subtotal, tax, total, ivaRate };
  }, [items, config]);

  const { subtotal, tax, total, ivaRate } = calculateTotals();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const { subtotal, tax, total } = calculateTotals();
    const orderData = {
      clienteId,
      items: items.map(item => ({
        // La API de Pedidos espera: description, quantity, unitPrice, pesoUnitario, productId
        ...item,
        description: item.description || '',
        pesoUnitario: 0, // Se asume 0 para pedidos directos sin cálculo de peso.
      })),
      notes,
      subtotal,
      tax,
      total,
      estado: 'Pendiente' // Estado por defecto
    };

    const url = '/api/pedidos'; // Apunta a la API de Pedidos
    const method = 'POST';

    try {
      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Error al guardar el pedido');
      }
      
      const savedOrder = await res.json();

      mutate('/api/pedidos'); // Limpia cache de la lista de pedidos
      router.push(`/pedidos/${savedOrder.id}`); // Redirige al nuevo pedido

    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Información del Cliente</h2>
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
            <h2 className="card-title">Items</h2>
            <button type="button" onClick={addItem} className="btn btn-primary btn-sm">
              <Plus className="w-4 h-4" /> Añadir Item
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Plantilla</th>
                  <th>Descripción</th>
                  <th>Cantidad</th>
                  <th>Precio Unit.</th>
                  <th>Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {plantillasError && <tr><td colSpan="6" className="text-red-500">Error al cargar plantillas.</td></tr>}
                {items.map((item, index) => (
                  <tr key={index}>
                    <td>
                      <select 
                        className="select select-bordered select-sm w-full max-w-xs" 
                        value={item.plantilladId || ''} 
                        onChange={(e) => handleItemChange(index, 'plantillaId', e.target.value)}
                      >
                        <option value="">Manual</option>
                        {plantillas?.map(p => (
                          <option key={p.id} value={p.id}>{p.nombre}</option>
                        ))}
                      </select>
                    </td>
                    <td><input type="text" value={item.description} onChange={(e) => handleItemChange(index, 'description', e.target.value)} className="input input-bordered input-sm w-full" /></td>
                    <td><input type="number" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)} className="input input-bordered input-sm w-20" /></td>
                    <td><input type="number" step="0.01" value={item.unitPrice} onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)} className="input input-bordered input-sm w-24" /></td>
                    <td>{(item.quantity * item.unitPrice).toFixed(2)} €</td>
                    <td>
                      <button type="button" onClick={() => removeItem(index)} className="btn btn-ghost btn-sm btn-circle">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
            <button type="button" onClick={handleRecalculatePrices} className="btn btn-outline btn-accent btn-sm mt-4" disabled={isLoading}>
                <Calculator className="w-4 h-4" /> Recalcular Precios (según cliente)
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Notas</h2>
            <textarea 
              className="textarea textarea-bordered h-24" 
              placeholder="Notas adicionales..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            ></textarea>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Resumen</h2>
            <div className="space-y-2">
              <div className="flex justify-between"><span>Subtotal</span> <span>{subtotal.toFixed(2)} €</span></div>
              <div className="flex justify-between"><span>IVA (${(ivaRate * 100).toFixed(0)}%)</span> <span>{tax.toFixed(2)} €</span></div>
              <div className="flex justify-between font-bold text-lg"><span>Total</span> <span>{total.toFixed(2)} €</span></div>
            </div>
          </div>
        </div>
      </div>
      
      {error && <div className="alert alert-error shadow-lg">{error}</div>}

      <div className="flex justify-end gap-4 mt-6">
        <button type="button" onClick={() => router.back()} className="btn btn-ghost" disabled={isLoading}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={isLoading}>
          <Save className="w-4 h-4" /> {isLoading ? "Guardando..." : "Guardar Pedido"}
        </button>
      </div>
    </form>
  );
}
