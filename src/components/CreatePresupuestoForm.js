'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';

// --- SUB-COMPONENTS ---

function ItemRow({ item, onRemove, products, onUpdate, clienteId }) {

  const handleProductSelection = (newProductId) => {
    const product = products.find(p => p.id === newProductId);
    onUpdate(item.id, {
      productId: newProductId,
      description: product ? product.nombre : '',
    }, true); // Pass true to trigger price calculation
  };

  const handleQuantityChange = (newQuantity) => {
    onUpdate(item.id, {
      quantity: newQuantity,
    }, true); // Pass true to trigger price calculation
  };

  return (
    <div className="grid grid-cols-12 gap-2 items-center mb-2">
      <select
        className="select select-bordered col-span-5"
        value={item.productId}
        onChange={(e) => handleProductSelection(e.target.value)}
        disabled={!clienteId}
      >
        <option value="">Selecciona un producto</option>
        {products.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
      </select>
      <input 
        type="number" 
        value={item.quantity || 1} 
        onChange={(e) => handleQuantityChange(parseInt(e.target.value, 10))} 
        className="input input-bordered col-span-2" 
        disabled={!item.productId}
      />
      <div className="col-span-2 relative">
                  <input 
                    type="number" 
                    value={(item.unitPrice || 0).toFixed(2)} 
                    disabled 
                    className="input input-bordered w-full pr-8 bg-base-200"
                  />        {item.isPricingLoading && <span className="loading loading-spinner loading-xs absolute right-2 top-1/2 -translate-y-1/2"></span>}
      </div>
      <span className="col-span-2 text-right font-semibold">{((item.quantity || 1) * (item.unitPrice || 0)).toFixed(2)} €</span>
      <button type="button" onClick={() => onRemove(item.id)} className="btn btn-ghost btn-sm col-span-1">X</button>
    </div>
  );
}

function NewClientModal({ isOpen, onClose, onSave }) {
  const [newClient, setNewClient] = useState({ nombre: '', email: '', direccion: '', telefono: '' });
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!newClient.nombre) {
      alert('El nombre del cliente es obligatorio.');
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClient),
      });
      if (!res.ok) throw new Error('Error al guardar el cliente');
      const savedClient = await res.json();
      onSave(savedClient);
      onClose();
    } catch (error) {
      console.error("Error creating new client:", error);
      alert("No se pudo crear el cliente.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Crear Nuevo Cliente</h3>
        <div className="form-control py-2">
          <label className="label"><span className="label-text">Nombre</span></label>
          <input type="text" placeholder="Nombre completo" className="input input-bordered" value={newClient.nombre} onChange={e => setNewClient({...newClient, nombre: e.target.value})} />
        </div>
        <div className="form-control py-2">
          <label className="label"><span className="label-text">Email</span></label>
          <input type="email" placeholder="correo@ejemplo.com" className="input input-bordered" value={newClient.email} onChange={e => setNewClient({...newClient, email: e.target.value})} />
        </div>
        <div className="form-control py-2">
          <label className="label"><span className="label-text">Dirección</span></label>
          <input type="text" placeholder="Dirección completa" className="input input-bordered" value={newClient.direccion} onChange={e => setNewClient({...newClient, direccion: e.target.value})} />
        </div>
        <div className="form-control py-2">
          <label className="label"><span className="label-text">Teléfono</span></label>
          <input type="tel" placeholder="912345678" className="input input-bordered" value={newClient.telefono} onChange={e => setNewClient({...newClient, telefono: e.target.value})} />
        </div>
        <div className="modal-action">
          <button onClick={onClose} className="btn">Cancelar</button>
          <button onClick={handleSave} className={`btn btn-primary ${isSaving ? 'btn-disabled' : ''}`}>{isSaving ? 'Guardando...' : 'Guardar Cliente'}</button>
        </div>
      </div>
    </div>
  );
}


// --- MAIN FORM COMPONENT ---

export default function CreatePresupuestoForm({ clients: initialClients, products, presupuestoToEdit, ivaRate = 0.21 }) {
  const router = useRouter();
  const [clients, setClients] = useState(initialClients);
  const [clienteId, setClienteId] = useState('');
  const [items, setItems] = useState([]);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('idle');
  const [clientSearch, setClientSearch] = useState('');
  const [isClientModalOpen, setClientModalOpen] = useState(false);
  const [isCalculatingPrice, setIsCalculatingPrice] = useState(0);

  const isEditing = !!presupuestoToEdit;

  useEffect(() => {
    if (isEditing) {
      const client = clients.find(c => c.id === presupuestoToEdit.clienteId);
      setClienteId(presupuestoToEdit.clienteId);
      setClientSearch(client ? client.nombre : '');
      setItems(presupuestoToEdit.items.map(item => ({ ...item, id: uuidv4() })));
      setNotes(presupuestoToEdit.notes || '');
    }
  }, [presupuestoToEdit, isEditing, clients]);

  const getCalculatedPrice = useCallback(async (itemId, itemToCalculate) => {
    setIsCalculatingPrice(prev => prev + 1);

    if (!itemToCalculate || !itemToCalculate.productId || !clienteId || !itemToCalculate.quantity) {
      setIsCalculatingPrice(prev => prev - 1);
      return;
    }

    try {
      const res = await fetch('/api/pricing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: itemToCalculate.productId,
          clientId: clienteId,
          quantity: itemToCalculate.quantity
        })
      });
      if (!res.ok) throw new Error('Price calculation failed');
      const priceData = await res.json();
      
      setItems(currentItems => currentItems.map(i => i.id === itemId ? { ...i, unitPrice: priceData.finalPrice, isPricingLoading: false } : i));

    } catch (error) {
      console.error("Price calculation error:", error);
      setItems(currentItems => currentItems.map(i => i.id === itemId ? { ...i, isPricingLoading: false } : i));
    } finally {
        setIsCalculatingPrice(prev => prev - 1);
    }
  }, [clienteId]);

  const handleUpdateItem = (id, updatedValues, shouldRecalculatePrice = false) => {
    setItems(currentItems => {
      const newItems = currentItems.map(item => item.id === id ? { ...item, ...updatedValues } : item);
      if (shouldRecalculatePrice) {
        const itemToCalculate = newItems.find(i => i.id === id);
        if (itemToCalculate) {
          getCalculatedPrice(id, itemToCalculate);
        }
      }
      return newItems;
    });
  };

  const filteredClients = useMemo(() => {
    if (!clientSearch) return [];
    return clients.filter(c => c.nombre.toLowerCase().includes(clientSearch.toLowerCase()));
  }, [clientSearch, clients]);

  const selectClient = (client) => {
    setClienteId(client.id);
    setClientSearch(client.nombre);
  };

  const handleNewClientSaved = (newClient) => {
    setClients(prevClients => [...prevClients, newClient]);
    selectClient(newClient);
  };

  const handleAddItem = () => {
    setItems([...items, { id: uuidv4(), productId: '', quantity: 1, unitPrice: 0, description: '', isPricingLoading: false }]);
  };

  const handleRemoveItem = (id) => {
    setItems(items.filter(item => item.id !== id));
  };

  const { subtotal, tax, total } = useMemo(() => {
    const sub = items.reduce((acc, item) => acc + ((item.quantity || 0) * (item.unitPrice || 0)), 0);
    const taxAmount = sub * ivaRate;
    return { subtotal: sub, tax: taxAmount, total: sub + taxAmount };
  }, [items, ivaRate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!clienteId || items.length === 0) {
      alert('Por favor, selecciona un cliente y añade al menos un producto.');
      return;
    }
    setStatus('loading');
    const finalItems = items.map(({id, isPricingLoading, ...rest}) => rest);

    const budgetData = {
      clienteId,
      items: finalItems,
      notes,
      subtotal,
      tax,
      total,
      estado: presupuestoToEdit ? presupuestoToEdit.estado : 'Borrador',
    };

    try {
      const url = isEditing ? `/api/presupuestos/${presupuestoToEdit.id}` : '/api/presupuestos';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(budgetData),
      });

      if (!response.ok) throw new Error('El servidor devolvió un error');
      
      setStatus('success');
      router.push(isEditing ? `/presupuestos/${presupuestoToEdit.id}` : '/presupuestos');
      router.refresh(); // To see the changes in the list or detail view

    } catch (error) {
      setStatus('error');
      console.error('Error al guardar el presupuesto:', error);
    }
  };

  return (
    <>
      <NewClientModal 
        isOpen={isClientModalOpen}
        onClose={() => setClientModalOpen(false)}
        onSave={handleNewClientSaved}
      />
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="p-6 bg-base-100 rounded-lg shadow">
          <div className="form-control w-full max-w-xs">
            <div className="label"><span className="label-text">Buscar Cliente</span></div>
            <input 
              type="text" 
              value={clientSearch}
              onChange={e => { setClientSearch(e.target.value); setClienteId(''); }}
              placeholder="Escribe para buscar..."
              className="input input-bordered w-full"
              disabled={isEditing}
            />
            {clientSearch && !clienteId && !isEditing && (
              <div className="absolute mt-1 w-full z-10">
                <ul className="menu bg-base-200 w-full rounded-box max-h-60 overflow-y-auto">
                  {filteredClients.map(c => (
                    <li key={c.id} onClick={() => selectClient(c)}>
                      <a>{c.nombre}</a>
                    </li>
                  ))}
                  {filteredClients.length === 0 && (
                    <li className="menu-title px-4 pt-2"><span>No se encontraron clientes.</span></li>
                  )}
                </ul>
                <button type="button" onClick={() => setClientModalOpen(true)} className="btn btn-primary btn-sm w-full rounded-t-none">+ Crear Nuevo Cliente</button>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 bg-base-100 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Productos/Servicios</h3>
          <div className="grid grid-cols-12 gap-2 font-bold mb-2">
              <div className="col-span-5">Producto</div>
              <div className="col-span-2">Cantidad</div>
              <div className="col-span-2">Precio Unit.</div>
              <div className="col-span-2 text-right font-semibold">Total</div>
          </div>
          {items.map(item => <ItemRow key={item.id} item={item} onRemove={handleRemoveItem} products={products} onUpdate={handleUpdateItem} clienteId={clienteId} />)}
          <button type="button" onClick={handleAddItem} className="btn btn-outline btn-sm mt-4" disabled={!clienteId}>+ Añadir línea</button>
        </div>

        <div className="grid grid-cols-2 gap-8">
          <div className="p-6 bg-base-100 rounded-lg shadow space-y-4">
              <h3 className="text-lg font-medium mb-4">Notas</h3>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} className="textarea textarea-bordered w-full" placeholder="Condiciones de pago, detalles de entrega, etc."></textarea>
          </div>
          <div className="p-6 bg-base-100 rounded-lg shadow space-y-4">
              <h3 className="text-lg font-medium mb-4">Resumen</h3>
              <div className="flex justify-between"><span className="text-base-content/70">Subtotal</span><span>{subtotal.toFixed(2)} €</span></div>
              <div className="flex justify-between"><span className="text-base-content/70">IVA ({(ivaRate * 100).toFixed(0)}%)</span><span>{tax.toFixed(2)} €</span></div>
              <div className="divider my-0"></div>
              <div className="flex justify-between font-bold text-lg"><span>Total</span><span>{total.toFixed(2)} €</span></div>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button type="submit" className="btn btn-primary" disabled={status === 'loading' || !clienteId || isCalculatingPrice > 0}>
            {isCalculatingPrice > 0 ? 'Calculando Precios...' : (status === 'loading' ? 'Guardando...' : (isEditing ? 'Guardar Cambios' : 'Guardar Presupuesto'))}
          </button>
        </div>
      </form>
    </>
  );
}
