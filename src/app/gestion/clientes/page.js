"use client";
import { PaginaGestion } from '@/componentes/patrones';
import { User } from 'lucide-react';

/**
 * Página de Gestión de Clientes (Refactorizada)
 * 
 * Antes: 153 líneas de código repetitivo
 * Ahora: ~40 líneas de configuración declarativa
 */

// Definición de columnas para la tabla
const columnasCliente = [
  { clave: 'nombre', etiqueta: 'Nombre' },
  {
    clave: 'categoria',
    etiqueta: 'Categoría',
    formato: 'insignia',
    insigniaConfig: {
      'FABRICANTE': 'primario',
      'INTERMEDIARIO': 'info',
      'CLIENTE FINAL': 'exito',
      'NORMAL': 'neutral',
    }
  },
  { clave: 'email', etiqueta: 'Email' },
  { clave: 'telefono', etiqueta: 'Teléfono' },
];

// Definición de campos del formulario
const camposCliente = [
  {
    clave: 'nombre',
    etiqueta: 'Nombre',
    requerido: true,
    placeholder: 'Nombre del cliente'
  },
  {
    clave: 'categoria',
    etiqueta: 'Categoría',
    tipo: 'selector',
    opciones: ['FABRICANTE', 'INTERMEDIARIO', 'CLIENTE FINAL', 'NORMAL'],
    placeholder: 'Selecciona categoría...'
  },
  {
    clave: 'email',
    etiqueta: 'Email',
    tipo: 'email',
    placeholder: 'email@ejemplo.com'
  },
  {
    clave: 'direccion',
    etiqueta: 'Dirección',
    placeholder: 'Dirección postal'
  },
  {
    clave: 'telefono',
    etiqueta: 'Teléfono',
    tipo: 'telefono',
    placeholder: '+34 600 000 000'
  },
];

export default function GestionClientesPage() {
  return (
    <PaginaGestion
      titulo="Gestión de Clientes"
      icono={User}
      recursoApi="/api/clientes"
      columnas={columnasCliente}
      campos={camposCliente}
      rutaDetalle="/gestion/clientes"
      tituloNuevo="Nuevo Cliente"
      tituloEditar="Editar Cliente"
    />
  );
}
