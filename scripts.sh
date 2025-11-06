#!/bin/bash
#
# Script para revertir los cambios de las APIs de productos, plantillas y proveedores
# a su estado original (pre-error) para restaurar la estabilidad.
#
set -e

echo "--- 🔄 Iniciando ROLLBACK de APIs y Componentes ---"

# ---
# 1. Revertir src/app/api/productos/route.js (POST y GET)
# ---
echo "1/5 -> Reviertiendo src/app/api/productos/route.js..."
cat <<'EOF' > src/app/api/productos/route.js
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/productos - Obtiene todos los productos
export async function GET() {
  try {
    const productos = await db.producto.findMany({
      // "include" hace un JOIN para traer los nombres del fabricante y material
      include: {
        fabricante: true,
        material: true,
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
    
    // El frontend (gestion/productos/page.js) nos envía nombres,
    // pero la BD necesita los IDs de las relaciones.
    // Los buscamos primero.
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

    const nuevoProducto = await db.producto.create({
      data: {
        nombre: data.nombre,
        modelo: data.modelo,
        espesor: data.espesor,
        largo: data.largo,
        ancho: data.ancho,
        precioUnitario: data.precioUnitario,
        pesoUnitario: data.pesoUnitario,
        fabricanteId: fabricante.id, // Usamos el ID encontrado
        materialId: material.id,     // Usamos el ID encontrado
      },
    });

    return NextResponse.json(nuevoProducto, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error al crear el producto' }, { status: 500 });
  }
}
EOF

# ---
# 2. Revertir src/app/api/productos/[id]/route.js (GET y PUT)
# ---
echo "2/5 -> Reviertiendo src/app/api/productos/[id]/route.js..."
cat <<'EOF' > src/app/api/productos/[id]/route.js
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/productos/[id] - Obtiene un producto por su ID
export async function GET(request, { params: paramsPromise }) {
  try {
    const { id } = await paramsPromise; // <-- CORREGIDO
    const producto = await db.producto.findUnique({
      where: { id: id },
      include: {
        fabricante: true,
        material: true,
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
    const { id } = await paramsPromise; // <-- CORREGIDO
    const data = await request.json();

    const updatedProducto = await db.producto.update({
      where: { id: id },
      data: {
        nombre: data.nombre,
        modelo: data.modelo,
        espesor: data.espesor,
        largo: data.largo,
        ancho: data.ancho,
        precioUnitario: data.precioUnitario,
        pesoUnitario: data.pesoUnitario,
      },
    });
    return NextResponse.json(updatedProducto);
  } catch (error) {
    console.error(error);
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Producto no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Error al actualizar producto' }, { status: 500 });
  }
}

// DELETE /api/productos/[id] - Elimina un producto
export async function DELETE(request, { params: paramsPromise }) {
  try {
    const { id } = await paramsPromise; // <-- CORREGIDO
    await db.producto.delete({
      where: { id: id },
    });
    return NextResponse.json({ message: 'Producto eliminado' }, { status: 200 });
  } catch (error) {
    console.error(error);
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Producto no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Error al eliminar producto' }, { status: 500 });
  }
}
EOF

# ---
# 3. Revertir src/app/api/plantillas/route.js (GET)
# ---
echo "3/5 -> Reviertiendo src/app/api/plantillas/route.js..."
cat <<'EOF' > src/app/api/plantillas/route.js
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/plantillas - Es un alias de /api/productos
export async function GET() {
  try {
    const productos = await db.producto.findMany({
      include: {
        fabricante: true,
        material: true,
      },
      orderBy: { nombre: 'asc' },
    });
    return NextResponse.json(productos);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error al obtener productos' }, { status: 500 });
  }
}
EOF

# ---
# 4. Revertir src/app/gestion/productos/page.js (Frontend)
# ---
echo "4/5 -> Reviertiendo src/app/gestion/productos/page.js (Eliminando campos de cliente/troquel)..."
# Revertimos a la versión original, sin los campos clienteId y tieneTroquel en el frontend
cat <<'EOF' > src/app/gestion/productos/page.js
"use client";
import React, { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { PlusCircle, Edit, Trash2, Package } from 'lucide-react';

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function GestionProductos() {
  const [formData, setFormData] = useState({ 
    id: null, nombre: '', modelo: '', espesor: 0, largo: 0, ancho: 0, 
    precioUnitario: 0, pesoUnitario: 0, fabricante: '', material: '' 
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState(null);

  const { data: productos, error: productosError, isLoading: productosLoading } = useSWR('/api/productos', fetcher);
  const { data: fabricantes, error: fabError, isLoading: fabLoading } = useSWR('/api/fabricantes', fetcher);
  const { data: materiales, error: matError, isLoading: matLoading } = useSWR('/api/materiales', fetcher);

  const isLoading = productosLoading || fabLoading || matLoading;

  const openModal = (producto = null) => {
    if (producto) {
      setFormData({ 
        id: producto.id, nombre: producto.nombre, modelo: producto.modelo || '', 
        espesor: producto.espesor || 0, largo: producto.largo || 0, ancho: producto.ancho || 0, 
        precioUnitario: producto.precioUnitario || 0, pesoUnitario: producto.pesoUnitario || 0, 
        fabricante: producto.fabricante?.nombre || '', // Asume que el GET trae el objeto
        material: producto.material?.nombre || ''      // Asume que el GET trae el objeto
      });
    } else {
      setFormData({ 
        id: null, nombre: '', modelo: '', espesor: 0, largo: 0, ancho: 0, 
        precioUnitario: 0, pesoUnitario: 0, fabricante: '', material: '' 
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

    // Convertir a número antes de enviar
    const dataToSend = {
      ...formData,
      espesor: parseFloat(formData.espesor),
      largo: parseFloat(formData.largo),
      ancho: parseFloat(formData.ancho),
      precioUnitario: parseFloat(formData.precioUnitario),
      pesoUnitario: parseFloat(formData.pesoUnitario),
    };

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

      mutate('/api/productos'); // Revalida el cache
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
  if (productosError || fabError || matError) return <div className="text-red-500 text-center">Error al cargar datos.</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 flex items-center"><Package className="mr-2" /> Gestión de Productos</h1>
      
      <button onClick={() => openModal()} className="btn btn-primary mb-6">
        <PlusCircle className="w-4 h-4" /> Nuevo Producto
      </button>

      <div className="overflow-x-auto bg-base-100 shadow-xl rounded-lg">
        <table className="table w-full">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Fabricante</th>
              <th>Material</th>
              <th>Precio Unit.</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {Array.isArray(productos) && productos.map((p) => (
              <tr key={p.id} className="hover">
                <td className="font-bold">{p.nombre}</td>
                <td>{p.fabricante?.nombre || 'N/A'}</td>
                <td>{p.material?.nombre || 'N/A'}</td>
                <td>{p.precioUnitario.toFixed(2)} €</td>
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
          <div className="modal-box w-11/12 max-w-2xl">
            <h3 className="font-bold text-lg">{formData.id ? 'Editar Producto' : 'Nuevo Producto'}</h3>
            <form onSubmit={handleSubmit} className="py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} placeholder="Nombre" className="input input-bordered w-full md:col-span-2" required />
              <input type="text" name="modelo" value={formData.modelo} onChange={handleChange} placeholder="Modelo" className="input input-bordered w-full" />
              
              <select name="fabricante" value={formData.fabricante} onChange={handleSelectChange} className="select select-bordered w-full" required>
                <option value="">Selecciona Fabricante</option>
                {fabricantes?.map(f => <option key={f.id} value={f.nombre}>{f.nombre}</option>)}
              </select>
              
              <select name="material" value={formData.material} onChange={handleSelectChange} className="select select-bordered w-full" required>
                <option value="">Selecciona Material</option>
                {materiales?.map(m => <option key={m.id} value={m.nombre}>{m.nombre}</option>)}
              </select>
              
              <input type="number" step="0.01" name="precioUnitario" value={formData.precioUnitario} onChange={handleChange} placeholder="Precio Unitario" className="input input-bordered w-full" />
              <input type="number" step="0.01" name="pesoUnitario" value={formData.pesoUnitario} onChange={handleChange} placeholder="Peso Unitario" className="input input-bordered w-full" />
              <input type="number" step="0.01" name="espesor" value={formData.espesor} onChange={handleChange} placeholder="Espesor (mm)" className="input input-bordered w-full" />
              <input type="number" step="0.01" name="largo" value={formData.largo} onChange={handleChange} placeholder="Largo (m)" className="input input-bordered w-full" />
              <input type="number" step="0.01" name="ancho" value={formData.ancho} onChange={handleChange} placeholder="Ancho (m)" className="input input-bordered w-full" />
              
              {error && <p className="text-red-500 text-sm md:col-span-2">{error}</p>}
              
              <div className="modal-action md:col-span-2">
                <button type="button" onClick={closeModal} className="btn">Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
EOF

# ---
# 5. Revertir src/app/gestion/clientes/[id]/page.js (Eliminar fetch de plantillas)
# ---
echo "5/5 -> Reviertiendo src/app/gestion/clientes/[id]/page.js (Eliminando fetch de plantillas)..."
cat <<'EOF' > src/app/gestion/clientes/[id]/page.js
"use client";
import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import Link from 'next/link';
import { User, FileText, Package, Edit, ArrowLeft, Mail, Phone, MapPin } from 'lucide-react';

const fetcher = (url) => fetch(url).then((res) => res.json());

const InfoCard = ({ title, value, icon }) => (
  <div className="flex items-center p-4 bg-base-200 rounded-lg">
    {React.cloneElement(icon, { className: "w-5 h-5 mr-3 text-primary" })}
    <div>
      <div className="text-sm font-medium text-gray-500">{title}</div>
      <div className="text-lg font-semibold">{value || '-'}</div>
    </div>
  </div>
);

const SectionList = ({ title, data, pathPrefix }) => (
  <div className="bg-base-100 shadow-xl rounded-lg p-6">
    <h2 className="text-xl font-bold mb-4">{title}</h2>
    <div className="overflow-y-auto max-h-60">
      {data && data.length > 0 ? (
        <ul className="divide-y divide-base-300">
          {data.map(item => (
            <li key={item.id} className="py-2 flex justify-between items-center hover:bg-base-200 px-2 rounded">
              <Link href={`/${pathPrefix}/${item.id}`} className="link link-primary">
                {item.numero}
              </Link>
              <span className="text-sm text-gray-500">{new Date(item.fechaCreacion).toLocaleDateString()}</span>
              <span className={`badge ${item.estado === 'Aceptado' || item.estado === 'Completado' ? 'badge-success' : 'badge-warning'}`}>
                {item.estado}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500">No hay {title.toLowerCase()} para este cliente.</p>
      )}
    </div>
  </div>
);

export default function ClienteDetalle() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;

  const { data: cliente, error: clienteError, isLoading: clienteLoading } = useSWR(id ? `/api/clientes/${id}` : null, fetcher);
  const { data: pedidos, error: pedidosError, isLoading: pedidosLoading } = useSWR(id ? `/api/pedidos?clientId=${id}` : null, fetcher);
  const { data: presupuestos, error: presupuestosError, isLoading: presupuestosLoading } = useSWR(id ? `/api/presupuestos?clientId=${id}` : null, fetcher);

  const isLoading = clienteLoading || pedidosLoading || presupuestosLoading;

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen"><span className="loading loading-spinner loading-lg"></span></div>;
  }

  if (clienteError) {
    return <div className="text-red-500 text-center">Error al cargar el cliente.</div>;
  }
  
  if (!cliente) {
    return <div className="text-center">Cliente no encontrado.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <button onClick={() => router.back()} className="btn btn-ghost mb-4">
        <ArrowLeft className="w-4 h-4" /> Volver
      </button>

      {/* Cabecera del Cliente */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold flex items-center"><User className="mr-2" /> {cliente.nombre}</h1>
        <button onClick={() => alert('Función de editar no conectada a modal')} className="btn btn-outline btn-primary">
          <Edit className="w-4 h-4" /> Editar Cliente
        </button>
      </div>

      {/* Tarjetas de Información */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <InfoCard title="Email" value={cliente.email} icon={<Mail />} />
        <InfoCard title="Teléfono" value={cliente.telefono} icon={<Phone />} />
        <InfoCard title="Dirección" value={cliente.direccion} icon={<MapPin />} />
      </div>

      {/* Secciones de Pedidos y Presupuestos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionList title="Presupuestos Recientes" data={presupuestos} pathPrefix="presupuestos" />
        <SectionList title="Pedidos Recientes" data={pedidos} pathPrefix="pedidos" />
      </div>
    </div>
  );
}
EOF


echo "--- ✅ ROLLBACK COMPLETO ---"
echo "Todas las APIs de productos y los componentes dependientes han sido revertidos a su estado original de trabajo."
echo "Para que el sistema se estabilice completamente, **es obligatorio** realizar los siguientes pasos:"
echo "1. Limpiar caché: rm -rf .next/ node_modules/.prisma"
echo "2. Forzar regeneración: npx prisma generate"
echo "3. Reiniciar: npm run dev"
