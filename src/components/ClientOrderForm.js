"use client";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import useSWR, { mutate } from 'swr';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Save, Calculator, X, UserPlus, Copy, CheckCircle, XCircle, Package, DollarSign, Search } from 'lucide-react'; 

const fetcher = (url) => fetch(url).then((res) => res.json());

// Helper para calcular el precio de un solo item (Lógica centralizada en API)
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

// --- Componente Modal para creación Cliente/Fabricante/Material (omitted for brevity) ---
const BaseQuickCreateModal = ({ isOpen, onClose, onCreated, title, endpoint, fields, cacheKey, initialData = {} }) => {
  const [formData, setFormData] = useState(fields.reduce((acc, field) => ({ ...acc, [field.name]: initialData[field.name] || '' }), {}));
  const [error, setError] = useState(null);

  // ... (Resto de lógica del Modal omitida, asumiendo que funciona) ...

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const dataToSend = { ...formData };
      fields.forEach(field => {
          if (field.type === 'number' || field.type === 'float') {
              dataToSend[field.name] = parseFloat(formData[field.name]) || 0;
          }
      });

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
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
      <div className="modal-box w-11/12 max-w-lg">
        <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg">Nuevo {title} Rápido</h3>
            <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="py-4 space-y-4">
          {fields.map(field => (
            <div key={field.name} className="form-control">
                <label className="label"><span className="label-text">{field.placeholder}</span></label>
                <input 
                  type={field.type || 'text'} 
                  step={field.step || 'any'}
                  name={field.name} 
                  value={formData[field.name] || ''} 
                  onChange={handleChange} 
                  placeholder={field.placeholder} 
                  className="input input-bordered w-full" 
                  required={field.required !== false}
                />
            </div>
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


// ------------------------------------------------
// Componente principal: ClientOrderForm
// ------------------------------------------------

export default function ClientOrderForm({ initialData = null, formType = "PRESUPUESTO" }) {
  const router = useRouter();
  const isQuote = formType === "PRESUPUESTO"; 

  const [clienteId, setClienteId] = useState(initialData?.clienteId || ''); 
  const [selectedMarginId, setSelectedMarginId] = useState('');
  const [clienteBusqueda, setClienteBusqueda] = useState(initialData?.cliente?.nombre || ''); 
  const [items, setItems] = useState(initialData?.items?.map(item => ({...item, id: item.id || Date.now() + Math.random()})) || [{ id: Date.now(), description: '', quantity: 1, unitPrice: 0, productId: null }]);
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [modalState, setModalState] = useState(null); 
  
  const [stockStatus, setStockStatus] = useState({}); 
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [activeItemIndex, setActiveItemIndex] = useState(null); 

  // Carga de datos
  const { data: clientes, error: clientesError } = useSWR('/api/clientes', fetcher);
  const { data: fabricantes, error: fabError } = useSWR('/api/fabricantes', fetcher);
  const { data: materiales, error: matError } = useSWR('/api/materiales', fetcher);
  const { data: todosProductos, error: prodError } = useSWR(isQuote ? '/api/productos' : '/api/plantillas', fetcher); 
  const { data: config } = useSWR('/api/config', fetcher);
  const { data: margenes, error: margenesError } = useSWR('/api/pricing/margenes', fetcher);
  
  const isDataLoading = !clientes || !fabricantes || !materiales || !todosProductos; 

  // Efecto para mapear el margen al cargar (si es edición de presupuesto o pedido existente)
  useEffect(() => {
    if (initialData && initialData.clienteId && margenes && clientes) {
        const clienteActual = clientes.find(c => c.id === initialData.clienteId);
        if (clienteActual?.tier) {
            const marginMatch = margenes?.find(m => m.tierCliente === clienteActual.tier);
            if (marginMatch) {
                setSelectedMarginId(marginMatch.id);
            }
        }
    }
  }, [initialData, margenes, clientes]);
  // FIN Mapeo inicial de margen

  // Recalcular Stock cada vez que los ítems cambian
  useEffect(() => {
      items.forEach((item) => {
        if (item.productId && item.quantity > 0) {
            checkStockStatus(item, item.id);
        }
      });
  }, [items.map(i => `${i.productId}-${i.quantity}-${i.id}`).join('_'), todosProductos]);

  // --- LÓGICA DE BÚSQUEDA DINÁMICA ---
  useEffect(() => {
      if (searchQuery.length < 3 || !todosProductos || activeItemIndex === null) {
          setSearchResults([]);
          return;
      }

      const results = todosProductos.filter(p => 
          p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.referenciaFabricante?.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 5); 

      setSearchResults(results);
  }, [searchQuery, todosProductos, activeItemIndex]);

  // Manejar el cierre de búsqueda al hacer clic fuera del componente
  useEffect(() => {
      const handleClickOutside = (event) => {
          if (activeItemIndex !== null && !event.target.closest('.item-row')) {
              setActiveItemIndex(null);
          }
      };
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
  }, [activeItemIndex]);


  // --- LÓGICA DE STOCK (omitted for brevity) ---
  const checkStockStatus = async (item, key) => {
      const product = todosProductos?.find(p => p.id === item.productId);
      if (!product || !product.material?.nombre || product.espesor === undefined || product.espesor === null) {
          setStockStatus(prev => ({ ...prev, [key]: { status: 'N/A' } }));
          return;
      }

      setStockStatus(prev => ({ ...prev, [key]: { status: 'loading' } }));

      const largo_m = product.largo / 1000;
      const metrosNecesarios = item.quantity * largo_m;
      
      try {
          const res = await fetch(`/api/stock-info/available-meters?material=${product.material.nombre}&espesor=${product.espesor}`);
          if (!res.ok) throw new Error('Error al obtener stock');
          
          const { totalMetros } = await res.json();
          
          const newStatus = { totalMetros };

          if (totalMetros >= metrosNecesarios) {
              newStatus.status = 'available';
          } else if (totalMetros > 0) {
              newStatus.status = 'low';
          } else {
              newStatus.status = 'unavailable';
          }
          setStockStatus(prev => ({ ...prev, [key]: newStatus }));
      } catch (err) {
          setStockStatus(prev => ({ ...prev, [key]: { status: 'error' } }));
      }
  };

  const getStockIcon = (item) => { 
    const stockData = stockStatus[item.id];
    const product = todosProductos?.find(p => p.id === item.productId);

    if (!product) return <Package className="w-5 h-5 text-gray-500" title="Sin plantilla" />;
    if (!stockData || stockData.status === 'N/A' || stockData.status === 'error') return <Package className="w-5 h-5 text-gray-500" title="Sin datos de stock" />;
    
    const metrosNecesarios = product.largo ? (item.quantity * product.largo / 1000).toFixed(2) : 'N/A';
    const totalMetros = stockData.totalMetros || 0;

    switch(stockData.status) {
        case 'available':
            return <CheckCircle className="w-5 h-5 text-success" title={`Stock suficiente para ${metrosNecesarios}m`} />;
        case 'low':
            return <XCircle className="w-5 h-5 text-warning" title={`Stock bajo: ${totalMetros.toFixed(2)}m disp. Necesitas ${metrosNecesarios}m`} />;
        case 'unavailable':
            return <XCircle className="w-5 h-5 text-error" title={`Stock agotado. Necesitas ${metrosNecesarios}m`} />;
        case 'loading':
            return <span className="loading loading-spinner loading-xs text-primary" />;
        default:
            return <Package className="w-5 h-5 text-gray-500" title="Sin datos de stock" />;
    }
  };
  // --- FIN LÓGICA DE STOCK ---

  // --- Handlers de Cliente/Margen (omitted for brevity) ---
  const filteredClients = clientes?.filter(c => 
    c.nombre.toLowerCase().includes(clienteBusqueda.toLowerCase()) && c.id !== clienteId
  ).slice(0, 5) || [];

  const handleSelectClient = async (clientId, clientName) => {
    setClienteId(clientId);
    setClienteBusqueda(clientName);
    // Se mantiene la llamada completa para recalcular todos los ítems si ya hay alguno.
    if (items.length > 0) {
        await handleRecalculatePrices(clientId, selectedMarginId); 
    } 
  };
  
  const handleClearClient = () => {
    setClienteId('');
    setClienteBusqueda('');
  };
  
  const handleClienteCreado = async (nuevoCliente) => {
    setClienteId(nuevoCliente.id);
    setClienteBusqueda(nuevoCliente.nombre);
    setModalState(null);
     if (items.length > 0) {
        await handleRecalculatePrices(nuevoCliente.id, selectedMarginId);
    }
  };
  
  // MODIFICADO: Llama al recálculo siempre que cambie el margen Y haya un cliente/items.
  const handleMarginChange = (marginId) => {
    setSelectedMarginId(marginId);
    if (items.length > 0 && clienteId) {
        handleRecalculatePrices(clienteId, marginId); // MODIFICADO: Pasa el nuevo ID directamente
    }
  };
  
  // --- FUNCIÓN DE RECALCULAR COMPLETA (para el botón manual y cambio de cliente/margen) ---
  const handleRecalculatePrices = useCallback(async (targetClienteId = clienteId, targetMarginId = selectedMarginId) => {
    
    // Si no hay margen seleccionado, NO se calcula el margen/descuento.
    if (!targetMarginId || items.length === 0) {
        return;
    }
    
    let tempClienteId = targetClienteId; 
    
    if (!tempClienteId) {
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
                                  description: item.description,
                                  selectedMarginId: targetMarginId, // USA targetMarginId
                                }));
                                
      if (itemsToCalculate.length === 0) {
        setIsLoading(false);
        return;
      }

      const res = await fetch('/api/pricing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            clienteId: tempClienteId, 
            items: itemsToCalculate,
            selectedMarginId: targetMarginId // USA targetMarginId
        }),
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Error al recalcular precios");
      }
      
      const calculatedItems = await res.json();
      
      const updatedItems = items.map(item => {
        // Match por descripción es más seguro si hay items manuales.
        const matchedItem = calculatedItems.find(calcItem => calcItem.description === item.description);
        if (matchedItem) {
            // Solo actualizamos el precio, mantenemos todo lo demás
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
  }, [items, clienteId, selectedMarginId, initialData]);
  // --- FIN FUNCIÓN DE RECALCULAR COMPLETA ---


  const handleItemChange = async (index, field, value) => {
    // Es crucial crear una copia profunda del array para la inmutabilidad de React
    const newItems = items.map((item, i) => (i === index ? { ...item, [field]: value } : item));
    const item = newItems[index];
    
    // Si cambia la descripción, se borra el ID del producto y se activa la búsqueda
    if (field === 'description') {
        item.productId = null; 
        setSearchQuery(value); 
        setActiveItemIndex(index);
    } 
    
    setItems(newItems);
  };
  
  // Nueva función para seleccionar un producto del buscador (MODIFICADA)
  const handleSelectProduct = async (product, index) => {
      // 1. Crear un objeto temporal con el producto base seleccionado y la cantidad actual
      const tempItem = {
          description: product.nombre,
          productId: product.id,
          // El unitPrice es el costo base del producto antes de aplicar reglas
          unitPrice: parseFloat(product.precioUnitario.toFixed(2)), 
          quantity: items[index].quantity || 1, // Mantener la cantidad actual
      };
      
      let calculatedPrice = tempItem.unitPrice;
      
      const tempClienteId = clienteId || initialData?.clienteId || 'temp-id'; 
      
      // Solo se calcula el precio si hay un cliente y un margen seleccionado.
      if (tempClienteId && selectedMarginId) {
          setIsLoading(true); 
          try {
              // Llamamos a la API con la información de un solo item
              const res = await fetch('/api/pricing/calculate', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                      clienteId: tempClienteId, 
                      items: [tempItem], // Solo calculamos este item
                      selectedMarginId: selectedMarginId // CLAVE: Pasar el margen al backend
                  }),
              });

              if (res.ok) {
                  const [calculatedItem] = await res.json();
                  calculatedPrice = calculatedItem.unitPrice; // Precio con margen/descuento
              }
          } catch (e) {
              console.error("Error during instant price calculation:", e);
          } finally {
              setIsLoading(false);
          }
      }

      // 3. Crear el nuevo array de items con el precio final calculado
      const newItems = items.map((item, i) => {
          if (i === index) {
              return { 
                  ...item, 
                  description: tempItem.description,
                  productId: tempItem.productId,
                  unitPrice: calculatedPrice, // Usar el precio FINAL calculado
                  id: item.id // MUY IMPORTANTE: MANTENER EL ID ORIGINAL
              };
          }
          return item;
      });
      
      // 4. Actualizar el estado en un solo paso
      setItems(newItems);
      setSearchQuery(''); 
      setActiveItemIndex(null); 
  };


  const addItem = () => {
    setItems(prev => [...prev, { id: Date.now() + Math.random(), description: '', quantity: 1, unitPrice: 0, productId: null }]);
  };

  const removeItem = (itemId) => {
    const newItems = items.filter(item => item.id !== itemId);
    setItems(newItems);
  };

  // --- FUNCIONALIDAD: Duplicar Fila ---
  const handleDuplicateItem = (itemId) => {
    const itemToDuplicate = items.find(item => item.id === itemId);
    const duplicatedItem = { 
        ...itemToDuplicate, 
        id: Date.now() + Math.random() // Nuevo ID único para duplicado
    };
    const index = items.findIndex(item => item.id === itemId);
    const newItems = [...items.slice(0, index + 1), duplicatedItem, ...items.slice(index + 1)];
    setItems(newItems);
  };
  // --- FIN NUEVA FUNCIONALIDAD ---
  
  // RESTAURACIÓN DE LA FUNCIÓN calculateTotals
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

    const { subtotal: finalSubtotal, tax: finalTax, total: finalTotal } = calculateTotals();
    
    if (!clienteId) {
        setError('Debe seleccionar un cliente.');
        setIsLoading(false);
        return;
    }
    
    // Ahora, el margen se requiere siempre (tanto en Presupuesto como en Pedido)
    if (!selectedMarginId) { 
         setError('Debe seleccionar una Regla de Margen/Tier para el precio.');
         setIsLoading(false);
         return;
    }

    const orderData = {
      clienteId,
      items: items.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: parseFloat((item.unitPrice || 0).toFixed(2)), 
        pesoUnitario: item.pesoUnitario || 0,
        productoId: item.productId,
      })),
      notes,
      subtotal: finalSubtotal,
      tax: finalTax,
      total: finalTotal,
      estado: isQuote ? 'Borrador' : 'Pendiente' // Estado basado en el tipo de formulario
    };

    const url = isQuote ? (initialData ? `/api/presupuestos/${initialData.id}` : '/api/presupuestos') : '/api/pedidos';
    const method = initialData ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || `Error al guardar el ${isQuote ? 'presupuesto' : 'pedido'}`);
      }
      
      const savedItem = await res.json();

      mutate(isQuote ? '/api/presupuestos' : '/api/pedidos');
      router.push(isQuote ? `/presupuestos/${savedItem.id}` : `/pedidos/${savedItem.id}`);

    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 1. INFORMACIÓN DEL CLIENTE Y MARGEN */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Información del Cliente</h2>
          {clientesError && <div className="text-red-500">Error al cargar clientes.</div>}
          
          {/* MODIFICADO: Ahora siempre 2 columnas */}
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
             
            {/* SELECCIÓN DE CLIENTE */}
            <div className="form-control w-full">
                <label className="label"><span className="label-text">Cliente (Requerido para la DB)</span></label>
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
                        <Plus className="w-4 h-4" />
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
            
            {/* SELECCIÓN DE MARGEN/TIER (YA NO ES CONDICIONAL) */}
            <div className="form-control w-full">
                <label className="label"><span className="label-text font-bold">Regla de Margen / Tier</span></label>
                <select 
                    className="select select-bordered w-full" 
                    value={selectedMarginId} 
                    onChange={(e) => handleMarginChange(e.target.value)} 
                    required
                >
                    <option value="">Selecciona Margen</option>
                    {margenesError && <option disabled>Error al cargar márgenes</option>}
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

      {/* 2. DETALLE DE ITEMS (CON BUSCADOR UNIFICADO) */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex justify-between items-center mb-4">
            <h2 className="card-title">Items</h2>
            <button type="button" onClick={addItem} className="btn btn-primary btn-sm">
              <Plus className="w-4 h-4" /> Añadir Item
            </button>
          </div>
          
          <div className="">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Stock</th>
                  <th className="w-96">Descripción / Búsqueda</th> 
                  <th>Cantidad</th>
                  <th>Precio Unit.</th>
                  <th>Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {prodError && <tr><td colSpan="6" className="text-red-500">Error al cargar plantillas.</td></tr>}
                {items.map((item, index) => {
                    return (
                        <tr key={item.id} className="item-row"> 
                           <td className="w-10">
                                {getStockIcon(item)}
                            </td>
                            {/* CAMPO DE BÚSQUEDA/DESCRIPCIÓN UNIFICADO */}
                            <td className="relative w-96">
                                <div className="dropdown w-full dropdown-bottom">
                                    <input 
                                        type="text" 
                                        placeholder="Buscar o introducir descripción manual..."
                                        value={item.description} 
                                        onChange={(e) => handleItemChange(index, 'description', e.target.value)} 
                                        onFocus={() => { 
                                            setActiveItemIndex(index); 
                                            setSearchQuery(item.description);
                                        }}
                                        onBlur={() => {
                                            setTimeout(() => {
                                                if (activeItemIndex === index) setActiveItemIndex(null); 
                                            }, 200);
                                        }}
                                        className="input input-bordered input-sm w-full"
                                    />
                                    
                                    {/* MUESTRA RESULTADOS SÓLO PARA EL CAMPO ACTIVO */}
                                    {activeItemIndex === index && searchResults.length > 0 && (
                                        <ul tabIndex={0} 
                                            className="dropdown-content z-[10] menu p-2 shadow bg-base-200 rounded-box w-96 mt-1 overflow-y-auto max-h-52"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {searchResults.map(p => (
                                                <li key={p.id} onClick={() => handleSelectProduct(p, index)}>
                                                    <a><Search className="w-4 h-4 mr-2" />{p.nombre} ({p.referenciaFabricante})</a>
                                                </li>
                                            ))}
                                            {/* Opción para crear si no hay match exacto */}
                                            {
                                                !todosProductos?.some(p => p.nombre === item.description) && (
                                                    <li onClick={() => setModalState({ type: 'QUICK_PRODUCT', initialData: { modelo: item.description }, itemIndex: index })}>
                                                        <a className="text-warning"><Plus className="w-4 h-4 mr-2" /> Crear Producto: {item.description}</a>
                                                    </li>
                                                )
                                            }
                                        </ul>
                                    )}
                                </div>
                            </td>
                            <td><input type="number" value={item.quantity || ''} onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)} className="input input-bordered input-sm w-20" /></td>
                            <td><input type="number" step="0.01" value={item.unitPrice || ''} onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)} className="input input-bordered input-sm w-24" /></td>
                            <td>{((item.quantity || 0) * (item.unitPrice || 0)).toFixed(2)} €</td>
                            <td className="flex gap-1">
                                <button type="button" onClick={() => handleDuplicateItem(item.id)} className="btn btn-ghost btn-sm btn-circle" title="Duplicar Fila">
                                    <Copy className="w-4 h-4" />
                                </button>
                                <button type="button" onClick={() => removeItem(item.id)} className="btn btn-ghost btn-sm btn-circle" title="Eliminar Fila">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </td>
                        </tr>
                    )
                })}
              </tbody>
            </table>
          </div>
            <button type="button" onClick={() => handleRecalculatePrices()} className="btn btn-outline btn-accent btn-sm mt-4" disabled={isLoading || !clienteId}>
                <Calculator className="w-4 h-4" /> Recalcular Precios (Manual)
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Notas</h2>
            <textarea
              name="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="textarea textarea-bordered h-24" 
              placeholder="Notas adicionales..."
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
        <button type="submit" className="btn btn-primary" disabled={isLoading || !clienteId || !selectedMarginId}>
          <Save className="w-4 h-4" /> {isLoading ? "Guardando..." : (isQuote ? (initialData ? "Actualizar Presupuesto" : "Guardar Presupuesto") : "Guardar Pedido")}
        </button>
      </div>
    </form>
    
    {/* Modal de Creación Rápida */}
    {modalState === 'CLIENTE' && (
      <BaseQuickCreateModal
        isOpen={true}
        onClose={() => setModalState(null)}
        onCreated={handleClienteCreado}
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
    
    {modalState?.type === 'QUICK_PRODUCT' && (
      <BaseQuickCreateModal
          isOpen={true}
          onClose={() => setModalState(null)}
          onCreated={(newItem) => handleSelectProduct(newItem, modalState.itemIndex)}
          title="Producto/Plantilla"
          endpoint="/api/productos"
          cacheKey="/api/productos"
          initialData={modalState.initialData}
          fields={[
              { name: 'modelo', placeholder: 'Referencia Fabricante', required: true },
              { name: 'espesor', placeholder: 'Espesor (mm)', type: 'number', required: true, step: '0.1' },
              { name: 'largo', placeholder: 'Largo (mm)', type: 'number', required: true, step: '1' },
              { name: 'ancho', placeholder: 'Ancho (mm)', type: 'number', required: true, step: '1' },
              { name: 'fabricante', placeholder: 'Fabricante (ej. Esbelt)', required: true },
              { name: 'material', placeholder: 'Material (ej. PVC)', required: true },
          ]}
      />
    )}
    </>
  );
}