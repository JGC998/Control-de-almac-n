"use client";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import useSWR, { mutate } from 'swr';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Save, UserPlus, X, Calculator, DollarSign } from 'lucide-react'; 

const fetcher = (url) => fetch(url).then((res) => res.json());

// --- Helper para calcular el precio de un solo item (Lógica centralizada en API) ---
const calculatePriceForSingleItem = async (clienteId, item) => {
    if (!clienteId || !item.productId || (item.quantity || 0) <= 0) {
        return item.unitPrice; 
    }
    
    try {
        const res = await fetch('/api/pricing/calculate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                clienteId, // El clienteId sigue siendo necesario para los Precios Especiales y Descuentos
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
// --- FIN HELPER ---

// --- Componente Modal para creación Cliente/Fabricante/Material (Unificado) ---
const BaseQuickCreateModal = ({ isOpen, onClose, onCreated, title, endpoint, fields, cacheKey }) => {
  const [formData, setFormData] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
        setFormData(fields.reduce((acc, field) => ({ ...acc, [field.name]: '' }), {}));
        setError(null);
    }
  }, [isOpen, fields]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || `Error al crear ${title}`);
      }
      const newItem = await res.json();
      mutate(cacheKey);
      onCreated(newItem); 
      onClose();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Nuevo {title} Rápido</h3>
        <form onSubmit={handleSubmit} className="py-4 space-y-4">
          {fields.map(field => (
            <input 
              key={field.name}
              type={field.type || 'text'} 
              name={field.name} 
              value={formData[field.name] || ''} 
              onChange={handleChange} 
              placeholder={field.placeholder} 
              className="input input-bordered w-full" 
              required={field.required !== false}
            />
          ))}
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="modal-action">
            <button type="button" onClick={onClose} className="btn">Cancelar</button>
            <button type="submit" className="btn btn-primary">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  );
};


export default function CreatePresupuestoForm({ initialData = null }) {
  const router = useRouter();
  // Mantenemos clienteId en el estado para el submit final, pero la selección es indirecta
  const [clienteId, setClienteId] = useState(initialData?.clienteId || ''); 
  // --- NUEVO ESTADO: Margen seleccionado ---
  const [selectedMarginId, setSelectedMarginId] = useState('');
  
  const [clienteBusqueda, setClienteBusqueda] = useState(initialData?.cliente?.nombre || ''); 
  const [items, setItems] = useState(initialData?.items || []);
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Estados para Modals
  const [modalState, setModalState] = useState(null); 

  // Nuevos estados para filtros de producto
  const [filtroFabricanteId, setFiltroFabricanteId] = useState('');
  const [filtroMaterialId, setFiltroMaterialId] = useState('');
  const [productoBusqueda, setProductoBusqueda] = useState('');

  // --- Carga de datos ---
  const { data: clientes, error: clientesError } = useSWR('/api/clientes', fetcher);
  const { data: fabricantes, error: fabError } = useSWR('/api/fabricantes', fetcher);
  const { data: materiales, error: matError } = useSWR('/api/materiales', fetcher);
  const { data: todosProductos, error: prodError } = useSWR('/api/productos', fetcher); 
  const { data: config } = useSWR('/api/config', fetcher);
  
  // NUEVO SWR: Margenes
  const { data: margenes, error: margenesError } = useSWR('/api/pricing/margenes', fetcher);
  
  // Mapear ClienteId a Margen Predeterminado si existe initialData
  useEffect(() => {
    if (initialData && initialData.clienteId && margenes && clientes) {
        const clienteActual = clientes.find(c => c.id === initialData.clienteId);
        if (clienteActual?.tier) {
             const marginMatch = margenes.find(m => m.tierCliente === clienteActual.tier);
             if (marginMatch) setSelectedMarginId(marginMatch.id);
        }
    }
  }, [initialData, margenes, clientes]);

  // Sincronizar estado si initialData cambia
  useEffect(() => {
    if (initialData) {
      setClienteId(initialData.clienteId || '');
      setItems(initialData.items || []);
      setNotes(initialData.notes || '');
      // No actualizamos clienteBusqueda, ya que el selector principal ya no es el cliente.
    }
  }, [initialData]);
  
  // --- LÓGICA DE FILTROS Y BÚSQUEDA ---
  // REINSERCIÓN CLAVE: Definición de filteredClients
  const filteredClients = useMemo(() => {
    return clientes?.filter(c => 
      c.nombre.toLowerCase().includes(clienteBusqueda.toLowerCase()) && c.id !== clienteId
    ).slice(0, 5) || [];
  }, [clientes, clienteBusqueda, clienteId]);
  
  // Filtro de productos basado en la selección
  const filteredProducts = useMemo(() => {
    let products = todosProductos || [];
    let isFiltered = false;

    if (filtroFabricanteId) {
        isFiltered = true;
        products = products.filter(p => p.fabricanteId === filtroFabricanteId || p.clienteId === filtroFabricanteId);
    }

    if (filtroMaterialId) {
        isFiltered = true;
        products = products.filter(p => p.materialId === filtroMaterialId);
    }
    
    if (productoBusqueda) {
        products = products.filter(p => p.nombre.toLowerCase().includes(productoBusqueda.toLowerCase()));
    }

    return products;

  }, [todosProductos, filtroFabricanteId, filtroMaterialId, productoBusqueda]);


  // --- Handlers de Margen/Cliente ---
  const handleMarginChange = (marginId) => {
    setSelectedMarginId(marginId);
    // Disparar recalculo si hay items
    if (items.length > 0) {
        handleRecalculatePrices();
    }
  };
  
  // --- LÓGICA DE RECALCULO DE PRECIOS ---

  const handleRecalculatePrices = async () => {
    // Si no hay margen seleccionado o no hay items, no hacemos nada.
    if (!selectedMarginId || items.length === 0) {
        return;
    }
    
    // Obtenemos el clienteId del cliente con el mismo tier que el margen seleccionado.
    const selectedMarginRule = margenes.find(m => m.id === selectedMarginId);
    let tempClienteId = clienteId; // Usamos el clienteId existente para los descuentos especiales (si está seleccionado)
    
    // Si no hay cliente seleccionado, pero sí un margen, buscamos un cliente de ese tier (solo para descuentos)
    if (!tempClienteId && selectedMarginRule?.tierCliente) {
         const matchingClient = clientes.find(c => c.tier === selectedMarginRule.tierCliente);
         tempClienteId = matchingClient ? matchingClient.id : null;
    }

    if (!tempClienteId) {
        // Si no hay cliente real, el cálculo de descuentos complejos fallará, pero el margen funcionará.
        tempClienteId = initialData?.clienteId || 'temp-id'; 
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
        setIsLoading(false);
        return;
      }

      // La API usará el clienteId para buscar descuentos, pero aplicará la nueva fórmula.
      const res = await fetch('/api/pricing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clienteId: tempClienteId, items: itemsToCalculate }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Error al recalcular precios");
      }
      const calculatedItems = await res.json();
      
      const updatedItems = items.map(item => {
        const matchedItem = calculatedItems.find(calcItem => calcItem.description === item.description);
        if (matchedItem) {
            // Solo actualizamos el precio unitario, el resto se mantiene
            return { ...item, unitPrice: matchedItem.unitPrice };
        }
        return item;
      });

      setItems(updatedItems);
      setError(null);
      
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Handlers de Items ---

  const handleItemChange = async (index, field, value) => {
    const newItems = [...items];
    const item = newItems[index];
    
    let newPrice = item.unitPrice;

    if (field === 'productId') {
        const producto = todosProductos.find(p => p.id === value);
        if (producto) {
          item.description = producto.nombre;
          item.productId = producto.id;
          item.unitPrice = parseFloat(producto.precioUnitario.toFixed(2)); 
        } else {
             item.productId = null;
             newPrice = 0;
        }
    } else if (field === 'unitPrice') {
      newPrice = parseFloat(parseFloat(value).toFixed(2)) || 0;
    } else {
      item[field] = value;
    }
    
    // Disparar recalculo al cambiar cantidad o producto (si hay un margen seleccionado)
    if ((field === 'quantity' || field === 'productId') && item.productId && selectedMarginId) {
        setTimeout(() => handleRecalculatePrices(), 100); 
    }
    
    item.unitPrice = newPrice;
    setItems(newItems);
  };

  const addItem = (producto) => {
    if (!producto) {
        setItems(prev => [...prev, { plantilladId: '', description: '', quantity: 1, unitPrice: 0, productId: null }]);
        return;
    }

    const precioUnitarioRedondeado = parseFloat(producto.precioUnitario.toFixed(2));

    setItems(prev => [...prev, { 
        description: producto.nombre, 
        quantity: 1, 
        unitPrice: precioUnitarioRedondeado, 
        productId: producto.id 
    }]);
    
    // Disparar recalculo al añadir si ya hay un margen seleccionado
    if (selectedMarginId) {
        setTimeout(() => handleRecalculatePrices(), 100); 
    }

    setFiltroFabricanteId('');
    setFiltroMaterialId('');
    setProductoBusqueda('');
  };

  const removeItem = (index) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
    // Recalcular después de eliminar
    if (selectedMarginId) {
        setTimeout(() => handleRecalculatePrices(), 100); 
    }
  };

  const calculateTotals = useCallback(() => {
    const subtotal = items.reduce((acc, item) => 
        acc + ((parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0))
    , 0);
    
    const ivaRate = config?.iva_rate ? parseFloat(config.iva_rate) : 0.21;
    const tax = subtotal * ivaRate;
    const total = subtotal + tax;
    
    return { 
        subtotal: parseFloat(subtotal.toFixed(2)), 
        tax: parseFloat(tax.toFixed(2)), 
        total: parseFloat(total.toFixed(2)), 
        ivaRate 
    };
  }, [items, config]);

  const { subtotal, tax, total, ivaRate } = calculateTotals();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    // Validar que se ha seleccionado un margen y un cliente. 
    // El cliente sigue siendo necesario para guardar la FK en la DB.
    if (!clienteId) {
        setError('Debe seleccionar un Cliente (para FK de la DB).');
        setIsLoading(false);
        return;
    }
    if (!selectedMarginId) {
        setError('Debe seleccionar una Regla de Margen/Tier para el precio.');
        setIsLoading(false);
        return;
    }

    // Aseguramos que los precios estén actualizados con el margen seleccionado
    await handleRecalculatePrices(); 

    const { subtotal: finalSubtotal, tax: finalTax, total: finalTotal } = calculateTotals();
    
    const quoteData = {
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

      mutate('/api/presupuestos');
      if(initialData) {
        mutate(`/api/presupuestos/${initialData.id}`);
      }

      router.push(`/presupuestos/${savedQuote.id}`);

    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const isDataLoading = !clientes || !fabricantes || !materiales || !todosProductos;

  return (
    <>
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Configuración de Precios y Cliente</h2>
          {clientesError && <div className="text-red-500">Error al cargar clientes.</div>}
          {margenesError && <div className="text-red-500">Error al cargar márgenes.</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* SELECCIÓN DE CLIENTE (Mantenido para FK y descuentos) */}
            <div className="form-control w-full">
                <label className="label"><span className="label-text">Cliente (Requerido para la DB)</span></label>
                <div className="input-group">
                    <input
                        type="text"
                        placeholder="Buscar cliente (solo para Precios Especiales)"
                        value={clienteBusqueda}
                        onChange={(e) => {
                            setClienteBusqueda(e.target.value);
                            if (e.target.value.length === 0) setClienteId('');
                        }}
                        className={`input input-bordered w-full ${clienteId ? 'border-success' : ''}`}
                        tabIndex={0} 
                        required
                    />
                    {clienteId && (
                        <button type="button" onClick={() => { setClienteId(''); setClienteBusqueda(''); }} className="btn btn-ghost btn-square">
                            <X className="w-4 h-4 text-error" />
                        </button>
                    )}
                    <button type="button" onClick={() => setModalState('CLIENTE')} className="btn btn-primary">
                        <UserPlus className="w-4 h-4" />
                    </button>
                </div>
                
                {clienteBusqueda.length >= 2 && filteredClients.length > 0 && clienteId === '' && (
                    <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-200 rounded-box w-full">
                        {filteredClients.map(cliente => (
                            <li key={cliente.id} onClick={() => { setClienteId(cliente.id); setClienteBusqueda(cliente.nombre); }}>
                                <a>{cliente.nombre}</a>
                            </li>
                        ))}
                    </ul>
                )}
                {clienteId && <div className="text-sm mt-2 text-success font-semibold">Cliente ID: {clienteId} ({clienteBusqueda})</div>}
            </div>
            
            {/* NUEVO: SELECCIÓN DE MARGEN/TIER */}
            <div className="form-control w-full">
                <label className="label"><span className="label-text font-bold">Regla de Margen / Tier</span></label>
                <select 
                    className="select select-bordered w-full" 
                    value={selectedMarginId} 
                    onChange={(e) => handleMarginChange(e.target.value)} 
                    required
                >
                    <option value="">Selecciona Margen</option>
                    {margenes?.filter(m => m.base !== 'GENERAL_FALLBACK').map(m => {
                      const tierText = m.tierCliente ? ` (${m.tierCliente})` : '';
                      const gastoFijoText = m.gastoFijo ? ` + ${m.gastoFijo}€ Fijo` : '';
                      return (
                        <option key={m.id} value={m.id}>
                            {m.descripcion}{tierText} (x{m.multiplicador}){gastoFijoText}
                        </option>
                      );
                    })}
                </select>
            </div>
          </div>
        </div>
      </div>

      {/* DETALLE DE ITEMS */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex justify-between items-center mb-4">
            <h2 className="card-title">Items</h2>
            <button type="button" onClick={() => addItem(null)} className="btn btn-primary btn-sm">
              <Plus className="w-4 h-4" /> Añadir Item Manual
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead><tr>
                <th>Producto</th>
                <th>Descripción</th>
                <th>Cantidad</th>
                <th>Precio Unit.</th>
                <th>Total</th>
                <th></th>
              </tr></thead>
              <tbody>
                {prodError && <tr><td colSpan="6" className="text-red-500">Error al cargar productos/plantillas.</td></tr>}
                {items.map((item, index) => (
                  <tr key={index}>
                    <td>
                      <select 
                        className="select select-bordered select-sm w-full max-w-xs" 
                        value={item.productId || ''} 
                        onChange={(e) => handleItemChange(index, 'productId', e.target.value)} 
                      >
                        <option value="">Manual</option>
                        {todosProductos?.map(p => (
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
          
          {/* BOTÓN RECALCULAR (Ahora solo es de respaldo) */}
          <button type="button" onClick={() => handleRecalculatePrices()} className="btn btn-outline btn-accent btn-sm mt-4" disabled={isLoading || !selectedMarginId}>
             <Calculator className="w-4 h-4" /> Recalcular Precios (Manual)
          </button>
          {/* FIN BOTÓN RECALCULAR */}


          <div className="divider">Añadir Producto (Búsqueda por Filtros)</div>
          
          {isDataLoading ? (
             <span className="loading loading-spinner"></span>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Selector de Cliente/Fabricante */}
              <div className="col-span-1">
                  <label className="label"><span className="label-text">Cliente / Fabricante</span></label>
                  <div className="input-group">
                      <select 
                        className="select select-bordered select-sm w-full" 
                        value={filtroFabricanteId} 
                        onChange={(e) => setFiltroFabricanteId(e.target.value)}
                      >
                        <option value="">Todos</option>
                        <optgroup label="Clientes Propietarios">
                          {clientes?.filter(c => todosProductos.some(p => p.clienteId === c.id))
                              .map(c => <option key={`cli-${c.id}`} value={c.id}>Cliente: {c.nombre}</option>)}
                        </optgroup>
                        <optgroup label="Fabricantes">
                          {fabricantes?.map(f => <option key={`fab-${f.id}`} value={f.id}>Fabricante: {f.nombre}</option>)}
                        </optgroup>
                      </select>
                       <button type="button" onClick={() => setModalState('FABRICANTE')} className="btn btn-ghost btn-square btn-sm tooltip" data-tip="Nuevo Fabricante">
                          <Plus className="w-4 h-4" />
                       </button>
                  </div>
              </div>
              
              {/* Selector de Material */}
              <div className="col-span-1">
                  <label className="label"><span className="label-text">Material</span></label>
                  <div className="input-group">
                      <select 
                        className="select select-bordered select-sm w-full" 
                        value={filtroMaterialId} 
                        onChange={(e) => setFiltroMaterialId(e.target.value)}
                      >
                        <option value="">Todos</option>
                        {materiales?.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                      </select>
                      <button type="button" onClick={() => setModalState('MATERIAL')} className="btn btn-ghost btn-square btn-sm tooltip" data-tip="Nuevo Material">
                          <Plus className="w-4 h-4" />
                       </button>
                  </div>
              </div>
              
              {/* Búsqueda y Resultados de Producto */}
              <div className="col-span-1">
                  <label className="label"><span className="label-text">Buscar Producto por Nombre</span></label>
                  <input
                    type="text"
                    placeholder="Escribe para filtrar productos..."
                    value={productoBusqueda}
                    onChange={(e) => setProductoBusqueda(e.target.value)}
                    className="input input-bordered input-sm w-full"
                  />
              </div>

              <div className="col-span-3">
                  <div className="max-h-48 overflow-y-auto border rounded-lg p-2 bg-base-200 space-y-1">
                      {filteredProducts.length > 0 ? (
                          filteredProducts.map(p => (
                              <button 
                                  key={p.id} 
                                  type="button" 
                                  onClick={() => addItem(p)} 
                                  className="btn btn-sm btn-block justify-start hover:bg-base-300"
                              >
                                  <Plus className="w-4 h-4" />
                                  <span className="font-bold">{p.nombre}</span> 
                                  <span className="ml-auto badge badge-outline">{p.precioUnitario.toFixed(2)} €</span>
                              </button>
                          ))
                      ) : (
                          <div className="text-center p-4 text-sm text-gray-500">
                             No hay productos que coincidan con los filtros.
                          </div>
                      )}
                  </div>
              </div>
            </div>
          )}

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
              <div className="flex justify-between"><span>IVA ({((ivaRate || 0) * 100).toFixed(0)}%)</span> <span>{tax.toFixed(2)} €</span></div>
              <div className="flex justify-between font-bold text-lg"><span>Total</span> <span>{total.toFixed(2)} €</span></div>
            </div>
          </div>
        </div>
      </div>
      
      {error && <div className="alert alert-error shadow-lg">{error}</div>}

      <div className="flex justify-end gap-4 mt-6">
        <button type="button" onClick={() => router.back()} className="btn btn-ghost" disabled={isLoading}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={isLoading || !clienteId || !selectedMarginId}>
          <Save className="w-4 h-4" /> {isLoading ? "Guardando..." : (initialData ? "Actualizar Presupuesto" : "Guardar Presupuesto")}
        </button>
      </div>
    </form>
    
    {/* Modals de Creación Rápida */}
    {modalState === 'CLIENTE' && (
      <BaseQuickCreateModal
        isOpen={true}
        onClose={() => setModalState(null)}
        onCreated={(newItem) => handleSelectClient(newItem.id, newItem.nombre)}
        title="Cliente"
        endpoint="/api/clientes"
        cacheKey="/api/clientes"
        fields={[
          { name: 'nombre', placeholder: 'Nombre' },
          { name: 'email', placeholder: 'Email', required: false },
          { name: 'direccion', placeholder: 'Dirección', required: false },
          { name: 'telefono', placeholder: 'Teléfono', required: false }
        ]}
      />
    )}
    
    {modalState === 'FABRICANTE' && (
      <BaseQuickCreateModal
        isOpen={true}
        onClose={() => setModalState(null)}
        onCreated={(newItem) => {
             setFiltroFabricanteId(newItem.id);
             setProductoBusqueda('');
        }}
        title="Fabricante"
        endpoint="/api/fabricantes"
        cacheKey="/api/fabricantes"
        fields={[{ name: 'nombre', placeholder: 'Nombre del Fabricante' }]}
      />
    )}
    
    {modalState === 'MATERIAL' && (
      <BaseQuickCreateModal
        isOpen={true}
        onClose={() => setModalState(null)}
        onCreated={(newItem) => {
             setFiltroMaterialId(newItem.id);
             setProductoBusqueda('');
        }}
        title="Material"
        endpoint="/api/materiales"
        cacheKey="/api/materiales"
        fields={[{ name: 'nombre', placeholder: 'Nombre del Material' }]}
      />
    )}
    </>
  );
}
