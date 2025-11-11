"use client";
import CatalogManager from '@/components/CatalogManager';
import { Layers } from 'lucide-react';

export default function GestionMaterialesPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 flex items-center">
        <Layers className="mr-2" /> Gestión de Materiales
      </h1>
        <CatalogManager
          title="Materiales"
          endpoint="/api/materiales"
          initialForm={{ nombre: '' }}
          columns={[
            { key: 'nombre', label: 'Nombre' },
          ]}
        />
    </div>
  );
}
