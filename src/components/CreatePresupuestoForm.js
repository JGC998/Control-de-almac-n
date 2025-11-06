"use client";
import React, { useState, useEffect, useCallback } from 'react';
import useSWR, { mutate } from 'swr';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Save, Calculator } from 'lucide-react'; // <-- CORREGIDO AQUÍ

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function CreatePresupuestoForm({ initialData = null }) {
  const router = useRouter();
  const [clienteId, setClienteId] = useState(initialData?.clienteId || '');
  const [items, setItems] = useState(initialData?.items || []);
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Cargar datos necesarios para los selectores
  const { data: clientes, error: clientesError } = useSWR('/api/clientes', fetcher);
  const { data: plantillas, error: plantillasError } = useSWR('/api/plantillas', fetcher); // plantillas es alias de productos
  // Cargar configuración (para IVA)
  const { data: config } = useSWR('/api/config', fetcher);

  // Sincronizar estado si initialData cambia (para la página de edición)
  useEffect(() => {
    if (initialData) {
      setClienteId(initialData.clienteId || '');
      setItems(initialData.items || []);
      setNotes(initialData.notes || '');
    }
  }, [initialData]);

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    const item = newItems[index];

    if (field === 'plantillaId') {
      const plantilla = plantillas.find(p => p.id === value);
      if (plantilla) {
        item.description = plantilla.nombre;
        item.unitPrice = plantilla.precioUnitario;
        item.productId = plantilla.id; // Guardamos el ID del producto
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
      const res = await fetch('/api/pricing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clienteId, items }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Error al recalcular precios");
      }
      const calculatedItems = await res.json();
      // Actualizamos los items con los precios nuevos
      setItems(calculatedItems.map(item => ({
        ...item,
        unitPrice: item.unitPrice
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

    // Recalculamos por si acaso
    const { subtotal, tax, total } = calculateTotals();
    const quoteData = {
      clienteId,
      items,
      notes,
      subtotal,
      tax,
      total,
      estado: initialData?.estado || 'Borrador'
    };

    const url = initialData ? `/api/presupuestos/${initialData.id}` : '/api/presupuestos';
    const method = initialData ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quoteData),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Error al guardar el presupuesto');
      }
      
      const savedQuote = await res.json();

      // Limpiar cache de SWR
      mutate('/api/presupuestos');
      if(initialData) {
        mutate(`/api/presupuestos/${initialData.id}`);
      }

      // Redirigir a la página del presupuesto guardado
      router.push(`/presupuestos/${savedQuote.id}`);

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
                        <Trash2 className="w-4 h-4 text-red-500" />
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
          <Save className="w-4 h-4" /> {isLoading ? "Guardando..." : (initialData ? "Actualizar Presupuesto" : "Guardar Presupuesto")}
        </button>
      </div>
    </form>
  );
}
