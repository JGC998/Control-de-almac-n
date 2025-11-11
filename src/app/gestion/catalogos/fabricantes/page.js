"use client";
import CatalogManager from '@/components/CatalogManager';
import { Factory } from 'lucide-react';

export default function GestionFabricantesPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 flex items-center">
        <Factory className="mr-2" /> Gestión de Fabricantes
      </h1>
        <CatalogManager
          title="Fabricantes"
          endpoint="/api/fabricantes"
          initialForm={{ nombre: '' }}
          columns={[
            { key: 'nombre', label: 'Nombre' },
          ]}
        />
    </div>
  );
}
