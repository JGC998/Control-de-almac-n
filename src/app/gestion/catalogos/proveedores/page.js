"use client";
import { PaginaGestion } from '@/componentes/patrones';
import { Truck } from 'lucide-react';

/**
 * Página de Gestión de Proveedores (Refactorizada)
 * Antes usaba GestorCatalogo, ahora usa PaginaGestion directamente
 */

const columnasProveedor = [
  { clave: 'nombre', etiqueta: 'Nombre' },
  { clave: 'email', etiqueta: 'Email' },
  { clave: 'telefono', etiqueta: 'Teléfono' },
];

const camposProveedor = [
  {
    clave: 'nombre',
    etiqueta: 'Nombre',
    requerido: true,
    placeholder: 'Nombre del proveedor'
  },
  {
    clave: 'email',
    etiqueta: 'Email',
    tipo: 'email',
    placeholder: 'email@proveedor.com'
  },
  {
    clave: 'telefono',
    etiqueta: 'Teléfono',
    tipo: 'telefono',
    placeholder: '+34 600 000 000'
  },
  {
    clave: 'direccion',
    etiqueta: 'Dirección',
    placeholder: 'Dirección postal'
  },
];

export default function GestionProveedoresPage() {
  return (
    <PaginaGestion
      titulo="Proveedores"
      icono={Truck}
      recursoApi="/api/proveedores"
      columnas={columnasProveedor}
      campos={camposProveedor}
      tituloNuevo="Nuevo Proveedor"
      tituloEditar="Editar Proveedor"
    />
  );
}
