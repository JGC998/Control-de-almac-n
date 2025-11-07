'use client';
import CatalogManager from '@/components/CatalogManager';
import { Layers, Factory, Users, Truck, FileText, DollarSign } from 'lucide-react';

export default function GestionCatalogosPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 flex items-center">
        <Layers className="mr-2" /> Gestión de Catálogos Maestros
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* --- Fabricantes --- */}
        <CatalogManager
          title="Fabricantes"
          endpoint="/api/fabricantes"
          initialForm={{ nombre: '' }}
          columns={[
            { key: 'nombre', label: 'Nombre' },
          ]}
        />
        
        {/* --- Materiales --- */}
        <CatalogManager
          title="Materiales"
          endpoint="/api/materiales"
          initialForm={{ nombre: '' }}
          columns={[
            { key: 'nombre', label: 'Nombre' },
          ]}
        />
        
        {/* --- Proveedores --- */}
        <CatalogManager
          title="Proveedores"
          endpoint="/api/proveedores"
          initialForm={{ nombre: '', email: '', telefono: '', direccion: '' }}
          columns={[
            { key: 'nombre', label: 'Nombre' },
            { key: 'email', label: 'Email' },
            { key: 'telefono', label: 'Teléfono' },
          ]}
        />
        
        {/* --- Referencias Bobina --- */}
        <CatalogManager
          title="Referencias de Bobina"
          endpoint="/api/configuracion/referencias"
          initialForm={{ nombre: '', ancho: 0, lonas: 0, pesoPorMetroLineal: 0 }}
          columns={[
            { key: 'nombre', label: 'Referencia' },
            { key: 'ancho', label: 'Ancho (mm)' },
            { key: 'lonas', label: 'Lonas' },
            { key: 'pesoPorMetroLineal', label: 'Peso (kg/m)' },
          ]}
        />
        
        {/* --- Tarifas Material --- */}
        <CatalogManager
          title="Tarifas de Material"
          endpoint="/api/precios"
          initialForm={{ material: '', espesor: 0, precio: 0, peso: 0 }}
          columns={[
            { key: 'material', label: 'Material' },
            { key: 'espesor', label: 'Espesor (mm)' },
            { key: 'precio', label: 'Precio (€/m²)' },
            { key: 'peso', label: 'Peso (kg/m²)' },
          ]}
        />
      </div>
    </div>
  );
}
