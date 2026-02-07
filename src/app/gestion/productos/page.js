"use client";
import { PaginaGestion } from '@/componentes/patrones';
import { Package } from 'lucide-react';

/**
 * Página de Gestión de Productos (Refactorizada)
 * 
 * Antes: 301 líneas de código repetitivo
 * Ahora: ~80 líneas de configuración declarativa
 */

// Definición de columnas para la tabla
const columnasProducto = [
  { clave: 'id', etiqueta: 'ID' },
  { clave: 'nombre', etiqueta: 'Nombre' },
  { clave: 'categoria', etiqueta: 'Categoría' },
  { clave: 'precio', etiqueta: 'Precio', formato: 'moneda' },
  {
    clave: 'stock',
    etiqueta: 'Stock',
    formato: 'insignia',
    insigniaConfig: (valor) => {
      if (valor > 10) return 'exito';
      if (valor > 0) return 'advertencia';
      return 'error';
    }
  },
];

// Definición de campos del formulario
const camposProducto = [
  {
    clave: 'nombre',
    etiqueta: 'Nombre',
    requerido: true,
    placeholder: 'Ej: Faldeta de goma'
  },
  {
    clave: 'categoria',
    etiqueta: 'Categoría',
    placeholder: 'Ej: Goma, Fieltro...'
  },
  {
    clave: 'precio',
    etiqueta: 'Precio (€)',
    tipo: 'numero',
    requerido: true,
    min: 0,
    step: '0.01',
    placeholder: '0.00'
  },
  {
    clave: 'stock',
    etiqueta: 'Stock',
    tipo: 'numero',
    min: 0,
    step: '1',
    valorInicial: 0
  },
  {
    clave: 'descripcion',
    etiqueta: 'Descripción',
    tipo: 'textarea',
    placeholder: 'Detalles adicionales...',
    filas: 3
  },
];

export default function GestionProductosPage() {
  return (
    <PaginaGestion
      titulo="Gestión de Productos"
      icono={Package}
      recursoApi="/api/productos"
      columnas={columnasProducto}
      campos={camposProducto}
      rutaDetalle="/gestion/productos"
      tituloNuevo="Nuevo Producto"
      tituloEditar="Editar Producto"
      exportModel="producto"
    />
  );
}