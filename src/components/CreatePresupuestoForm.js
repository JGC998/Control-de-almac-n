"use client";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import useSWR, { mutate } from 'swr';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Save, UserPlus, X, Calculator } from 'lucide-react'; 

const fetcher = (url) => fetch(url).then((res) => res.json());

// --- Helper para calcular el precio de un solo item (Lógica duplicada para Presupuestos) ---
const calculatePriceForSingleItem = async (clienteId, item) => {
    if (!clienteId || !item.productId || (item.quantity || 0) <= 0) {
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
  const [clienteId, setClienteId] = useState(initialData?.clienteId || '');
  const [clienteBusqueda, setClienteBusqueda] = useState(''); 
  const [items, setItems] = useState(initialData?.items || []);
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Estados para Modals
  const [modalState, setModalState] = useState(null); // 'CLIENTE', 'FABRICANTE', 'MATERIAL'

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

  // Sincronizar estado si initialData cambia
  useEffect(() => {
    if (initialData) {
      setClienteId(initialData.clienteId || '');
      setItems(initialData.items || []);
      setNotes(initialData.notes || '');
      if (initialData.cliente?.nombre) {
        setClienteBusqueda(initialData.cliente.nombre);
      }
    }
  }, [initialData]);
  
  // --- Lógica de Filtros y Búsqueda ---
  const filteredClients = clientes?.filter(c => 
    c.nombre.toLowerCase().includes(clienteBusqueda.toLowerCase()) && c.id !== clienteId
  ).slice(0, 5) || [];
  
  // Filtro de productos basado en la selección
  const filteredProducts = useMemo(() => {
    let products = todosProductos || [];
    let isFiltered = false;

    if (filtroFabricanteId) {
        isFiltered = true;
        // Filtra por ClienteId O FabricanteId
        products = products.filter(p => p.fabricanteId === filtroFabricanteId || p.clienteId === filtroFabricanteId);
    }

    if (filtroMaterialId) {
        isFiltered = true;
        products = products.filter(p => p.materialId === filtroMaterialId);
    }
    
    // Si no hay filtros seleccionados, o si hay filtros y además estamos buscando por nombre, aplicamos búsqueda
    if (productoBusqueda) {
        products = products.filter(p => p.nombre.toLowerCase().includes(productoBusqueda.toLowerCase()));
    }

    return products;

  }, [todosProductos, filtroFabricanteId, filtroMaterialId, productoBusqueda]);


  // --- Handlers de Cliente ---
  const handleSelectClient = (clientId, clientName) => {
    setClienteId(clientId);
    setClienteBusqueda(clientName);
    // Recalcular precios inmediatamente después de seleccionar cliente
    handleRecalculatePrices(clientId);
  };
  
  const handleClearClient = () => {
    setClienteId('');
    setClienteBusqueda('');
  };
  
  // --- LÓGICA DE RECALCULO DE PRECIOS ---

  const handleRecalculatePrices = async (targetClienteId = clienteId) => {
    if (!targetClienteId) {
      // No alertamos aquí para no molestar si se llama desde handleClienteChange con null
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
        // Buscamos la coincidencia por descripción (y cantidad, opcionalmente)
        const matchedItem = calculatedItems.find(calcItem => calcItem.description === item.description);
        if (matchedItem) {
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
          
          if (clienteId && (item.quantity || 0) > 0) {
              // Recalcular el precio de inmediato si hay cliente y cantidad
              newPrice = await calculatePriceForSingleItem(clienteId, { ...item, productId: producto.id });
          } else {
              newPrice = item.unitPrice;
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
    
    // Si se cambia la cantidad o el producto (implícitamente por plantilla), recalcular el precio.
    if ((field === 'quantity' || field === 'productId') && item.productId && clienteId && (item.quantity || 0) > 0) {
        newPrice = await calculatePriceForSingleItem(clienteId, item);
    }
    
    item.unitPrice = newPrice;
    setItems(newItems);
  };

  const addItem = (producto) => {
    if (!producto) {
        // Permitir añadir un item manual vacío para que el usuario lo rellene
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

    // Limpiar filtros después de añadir
    setFiltroFabricanteId('');
    setFiltroMaterialId('');
    setProductoBusqueda('');
  };

  const removeItem = (index) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
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

    if (!clienteId) {
        setError('Debe seleccionar o crear un cliente.');
        setIsLoading(false);
        return;
    }

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
          <h2 className="card-title">Información del Cliente</h2>
          {clientesError && <div className="text-red-500">Error al cargar clientes.</div>}
          
          <div className="dropdown w-full">
            <div className="input-group">
                <input
                    type="text"
                    placeholder="Escribe para buscar un cliente existente..."
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
                     <button type="button" onClick={handleClearClient} className="btn btn-ghost btn-square">
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
                        <li key={cliente.id} onClick={() => handleSelectClient(cliente.id, cliente.nombre)}>
                            <a>{cliente.nombre}</a>
                        </li>
                    ))}
                </ul>
            )}
            
            {clienteId && (
                <div className="text-sm mt-2 text-success font-semibold">
                    Cliente: {clienteBusqueda}
                </div>
            )}
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
                {/* CORREGIDO: Usar 'prodError' en lugar de 'plantillasError' */}
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
          
          {/* BOTÓN RECALCULAR AÑADIDO AQUÍ */}
          <button type="button" onClick={() => handleRecalculatePrices()} className="btn btn-outline btn-accent btn-sm mt-4" disabled={isLoading || !clienteId}>
             <Calculator className="w-4 h-4" /> Recalcular Precios (según cliente)
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
        <button type="submit" className="btn btn-primary" disabled={isLoading || !clienteId}>
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
