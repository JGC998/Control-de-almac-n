"use client";
import { PaginaGestion } from '@/componentes/patrones';
import { Factory } from 'lucide-react';

/**
 * Página de Gestión de Fabricantes (Refactorizada)
 * Antes usaba GestorCatalogo, ahora usa PaginaGestion directamente
 */

const columnasFabricante = [
  { clave: 'nombre', etiqueta: 'Nombre' },
];

const camposFabricante = [
  {
    clave: 'nombre',
    etiqueta: 'Nombre del Fabricante',
    requerido: true,
    placeholder: 'Ej: Bridgestone'
  },
];

export default function GestionFabricantesPage() {
  return (
    <PaginaGestion
      titulo="Fabricantes"
      icono={Factory}
      recursoApi="/api/fabricantes"
      columnas={columnasFabricante}
      campos={camposFabricante}
      tituloNuevo="Nuevo Fabricante"
      tituloEditar="Editar Fabricante"
    />
  );
}
