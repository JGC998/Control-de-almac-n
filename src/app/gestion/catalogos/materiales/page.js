"use client";
import { PaginaGestion } from '@/componentes/patrones';
import { Layers } from 'lucide-react';

/**
 * Página de Gestión de Materiales (Refactorizada)
 * Antes usaba GestorCatalogo, ahora usa PaginaGestion directamente
 */

const columnasMaterial = [
  { clave: 'nombre', etiqueta: 'Nombre' },
];

const camposMaterial = [
  {
    clave: 'nombre',
    etiqueta: 'Nombre del Material',
    requerido: true,
    placeholder: 'Ej: Goma, Fieltro, PVC'
  },
];

export default function GestionMaterialesPage() {
  return (
    <PaginaGestion
      titulo="Materiales"
      icono={Layers}
      recursoApi="/api/materiales"
      columnas={columnasMaterial}
      campos={camposMaterial}
      tituloNuevo="Nuevo Material"
      tituloEditar="Editar Material"
    />
  );
}
