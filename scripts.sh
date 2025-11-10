#!/bin/bash

# --- 1. Definir Rutas ---
CLIENTES_PAGE_PATH="src/app/gestion/clientes/page.js"
TARIFAS_TABLE_PATH="src/components/TarifasTable.js"
SEEDER_PATH="scripts/clean-seeder.js"

echo "--- 1. APLICANDO CORRECCIÓN DE CÓDIGO EN FRONTEND ---"

# 1.1. Inyectando código corregido en src/app/gestion/clientes/page.js (Fix Hydration)
echo "Aplicando fix de hidratación en $CLIENTES_PAGE_PATH"
cat > $CLIENTES_PAGE_PATH <<'CLIENTES_EOF'
"use client";
import React, { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { PlusCircle, Edit, Trash2, User } from 'lucide-react';
import Link from 'next/link';

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function GestionClientes() {
  const [formData, setFormData] = useState({ id: null, nombre: '', email: '', direccion: '', telefono: '', categoria: '' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState(null);

  const { data: clientes, error: clientesError, isLoading } = useSWR('/api/clientes', fetcher);

  const openModal = (cliente = null) => {
    if (cliente) {
      setFormData({ id: cliente.id, nombre: cliente.nombre, email: cliente.email || '', direccion: cliente.direccion || '', telefono: cliente.telefono || '', categoria: cliente.categoria || '' });
    } else {
      setFormData({ id: null, nombre: '', email: '', direccion: '', telefono: '', categoria: '' });
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const url = formData.id ? `/api/clientes/${formData.id}` : '/api/clientes';
    const method = formData.id ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Error al guardar el cliente');
      }

      mutate('/api/clientes');
      closeModal();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('¿Estás seguro de que quieres eliminar este cliente?')) {
      try {
        const res = await fetch(`/api/clientes/${id}`, { method: 'DELETE' });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.message || 'Error al eliminar el cliente');
        }
        mutate('/api/clientes');
      } catch (err) {
        alert(err.message);
      }
    }
  };

  if (isLoading) return <div className="flex justify-center items-center h-screen"><span className="loading loading-spinner loading-lg"></span></div>;
  if (clientesError) return <div className="text-red-500 text-center">Error al cargar los clientes.</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 flex items-center"><User className="mr-2" /> Gestión de Clientes</h1>
      
      <button onClick={() => openModal()} className="btn btn-primary mb-6">
        <PlusCircle className="w-4 h-4" /> Nuevo Cliente
      </button>

      <div className="overflow-x-auto bg-base-100 shadow-xl rounded-lg">
        <table className="table w-full">
          <thead><tr>
            <th>Nombre</th>
            <th>Categoría</th>
            <th>Email</th>
            <th>Teléfono</th>
            <th>Acciones</th>
          </tr></thead>
          <tbody>
            {clientes && clientes.map((cliente) => (
              <tr key={cliente.id} className="hover">
                <td>
                  <Link href={`/gestion/clientes/${cliente.id}`} className="link link-primary font-bold">
                    {cliente.nombre}
                  </Link>
                </td>
                <td><span className="badge badge-outline">{cliente.categoria || 'NORMAL'}</span></td>
                <td>{cliente.email}</td>
                <td>{cliente.telefono}</td>
                <td className="flex gap-2">
                  <button onClick={() => openModal(cliente)} className="btn btn-sm btn-outline btn-info">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(cliente.id)} className="btn btn-sm btn-outline btn-error">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal para Crear/Editar Cliente */}
      {isModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">{formData.id ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
            <form onSubmit={handleSubmit} className="py-4 space-y-4">
              <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} placeholder="Nombre" className="input input-bordered w-full" required />
              
              {/* Selector de Categoría (NUEVO) */}
              <select name="categoria" value={formData.categoria} onChange={handleChange} className="select select-bordered w-full">
                <option value="">Selecciona Categoría</option>
                <option value="FABRICANTE">FABRICANTE</option>
                <option value="INTERMEDIARIO">INTERMEDIARIO</option>
                <option value="CLIENTE FINAL">CLIENTE FINAL</option>
                <option value="NORMAL">NORMAL</option>
              </select>

              <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Email" className="input input-bordered w-full" />
              <input type="text" name="direccion" value={formData.direccion} onChange={handleChange} placeholder="Dirección" className="input input-bordered w-full" />
              <input type="tel" name="telefono" value={formData.telefono} onChange={handleChange} placeholder="Teléfono" className="input input-bordered w-full" />
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <div className="modal-action">
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
CLIENTES_EOF

# 1.2. Inyectando código corregido en src/components/TarifasTable.js (Filtro y Margin Fix)
echo "Aplicando filtro de material y fix de margen en $TARIFAS_TABLE_PATH"
cat > $TARIFAS_TABLE_PATH <<'TARIFAS_EOF'
"use client";
import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import { formatCurrency } from '@/utils/utils'; 

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function TarifasTable() {
  // Estado para el margen de simulación
  const [selectedMarginId, setSelectedMarginId] = useState('');
  // Estado: Material seleccionado
  const [selectedMaterial, setSelectedMaterial] = useState('Todos'); 
  
  // 1. Cargar tarifas (precios base)
  const { data: tarifas, error: tarifasError, isLoading: tarifasLoading } = useSWR('/api/precios', fetcher);
  
  // 2. Cargar reglas de margen
  const { data: margenes, error: margenesError, isLoading: margenesLoading } = useSWR('/api/pricing/margenes', fetcher);

  const isLoading = tarifasLoading || margenesLoading;
  
  // 3. Obtener el valor del multiplicador seleccionado
  const selectedMargin = useMemo(() => {
    if (!margenes || !selectedMarginId) return null;
    // Usamos 'valor' que es el campo del multiplicador
    return margenes.find(m => m.id === selectedMarginId);
  }, [margenes, selectedMarginId]);

  // Lista de materiales únicos
  const uniqueMaterials = useMemo(() => {
    if (!tarifas) return [];
    const materials = tarifas.map(t => t.material);
    return ['Todos', ...new Set(materials)].sort();
  }, [tarifas]);

  // Datos filtrados por material
  const filteredTarifas = useMemo(() => {
    if (!tarifas) return [];
    if (selectedMaterial === 'Todos') return tarifas;
    return tarifas.filter(t => t.material === selectedMaterial);
  }, [tarifas, selectedMaterial]);

  if (isLoading) return <div className="flex justify-center items-center h-screen"><span className="loading loading-spinner loading-lg"></span></div>;
  if (tarifasError || margenesError) return <div className="text-red-500 text-center">Error al cargar datos.</div>;

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <div className="flex justify-between items-center mb-4">
          <h2 className="card-title">Tabla de Tarifas por Material</h2>
        </div>
        
        {/* Agrupamos los dos selectores */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Selector de Margen */}
            <div className="form-control w-full">
            <label className="label"><span className="label-text font-bold">Simular Precio con Margen:</span></label>
            <select 
                className="select select-bordered"
                value={selectedMarginId}
                onChange={(e) => setSelectedMarginId(e.target.value)}
            >
                <option value="">Precio Base (Sin Margen)</option>
                {margenes?.map(margen => (
                <option key={margen.id} value={margen.id}>
                    {margen.descripcion} ({margen.tipo}) (x{margen.valor})
                </option>
                ))}
            </select>
            </div>

            {/* Selector de Material */}
            <div className="form-control w-full">
            <label className="label"><span className="label-text font-bold">Filtrar por Material:</span></label>
            <select 
                className="select select-bordered"
                value={selectedMaterial}
                onChange={(e) => setSelectedMaterial(e.target.value)}
            >
                {uniqueMaterials.map(material => (
                <option key={material} value={material}>
                    {material}
                </option>
                ))}
            </select>
            </div>
        </div>

        <div className="overflow-x-auto max-h-[70vh]">
          <table className="table table-zebra table-pin-rows table-sm w-full">
            <thead>
              <tr>
                <th className="text-center">Material</th>
                <th className="text-center">Espesor (mm)</th>
                {/* Mostramos el Precio Base (el valor sin margen del catálogo) */}
                <th className="text-center">Precio Base (€/m²)</th>
                {/* Mostramos el Precio Final (Precio Base * Multiplicador) */}
                <th className="text-center font-bold">Precio Final (€/m²)</th> 
                <th className="text-center">Peso (kg/m²)</th>
              </tr>
            </thead>
            <tbody>
              {filteredTarifas?.map(row => { 
                // CÁLCULO: Multiplicamos el precio base por el valor del margen
                const finalPrice = row.precio * (selectedMargin?.valor || 1);
                
                return (
                  <tr key={row.id} className="hover">
                    <td className="font-bold text-center">{row.material}</td>
                    <td className="text-center">{row.espesor}</td>
                    
                    {/* MOSTRAMOS EL PRECIO BASE (sin formatear) */}
                    <td className="text-center">{row.precio.toFixed(2)} €</td>
                    
                    {/* MOSTRAMOS EL PRECIO CON EL MARGEN APLICADO (formateado) */}
                    <td className="text-center font-bold text-primary">
                       {formatCurrency(finalPrice)}
                    </td>
                    
                    <td className="text-center">{row.peso.toFixed(2)} kg</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredTarifas.length === 0 && selectedMaterial !== 'Todos' && (
             <div className="text-center py-4 text-gray-500">No hay tarifas para el material seleccionado.</div>
          )}
        </div>
      </div>
    </div>
  );
}
TARIFAS_EOF

echo "--- 2. INYECTANDO SEEDER CON DATOS DE TARIFAS EXACTOS ---"

# --- Inyectar el código corregido en scripts/clean-seeder.js ---
cat > $SEEDER_PATH <<'SEEDER_EOF'
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid'); 

const db = new PrismaClient();

// --- DATOS INICIALES ---

const CLIENTES_DATA = [
  { id: "cli-001", nombre: "Aldama", email: "aldama@contacto.es", telefono: "111", categoria: "FABRICANTE" }, 
  { id: "cli-002", nombre: "Noli", email: "noli@contacto.es", telefono: "112", categoria: "FABRICANTE" }, 
  { id: "cli-003", nombre: "Agruiz", email: "agruiz@contacto.es", telefono: "113", categoria: "FABRICANTE" }, 
  { id: "cli-004", nombre: "Moresil", email: "moresil@contacto.es", telefono: "114", categoria: "FABRICANTE" }, 
  { id: "cli-005", nombre: "Ferreteria Ubetense", email: "ubetense@ferreteria.es", telefono: "225", categoria: "INTERMEDIARIO" }, 
  { id: "cli-006", nombre: "La Preferida", email: "preferida@contacto.es", telefono: "336", categoria: "CLIENTE FINAL" }, 
  { id: "cli-007", nombre: "Antonio Artugal", email: "antonio@contacto.es", telefono: "337", categoria: "CLIENTE FINAL" }, 
];

const FABRICANTES_DATA = [
  { id: "fab-esbelt", nombre: "Esbelt" },
  { id: "fab-siban", nombre: "Siban" },
  { id: "fab-rigalli", nombre: "Rigalli" },
  { id: "fab-aldama", nombre: "Aldama" }, 
  { id: "fab-moresil", nombre: "Moresil" }, 
];

const MATERIALES_DATA = [
  { id: "mat-pvc", nombre: "PVC" },
  { id: "mat-goma", nombre: "GOMA" },
  { id: "mat-fieltro", nombre: "FIELTRO" },
  { id: "mat-caramelo", nombre: "GOMA CARAMELO" },
  { id: "mat-verde", nombre: "GOMA VERDE" },
  { id: "mat-blanda", nombre: "GOMA BLANDA" },
];

const PRODUCTOS_DATA = [
  { id: "prod-001", nombre: "Banda PVC 3mm Blanca Vulcanizada", modelo: "PVC B3 Vulcanizado", espesor: 3.0, largo: 1000, ancho: 150, precioUnitario: 50.00, pesoUnitario: 1.5, costo: 25.00, material: "PVC", fabricante: "Esbelt" },
  { id: "prod-002", nombre: "Faldeta Aldama Goma", modelo: "FAldG", espesor: 10.0, largo: 600, ancho: 500, precioUnitario: 20.00, pesoUnitario: 10.0, costo: 10.00, material: "GOMA", fabricante: "Aldama" },
  { id: "prod-003", nombre: "Perfil Goma Caramelo 6mm", modelo: "GCM-P06", espesor: 6.0, largo: 50, ancho: 50, precioUnitario: 18.00, pesoUnitario: 0.5, costo: 12.00, material: "GOMA CARAMELO", fabricante: "Aldama" },
  { id: "prod-004", nombre: "Junta Goma Verde Industrial", modelo: "GVI-J01", espesor: 4.0, largo: 100, ancho: 100, precioUnitario: 35.00, pesoUnitario: 0.8, costo: 25.00, material: "GOMA VERDE", fabricante: "Moresil" },
  { id: "prod-005", nombre: "Plantilla Aldama Rápida", modelo: "CLI-ALD-01", espesor: 5.0, largo: 30, ancho: 30, precioUnitario: 8.00, pesoUnitario: 0.1, costo: 3.50, material: "FIELTRO", fabricante: "Esbelt", clienteId: "cli-001" }
];

// *******************************************************************
// * DATOS DE TARIFA ACTUALIZADOS SEGÚN SOLICITUD DEL USUARIO        *
// *******************************************************************
const RAW_TARIFAS_DATA = [
  // MATERIAL | ESPESOR | PRECIO | PESO
  { material: 'FIELTRO', espesor: 10.0, precio: 30.00, peso: 8.00 },
  { material: 'FIELTRO', espesor: 15.0, precio: 45.00, peso: 12.00 },
  { material: 'GOMA', espesor: 8.0, precio: 36.00, peso: 14.40 },
  { material: 'GOMA', espesor: 10.0, precio: 45.00, peso: 18.00 },
  { material: 'GOMA', espesor: 12.0, precio: 54.00, peso: 21.60 },
  { material: 'GOMA', espesor: 15.0, precio: 67.50, peso: 27.00 },
  { material: 'GOMA BLANDA', espesor: 2.0, precio: 8.00, peso: 2.00 },
  { material: 'GOMA BLANDA', espesor: 3.0, precio: 12.00, peso: 3.00 },
  { material: 'GOMA BLANDA', espesor: 6.0, precio: 24.00, peso: 6.00 },
  { material: 'GOMA CARAMELO', espesor: 6.0, precio: 36.00, peso: 7.20 },
  { material: 'GOMA CARAMELO', espesor: 8.0, precio: 48.00, peso: 9.60 },
  { material: 'GOMA CARAMELO', espesor: 10.0, precio: 60.00, peso: 12.00 },
  { material: 'GOMA CARAMELO', espesor: 12.0, precio: 72.00, peso: 14.40 },
  { material: 'GOMA VERDE', espesor: 8.0, precio: 44.00, peso: 12.80 },
  { material: 'GOMA VERDE', espesor: 10.0, precio: 55.00, peso: 16.00 },
  { material: 'GOMA VERDE', espesor: 12.0, precio: 66.00, peso: 19.20 },
  { material: 'PVC', espesor: 2.0, precio: 16.00, peso: 2.80 },
  { material: 'PVC', espesor: 3.0, precio: 24.00, peso: 4.20 },
];

// Corrección de Margenes para evitar error P2002
const RAW_MARGENES_SQL = `
  INSERT INTO "ReglaMargen" 
    ("id", "base", "multiplicador", "gastoFijo", "descripcion", "tipo", "tipo_categoria", "tierCliente") 
  VALUES
    ('mrg-fab', 'FABRICANTE', 1.50, 0.00, 'Margen para Fabricantes', 'Cliente', NULL, 'FABRICANTE'),
    ('mrg-int', 'INTERMEDIARIO', 1.75, 0.00, 'Margen para Intermediarios', 'Cliente', NULL, 'INTERMEDIARIO'),
    ('mrg-fin', 'CLIENTE_FINAL', 2.00, 0.00, 'Margen para Cliente Final', 'Cliente', NULL, 'CLIENTE FINAL'),
    ('mrg-gen', 'GENERAL_FALLBACK', 1.40, 0.00, 'Margen General de Fallback', 'General', NULL, NULL);
`;


// --- FUNCIÓN PRINCIPAL DE SEEDING ---
async function main() {
  console.log("Iniciando SEEDING limpio de datos iniciales...");
  
  // Limpieza total
  await db.$transaction([
    db.movimientoStock.deleteMany(), db.stock.deleteMany(), db.bobinaPedido.deleteMany(),
    db.pedidoProveedor.deleteMany(), db.referenciaBobina.deleteMany(), db.precioEspecial.deleteMany(),
    db.descuentoTier.deleteMany(), db.reglaDescuento.deleteMany(), db.reglaMargen.deleteMany(),
    db.nota.deleteMany(), db.pedidoItem.deleteMany(), db.pedido.deleteMany(),
    db.presupuestoItem.deleteMany(), db.presupuesto.deleteMany(), db.producto.deleteMany(),
    db.cliente.deleteMany(), db.material.deleteMany(), db.fabricante.deleteMany(), db.proveedor.deleteMany(),
    db.tarifaMaterial.deleteMany(), 
  ]);
  console.log('Limpieza inicial de tablas completada.');

  // --- 1. Mapeo de IDs (para productos) ---
  const fabricanteMap = new Map(FABRICANTES_DATA.map(f => [f.nombre, f.id]));
  const materialMap = new Map(MATERIALES_DATA.map(m => [m.nombre, m.id]));

  // --- 2. Inserción de modelos base (directa) ---
  for (const f of FABRICANTES_DATA) { await db.fabricante.create({ data: f }); }
  for (const m of MATERIALES_DATA) { await db.material.create({ data: m }); }
  
  for (const c of CLIENTES_DATA) { 
      await db.cliente.create({ 
          data: {
              id: c.id,
              nombre: c.nombre,
              email: c.email,
              direccion: c.direccion,
              telefono: c.telefono,
              tier: c.categoria 
          }
      }); 
  }
  
  console.log(`- ${CLIENTES_DATA.length} clientes, ${FABRICANTES_DATA.length} fabricantes insertados.`);
  
  // --- 3. INSERCIÓN FORZADA DE REGLAS DE MARGEN VÍA SQL ---
  try {
     await db.$executeRawUnsafe(RAW_MARGENES_SQL);
     console.log('✅ Reglas de Margen insertadas exitosamente vía SQL directo.');
  } catch (error) {
     console.error('CRÍTICO: Fallo al insertar ReglaMargen vía SQL.');
     throw error;
  }
 
  // --- 4. INSERCIÓN DE TARIFAS DE MATERIAL VÍA SQL ---
  try {
     const TARIFAS_SQL = RAW_TARIFAS_DATA.map(t => 
       `('${uuidv4()}', '${t.material}', ${t.espesor}, ${t.precio}, ${t.peso})`
     ).join(',\n');

     const FINAL_TARIFAS_SQL = `INSERT INTO "TarifaMaterial" ("id", "material", "espesor", "precio", "peso") VALUES ${TARIFAS_SQL};`;

     await db.$executeRawUnsafe(FINAL_TARIFAS_SQL);
     console.log(`✅ ${RAW_TARIFAS_DATA.length} Tarifas de Material insertadas exitosamente vía SQL directo.`);
  } catch (error) {
     console.error('CRÍTICO: Fallo al insertar Tarifas de Material vía SQL.');
     throw error;
  }
  
  // --- 5. Inserción de Productos ---
  for (const p of PRODUCTOS_DATA) {
    await db.producto.create({
      data: {
        id: p.id,
        nombre: p.nombre,
        referenciaFabricante: p.modelo,
        espesor: parseFloat(p.espesor) || 0,
        largo: parseFloat(p.largo) || 0,
        ancho: parseFloat(p.ancho) || 0,
        precioUnitario: parseFloat(p.precioUnitario) || 0,
        pesoUnitario: parseFloat(p.pesoUnitario) || 0,
        costoUnitario: parseFloat(p.costo) || 0,
        tieneTroquel: p.tieneTroquel || false,
        clienteId: p.clienteId || null,
        fabricanteId: fabricanteMap.get(p.fabricante),
        materialId: materialMap.get(p.material),
      },
    });
  }
  console.log(`- ${PRODUCTOS_DATA.length} productos insertados.`);
  
  console.log('¡SEEDING DE DATOS BASE COMPLETADO!');

}

main()
  .catch((e) => {
    console.error("Error durante el SEEDING:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
    console.log("Desconectado de la base de datos. SEEDING FINALIZADO.");
  });
SEEDER_EOF

# --- 3. EJECUCIÓN DE PRISMA MIGRATE RESET Y SEEDING ---
echo "--- 3. EJECUCIÓN DE PRISMA MIGRATE RESET Y SEEDING ---"

# 3.1. REINICIO FORZADO DE LA BASE DE DATOS Y APLICACIÓN DE MIGRACIONES
npx prisma migrate reset --force

# 3.2. EJECUTAR SCRIPT DE SEEDING
node $SEEDER_PATH

echo "--- OPERACIÓN COMPLETA ---"
