"use client";
import React, { useState, useCallback } from 'react';
import useSWR, { mutate } from 'swr';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Save, Calculator } from 'lucide-react'; // Corregido a Calculator

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
    const tax = subtotal * 0.21; // TODO: Cargar IVA desde DB
    const total = subtotal + tax;
    return { subtotal, tax, total };
  }, [items]);

  const { subtotal, tax, total } = calculateTotals();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const { subtotal, tax, total } = calculateTotals();
    const orderData = {
      clienteId,
      items,
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
              <div className="flex justify-between"><span>IVA (21%)</span> <span>{tax.toFixed(2)} €</span></div>
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
EOF_PEDIDO_FORM'

# --- 2. Crear la nueva página 'src/app/pedidos/nuevo/page.js' ---
echo "Creando: src/app/pedidos/nuevo/page.js"
mkdir -p src/app/pedidos/nuevo # Crea el directorio si no existe
cat <<'EOF_PEDIDO_NUEVO_PAGE' > src/app/pedidos/nuevo/page.js
"use client";
import CreatePedidoForm from "@/components/CreatePedidoForm";
import { PackagePlus } from "lucide-react";

export default function NuevoPedidoPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 flex items-center">
        <PackagePlus className="mr-2" />
        Crear Nuevo Pedido
      </h1>
      <CreatePedidoForm />
    </div>
  );
}
EOF_PEDIDO_NUEVO_PAGE'

# --- 3. Modificar 'src/app/pedidos/page.js' para añadir el botón ---
echo "Modificando: src/app/pedidos/page.js"
cat <<'EOF_PEDIDOS_PAGE_MOD' > src/app/pedidos/page.js
"use client";
import React from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { Package, Search, PlusCircle } from 'lucide-react'; // Añadido PlusCircle

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function PedidosPage() {
  const { data: pedidos, error, isLoading } = useSWR('/api/pedidos', fetcher);

  if (isLoading) return <div className="flex justify-center items-center h-screen"><span className="loading loading-spinner loading-lg"></span></div>;
  if (error) return <div className="text-red-500 text-center">Error al cargar los pedidos.</div>;

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold flex items-center"><Package className="mr-2" /> Pedidos</h1>
        {/* --- AÑADIDO EL BOTÓN 'NUEVO PEDIDO' --- */}
        <Link href="/pedidos/nuevo" className="btn btn-primary">
          <PlusCircle className="w-4 h-4" /> Nuevo Pedido
        </Link>
      </div>
      
      <div className="overflow-x-auto bg-base-100 shadow-xl rounded-lg">
        <table className="table w-full">
          <thead>
            <tr>
              <th>Número</th>
              <th>Cliente</th>
              <th>Fecha</th>
              <th>Total</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pedidos && pedidos.map((order) => (
              <tr key={order.id} className="hover">
                <td>
                  <Link href={`/pedidos/${order.id}`} className="link link-primary font-bold">
                    {order.numero}
                  </Link>
                </td>
                <td>{order.cliente?.nombre || 'N/A'}</td>
                <td>{new Date(order.fechaCreacion).toLocaleDateString()}</td>
                <td>{order.total.toFixed(2)} €</td>
                <td>
                  <span className={`badge ${order.estado === 'Completado' ? 'badge-success' : (order.estado === 'Enviado' ? 'badge-info' : 'badge-warning')}`}>
                    {order.estado}
                  </span>
                </td>
                <td>
                  <Link href={`/pedidos/${order.id}`} className="btn btn-sm btn-outline">
                    Ver <Search className="w-4 h-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
EOF_PEDIDOS_PAGE_MOD'

echo "--- ¡Flujo de 'Nuevo Pedido' añadido! ---"
echo "He corregido el icono 'Calculator' en el formulario de pedido."
echo "Reinicia 'npm run dev' si es necesario y prueba a crear un pedido."


