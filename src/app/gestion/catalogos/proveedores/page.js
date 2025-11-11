"use client";
import CatalogManager from '@/components/CatalogManager';
import { Truck } from 'lucide-react';

export default function GestionProveedoresPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 flex items-center">
        <Truck className="mr-2" /> Gestión de Proveedores
      </h1>
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
    </div>
  );
}
