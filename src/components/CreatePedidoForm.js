"use client";
import React, { useState, useCallback } from 'react';
import useSWR, { mutate } from 'swr';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Save, Calculator } from 'lucide-react'; 

const fetcher = (url) => fetch(url).then((res) => res.json());

// Helper para calcular el precio de un solo item
const calculatePriceForSingleItem = async (clienteId, item) => {
    if (!clienteId || !item.productId || (item.quantity || 0) <= 0) {
        // Retorna el precio actual si no se puede calcular
        return item.unitPrice; 
    }
    
    try {
        const res = await fetch('/api/pricing/calculate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                clienteId, 
                items: [{
                    productId: item.productId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    description: item.description
                }] 
            }),
        });

        if (!res.ok) {
             console.error("Error calculating price on item selection:", await res.json());
             return item.unitPrice; 
        }

        const [calculatedItem] = await res.json();
        return calculatedItem.unitPrice;

    } catch (error) {
        console.error('Error en cálculo de precio instantáneo:', error);
        return item.unitPrice;
    }
}

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

  const handleRecalculatePrices = async (targetClienteId = clienteId) => {
    if (!targetClienteId) {
      alert("Por favor, selecciona un cliente primero.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const itemsToCalculate = items
                                .filter(item => (item.quantity || 0) > 0)
                                .map(item => ({
                                  productId: item.productId,
                                  quantity: item.quantity,
                                  unitPrice: item.unitPrice,
                                  description: item.description
                                }));
                                
      if (itemsToCalculate.length === 0) {
        setError('No hay ítems válidos para recalcular.');
        setIsLoading(false);
        return;
      }

      const res = await fetch('/api/pricing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clienteId: targetClienteId, items: itemsToCalculate }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Error al recalcular precios");
      }
      const calculatedItems = await res.json();
      
      const updatedItems = items.map(item => {
        const matchedItem = calculatedItems.find(calcItem => calcItem.description === item.description);
        if (matchedItem) {
            return { ...item, unitPrice: matchedItem.unitPrice };
        }
        return item;
      });

      setItems(updatedItems);
      setError(null);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };


  const handleItemChange = async (index, field, value) => {
    const newItems = [...items];
    const item = newItems[index];
    
    let newPrice = item.unitPrice;

    if (field === 'plantillaId') {
        const plantilla = plantillas.find(p => p.id === value);
        if (plantilla) {
          item.description = plantilla.nombre;
          item.productId = plantilla.id;
          item.unitPrice = plantilla.precioUnitario; 
          
          if (clienteId && item.quantity > 0) {
              newPrice = await calculatePriceForSingleItem(clienteId, { ...item, productId: plantilla.id });
          } else {
              newPrice = plantilla.precioUnitario;
          }
        } else {
             item.productId = null;
             newPrice = 0;
        }
    } else if (field === 'unitPrice') {
      newPrice = parseFloat(parseFloat(value).toFixed(2)) || 0;
    } else {
      item[field] = value;
    }
    
    // Si se cambia la cantidad con un producto y cliente, recalcular el precio.
    if ((field === 'quantity') && item.productId && clienteId) {
        newPrice = await calculatePriceForSingleItem(clienteId, item);
    }
    
    item.unitPrice = newPrice;
    setItems(newItems);
  };
  
  // Manejar el cambio de clienteId en el selector principal
  const handleClienteChange = async (newClienteId) => {
    setClienteId(newClienteId);
    if (newClienteId) {
        // Forzar recalculo de precios para todos los items
        await handleRecalculatePrices(newClienteId);
    }
  }


  const addItem = () => {
    setItems([...items, { plantilladId: '', description: '', quantity: 1, unitPrice: 0, productId: null }]);
  };

  const removeItem = (index) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };
  
  const calculateTotals = useCallback(() => {
    const subtotal = items.reduce((acc, item) => acc + ((parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)), 0);
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

    const { subtotal: finalSubtotal, tax: finalTax, total: finalTotal } = calculateTotals();
    
    if (!clienteId) {
        setError('Debe seleccionar un cliente.');
        setIsLoading(false);
        return;
    }

    const orderData = {
      clienteId,
      items: items.map(item => ({
        ...item,
        productId: item.productId || null,
        unitPrice: parseFloat((item.unitPrice || 0).toFixed(2)), 
      })),
      notes,
      subtotal: finalSubtotal,
      tax: finalTax,
      total: finalTotal,
      estado: 'Pendiente' 
    };

    const url = '/api/pedidos'; 
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

      mutate('/api/pedidos');
      router.push(`/pedidos/${savedOrder.id}`);

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
            onChange={(e) => handleClienteChange(e.target.value)} 
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
                    <td><input type="text" value={item.description || ''} onChange={(e) => handleItemChange(index, 'description', e.target.value)} className="input input-bordered input-sm w-full" /></td>
                    <td><input type="number" value={item.quantity || ''} onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)} className="input input-bordered input-sm w-20" /></td>
                    <td><input type="number" step="0.01" value={item.unitPrice || ''} onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)} className="input input-bordered input-sm w-24" /></td>
                    <td>{((item.quantity || 0) * (item.unitPrice || 0)).toFixed(2)} €</td>
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
            <button type="button" onClick={() => handleRecalculatePrices()} className="btn btn-outline btn-accent btn-sm mt-4" disabled={isLoading || !clienteId}>
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
