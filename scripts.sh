#!/bin/bash

# Define la ruta del archivo a modificar
PRODUCTOS_PAGE_JS="src/app/gestion/productos/page.js"

echo "--- Corrigiendo la lectura de dimensiones (mm a m) en $PRODUCTOS_PAGE_JS ---"

# Utiliza cat para sobrescribir el archivo con el contenido corregido.
cat > $PRODUCTOS_PAGE_JS <<'PRODUCTOS_PAGE_JS_EOF'
"use client";
import React, { useState, useMemo, useEffect } from 'react';
import useSWR, { mutate } from 'swr';
import { PlusCircle, Edit, Trash2, Package } from 'lucide-react';

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function GestionProductos() {
  const [formData, setFormData] = useState({ 
    id: null, nombre: '', modelo: '', espesor: '', largo: '', ancho: '', 
    precioUnitario: '', pesoUnitario: '', costo: '',
    fabricante: '', material: '' 
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState(null);

  const { data: productos, error: productosError, isLoading: productosLoading } = useSWR('/api/productos', fetcher);
  const { data: fabricantes, error: fabError, isLoading: fabLoading } = useSWR('/api/fabricantes', fetcher);
  const { data: materiales, error: matError, isLoading: matLoading } = useSWR('/api/materiales', fetcher);
  const { data: tarifas, error: tarifasError, isLoading: tarifasLoading } = useSWR('/api/precios', fetcher);

  const isLoading = productosLoading || fabLoading || matLoading || tarifasLoading;
  
  // Lógica para obtener espesores disponibles según el material
  const availableEspesores = useMemo(() => {
    if (!tarifas || !formData.material) return [];
    
    const espesores = tarifas
      .filter(t => t.material === formData.material)
      .map(t => String(t.espesor));
    
    return [...new Set(espesores)].sort((a, b) => parseFloat(a) - parseFloat(b));
  }, [tarifas, formData.material]);
  
  // Limpiar espesor al cambiar el material
  useEffect(() => {
      setFormData(prev => ({ ...prev, espesor: '' }));
  }, [formData.material]);

  // Función para formatear las dimensiones de mm (DB) a metros (Formulario)
  const formatDimension = (value) => {
    if (value !== null && value !== undefined) {
        // Asumimos que los valores de DB son grandes (mm) y los convertimos a metros.
        // Si el valor es una string que no se puede parsear, devolvemos ''.
        const numValue = parseFloat(value);
        if (!isNaN(numValue) && numValue > 0) {
            // Dividir por 1000 para pasar de mm a m, y limitar a 2 decimales para la visualización
            return (numValue / 1000).toFixed(2); 
        }
    }
    return '';
  };


  const openModal = (producto = null) => {
    if (producto) {
      setFormData({ 
        id: producto.id, nombre: producto.nombre, 
        modelo: producto.referenciaFabricante || '', 
        espesor: String(producto.espesor) || '', 
        // --- CORRECCIÓN: Convertir mm de la DB a metros para el formulario ---
        largo: formatDimension(producto.largo),     
        ancho: formatDimension(producto.ancho),     
        // --- FIN CORRECCIÓN ---
        precioUnitario: producto.precioUnitario || '',     
        pesoUnitario: producto.pesoUnitario || '',     
        costo: producto.costoUnitario || '',           
        fabricante: producto.fabricante?.nombre || '', 
        material: producto.material?.nombre || ''
      });
    } else {
      setFormData({ 
        id: null, nombre: '', modelo: '', 
        espesor: '', largo: '', ancho: '', 
        precioUnitario: '', pesoUnitario: '', 
        costo: '', 
        fabricante: '', material: '' 
      });
    }
    setError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSelectChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const url = formData.id ? `/api/productos/${formData.id}` : '/api/productos';
    const method = formData.id ? 'PUT' : 'POST';

    // La API calculará precioUnitario, pesoUnitario y nombre. 
    // Solo enviamos los datos necesarios.
    const dataToSend = {
      ...formData,
      // Los valores de largo y ancho ahora se envían en metros (como los ingresó el usuario)
      espesor: parseFloat(formData.espesor),
      largo: parseFloat(formData.largo),
      ancho: parseFloat(formData.ancho),
      // No enviamos precioUnitario, pesoUnitario ni nombre, se calculan en backend
      precioUnitario: 0, 
      pesoUnitario: 0, 
      costo: parseFloat(formData.costo) || 0,
      modelo: formData.modelo, 
    };
    
    if (!formData.id && !dataToSend.costo) {
      dataToSend.costo = 0; 
    }

    try {
      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Error al guardar el producto');
      }

      mutate('/api/productos'); 
      closeModal();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('¿Estás seguro de que quieres eliminar este producto?')) {
      try {
        const res = await fetch(`/api/productos/${id}`, { method: 'DELETE' });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.message || 'Error al eliminar el producto');
        }
        mutate('/api/productos');
      } catch (err) {
        alert(err.message);
      }
    }
  };

  if (isLoading) return <div className="flex justify-center items-center h-screen"><span className="loading loading-spinner loading-lg"></span></div>;
  if (productosError || fabError || matError || tarifasError) return <div className="text-red-500 text-center">Error al cargar datos.</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 flex items-center"><Package className="mr-2" /> Gestión de Productos</h1>
      
      <button onClick={() => openModal()} className="btn btn-primary mb-6">
        <PlusCircle className="w-4 h-4" /> Nuevo Producto
      </button>

      <div className="overflow-x-auto bg-base-100 shadow-xl rounded-lg">
        <table className="table w-full">
          <thead><tr>
            <th>Nombre</th>
            <th>Ref. Fab.</th>
            <th>Material</th>
            <th>P. Unitario</th>
            <th>Costo Unit.</th>
            <th>Acciones</th>
          </tr></thead>
          <tbody>
            {Array.isArray(productos) && productos.map((p) => (
              <tr key={p.id} className="hover">
                <td className="font-bold">{p.nombre}</td>
                <td>{p.referenciaFabricante || 'N/A'}</td> 
                <td>{p.material?.nombre || 'N/A'}</td>
                <td>{p.precioUnitario.toFixed(2)} €</td>
                <td>{p.costoUnitario ? p.costoUnitario.toFixed(2) + ' €' : 'N/A'}</td> 
                <td className="flex gap-2">
                  <button onClick={() => openModal(p)} className="btn btn-sm btn-outline btn-info">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="btn btn-sm btn-outline btn-error">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal para Crear/Editar Producto */}
      {isModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box w-11/12 max-w-3xl">
            <h3 className="font-bold text-lg">{formData.id ? 'Editar Producto' : 'Nuevo Producto'}</h3>
            <form onSubmit={handleSubmit} className="py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} placeholder="Nombre (Se autocompletará)" className="input input-bordered w-full md:col-span-2" disabled />
              <input type="text" name="modelo" value={formData.modelo} onChange={handleChange} placeholder="Referencia Fabricante" className="input input-bordered w-full" required />
              
              <select name="fabricante" value={formData.fabricante} onChange={handleSelectChange} className="select select-bordered w-full" required>
                <option value="">Selecciona Fabricante</option>
                {fabricantes?.map(f => <option key={f.id} value={f.nombre}>{f.nombre}</option>)}
              </select>
              
              <select name="material" value={formData.material} onChange={handleSelectChange} className="select select-bordered w-full" required>
                <option value="">Selecciona Material</option>
                {materiales?.map(m => <option key={m.id} value={m.nombre}>{m.nombre}</option>)}
              </select>
              
              <label className="form-control w-full">
                  <div className="label"><span className="label-text">Espesor (mm)</span></div>
                  <select 
                    name="espesor" 
                    value={formData.espesor} 
                    onChange={handleSelectChange} 
                    className="select select-bordered w-full" 
                    disabled={!formData.material}
                    required
                  >
                      <option value="">Selecciona Espesor</option>
                      {availableEspesores.map(e => (
                        <option key={e} value={e}>{e} mm</option>
                      ))}
                  </select>
              </label>
              
              <input type="number" step="0.01" name="largo" value={formData.largo} onChange={handleChange} placeholder="Largo (m)" className="input input-bordered w-full" required />
              <input type="number" step="0.01" name="ancho" value={formData.ancho} onChange={handleChange} placeholder="Ancho (m)" className="input input-bordered w-full" required />
              
              {/* Campos ocultos para la API, no mostrados al usuario */}
              <input type="hidden" name="precioUnitario" value={formData.precioUnitario} />
              <input type="hidden" name="pesoUnitario" value={formData.pesoUnitario} />
              <input type="hidden" name="costo" value={formData.costo} />

              {error && <p className="text-red-500 text-sm md:col-span-2">{error}</p>}
              
              <div className="modal-action md:col-span-2">
                <button type="button" onClick={closeModal} className="btn">Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={tarifasLoading}>Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
PRODUCTOS_PAGE_JS_EOF
echo "✅ Modificación 1 (Frontend) aplicada."

## --- MODIFICACIÓN 2: src/app/api/productos/route.js (POST API) ---

cat > $PRODUCTOS_POST_API <<'PRODUCTOS_POST_API_EOF'
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Función central de cálculo (Ahora calcula precio y asume dimensiones en metros)
async function calculateCostAndWeight(materialId, espesor, largo, ancho) {
    if (!materialId || !espesor || !largo || !ancho || largo <= 0 || ancho <= 0) {
        return { costo: 0, peso: 0, precio: 0 };
    }

    // 1. Obtener el nombre del material para buscar la tarifa
    const material = await db.material.findUnique({
      where: { id: materialId },
      select: { nombre: true }
    });

    if (!material) {
        return { costo: 0, peso: 0, precio: 0 };
    }

    // 2. Buscar la TarifaMaterial usando el nombre del material
    const tarifa = await db.tarifaMaterial.findUnique({
        where: { 
            material_espesor: { 
                material: material.nombre,
                espesor: espesor
            }
        },
    });

    if (!tarifa || tarifa.precio <= 0) {
        return { costo: 0, peso: 0, precio: 0 };
    }

    // 3. Aplicar las fórmulas de cálculo (Dimensiones en Metros)
    const areaM2 = parseFloat(ancho) * parseFloat(largo);
    
    const costo = areaM2 * tarifa.precio; 
    const peso = areaM2 * tarifa.peso;     
    const precio = costo; // Precio Unitario base es igual al costo de la materia prima (sin margen)

    return { 
        costo: parseFloat(costo.toFixed(2)), 
        peso: parseFloat(peso.toFixed(2)),
        precio: parseFloat(precio.toFixed(2))
    };
}

// GET /api/productos - Obtiene todos los productos
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const clienteId = searchParams.get('clienteId');

    const whereClause = {};
    if (clienteId) {
      whereClause.clienteId = clienteId; 
    }

    const productos = await db.producto.findMany({
      where: whereClause,
      include: {
        fabricante: true,
        material: true,
        cliente: true,
      },
      orderBy: { nombre: 'asc' },
    });
    return NextResponse.json(productos);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error al obtener productos' }, { status: 500 });
  }
}

// POST /api/productos - Crea un nuevo producto
export async function POST(request) {
  try {
    const data = await request.json();
    
    // 1. Buscar IDs de Fabricante y Material
    const fabricante = await db.fabricante.findUnique({
      where: { nombre: data.fabricante },
    });
    const material = await db.material.findUnique({
      where: { nombre: data.material },
    });

    if (!fabricante) {
      return NextResponse.json({ message: `Fabricante "${data.fabricante}" no encontrado.` }, { status: 400 });
    }
    if (!material) {
      return NextResponse.json({ message: `Material "${data.material}" no encontrado.` }, { status: 400 });
    }
    
    // 2. Calcular Costo Unitario, Peso Unitario y Precio Unitario
    const { costo: calculatedCosto, peso: calculatedPeso, precio: calculatedPrecio } = await calculateCostAndWeight(
        material.id, 
        parseFloat(data.espesor), 
        parseFloat(data.largo), 
        parseFloat(data.ancho)
    );

    // 3. Generar el nombre del producto: (Referencia fabricante + Material + Fabricante)
    const newNombre = `${data.modelo} - ${material.nombre} - ${fabricante.nombre}`;


    const nuevoProducto = await db.producto.create({
      data: {
        nombre: newNombre, 
        referenciaFabricante: data.modelo,
        espesor: parseFloat(data.espesor) || 0,
        largo: parseFloat(data.largo) || 0,
        ancho: parseFloat(data.ancho) || 0,
        // Usar los valores calculados
        precioUnitario: calculatedPrecio || 0, 
        pesoUnitario: calculatedPeso || 0, 
        costoUnitario: calculatedCosto, 
        fabricanteId: fabricante.id, 
        materialId: material.id,
        clienteId: data.clienteId || null,
        tieneTroquel: data.tieneTroquel || false,
      },
    });

    return NextResponse.json(nuevoProducto, { status: 201 });
  } catch (error) {
    console.error('Error al crear el producto:', error);
    return NextResponse.json({ message: 'Error al crear el producto' }, { status: 500 });
  }
}
PRODUCTOS_POST_API_EOF
echo "✅ Modificación 2 (POST API) aplicada."


## --- MODIFICACIÓN 3: src/app/api/productos/[id]/route.js (PUT API) ---

cat > $PRODUCTOS_PUT_API <<'PRODUCTOS_PUT_API_EOF'
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Función central de cálculo (Ahora calcula precio y asume dimensiones en metros)
async function calculateCostAndWeight(materialId, espesor, largo, ancho) {
    if (!materialId || !espesor || !largo || !ancho || largo <= 0 || ancho <= 0) {
        return { costo: 0, peso: 0, precio: 0 };
    }

    // 1. Obtener el nombre del material para buscar la tarifa
    const material = await db.material.findUnique({
      where: { id: materialId },
      select: { nombre: true }
    });

    if (!material) {
        return { costo: 0, peso: 0, precio: 0 };
    }

    // 2. Buscar la TarifaMaterial usando el nombre del material
    const tarifa = await db.tarifaMaterial.findUnique({
        where: { 
            material_espesor: { 
                material: material.nombre,
                espesor: espesor
            }
        },
    });

    if (!tarifa || tarifa.precio <= 0) {
        return { costo: 0, peso: 0, precio: 0 };
    }

    // 3. Aplicar las fórmulas de cálculo (Dimensiones en Metros)
    const areaM2 = parseFloat(ancho) * parseFloat(largo);
    
    const costo = areaM2 * tarifa.precio; 
    const peso = areaM2 * tarifa.peso;     
    const precio = costo; // Precio Unitario base es igual al costo de la materia prima (sin margen)

    return { 
        costo: parseFloat(costo.toFixed(2)), 
        peso: parseFloat(peso.toFixed(2)),
        precio: parseFloat(precio.toFixed(2))
    };
}


// GET /api/productos/[id] - Obtiene un producto por su ID
export async function GET(request, { params: paramsPromise }) {
  try {
    const { id } = await paramsPromise; 
    const producto = await db.producto.findUnique({
      where: { id: id },
      include: {
        fabricante: true,
        material: true,
        cliente: true,
      },
    });

    if (!producto) {
      return NextResponse.json({ message: 'Producto no encontrado' }, { status: 404 });
    }
    return NextResponse.json(producto);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error al obtener producto' }, { status: 500 });
  }
}

// PUT /api/productos/[id] - Actualiza un producto
export async function PUT(request, { params: paramsPromise }) {
  try {
    const { id } = await paramsPromise; 
    const data = await request.json();

    // 1. Buscar IDs de Fabricante y Material
    const fabricante = await db.fabricante.findUnique({
      where: { nombre: data.fabricante },
    });
    const material = await db.material.findUnique({
      where: { nombre: data.material },
    });

    if (!fabricante) {
      return NextResponse.json({ message: `Fabricante "${data.fabricante}" no encontrado.` }, { status: 400 });
    }
    if (!material) {
      return NextResponse.json({ message: `Material "${data.material}" no encontrado.` }, { status: 400 });
    }
    
    // 2. Calcular Costo Unitario, Peso Unitario y Precio Unitario
    const { 
        costo: calculatedCosto, 
        peso: calculatedPeso,
        precio: calculatedPrecio 
    } = await calculateCostAndWeight(
        material.id, // Usar ID de Material
        parseFloat(data.espesor), 
        parseFloat(data.largo), 
        parseFloat(data.ancho)
    );
    
    // 3. Generar el nombre del producto: (Referencia fabricante + Material + Fabricante)
    const newNombre = `${data.modelo} - ${material.nombre} - ${fabricante.nombre}`;


    // Prepara los datos para la actualización
    const updateData = {
        nombre: newNombre, 
        referenciaFabricante: data.modelo, 
        espesor: parseFloat(data.espesor) || 0,
        largo: parseFloat(data.largo) || 0,
        ancho: parseFloat(data.ancho) || 0,
        // Usar los valores calculados
        precioUnitario: calculatedPrecio || 0, 
        pesoUnitario: calculatedPeso || 0, 
        costoUnitario: calculatedCosto, 
        fabricanteId: fabricante.id,
        materialId: material.id,
        clienteId: data.clienteId || null,
        tieneTroquel: data.tieneTroquel || false,
    };


    const updatedProducto = await db.producto.update({
      where: { id: id },
      data: updateData,
    });
    
    return NextResponse.json(updatedProducto);
  } catch (error) {
    console.error('Error al actualizar producto:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Producto no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Error al actualizar producto' }, { status: 500 });
  }
}

// DELETE /api/productos/[id] - Elimina un producto
export async function DELETE(request, { params: paramsPromise }) {
    try {
        const { id } = await paramsPromise; 
        await db.producto.delete({
            where: { id: id },
        });
        return NextResponse.json({ message: 'Producto eliminado' }, { status: 200 });
    } catch (error) {
        console.error('Error al eliminar producto:', error);
        if (error.code === 'P2025') {
            return NextResponse.json({ message: 'Producto no encontrado' }, { status: 404 });
        }
        // Error de clave foránea (si el producto está en un pedido)
        if (error.code === 'P2003' || error.code === 'P2014') {
            return NextResponse.json({ message: 'Error: El producto está siendo usado en pedidos o presupuestos y no se puede eliminar.' }, { status: 409 });
        }
        return NextResponse.json({ message: 'Error al eliminar producto' }, { status: 500 });
    }
}
PRODUCTOS_PUT_API_EOF
echo "✅ Modificación 3 (PUT API) aplicada."

echo "--- ¡FIN DE LAS CORRECCIONES! ---"
