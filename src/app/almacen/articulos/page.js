"use client";
import { Box } from 'lucide-react';
import { PaginaGestion } from '@/componentes/patrones';

const CATEGORIAS = [
  { valor: 'CORDON',         etiqueta: 'Cordón' },
  { valor: 'BORDE_ONDULADO', etiqueta: 'Borde ondulado' },
  { valor: 'OTRO',           etiqueta: 'Otro' },
];

const UNIDADES = [
  { valor: 'M',   etiqueta: 'Metro (m)' },
  { valor: 'ML',  etiqueta: 'Metro lineal (ml)' },
  { valor: 'UDS', etiqueta: 'Unidades (uds)' },
  { valor: 'KG',  etiqueta: 'Kilogramos (kg)' },
];

const etiquetaCategoria = v => CATEGORIAS.find(c => c.valor === v)?.etiqueta ?? v;
const etiquetaUnidad    = v => UNIDADES.find(u => u.valor === v)?.etiqueta ?? v;

const columnas = [
  { clave: 'nombre',         etiqueta: 'Nombre' },
  { clave: 'categoria',      etiqueta: 'Categoría',  render: r => etiquetaCategoria(r.categoria) },
  { clave: 'unidad',         etiqueta: 'Unidad',          render: r => etiquetaUnidad(r.unidad) },
  { clave: 'precioUnitario', etiqueta: 'Precio',          formato: 'moneda' },
  { clave: 'fabricante',     etiqueta: 'Fabricante' },
  { clave: 'activo',         etiqueta: 'Estado',          render: r => r.activo ? 'Activo' : 'Inactivo' },
];

const campos = [
  {
    clave: 'nombre',
    etiqueta: 'Nombre',
    tipo: 'texto',
    requerido: true,
    placeholder: 'Ej: Cordón PVC 8mm negro',
  },
  {
    clave: 'categoria',
    etiqueta: 'Categoría',
    tipo: 'selector',
    requerido: true,
    opciones: CATEGORIAS.map(c => ({ valor: c.valor, etiqueta: c.etiqueta })),
  },
  {
    clave: 'unidad',
    etiqueta: 'Unidad de venta',
    tipo: 'selector',
    requerido: true,
    opciones: UNIDADES.map(u => ({ valor: u.valor, etiqueta: u.etiqueta })),
  },
  {
    clave: 'precioUnitario',
    etiqueta: 'Precio unitario (€)',
    tipo: 'numero',
    requerido: true,
    placeholder: '0.00',
  },
  {
    clave: 'costoUnitario',
    etiqueta: 'Coste unitario (€)',
    tipo: 'numero',
    placeholder: '0.00',
  },
  {
    clave: 'fabricante',
    etiqueta: 'Fabricante / Proveedor',
    tipo: 'texto',
    placeholder: 'Opcional',
  },
  {
    clave: 'descripcion',
    etiqueta: 'Descripción',
    tipo: 'textarea',
    placeholder: 'Notas o características del artículo',
  },
  {
    clave: 'activo',
    etiqueta: 'Activo',
    tipo: 'checkbox',
  },
];

const camposIniciales = {
  nombre: '',
  categoria: 'OTRO',
  unidad: 'UDS',
  precioUnitario: '',
  costoUnitario: '',
  fabricante: '',
  descripcion: '',
  activo: true,
};

export default function ArticulosPage() {
  return (
    <PaginaGestion
      titulo="Artículos varios"
      icono={Box}
      recursoApi="/api/articulos-simples"
      columnas={columnas}
      campos={campos}
      camposIniciales={camposIniciales}
      tituloNuevo="Nuevo artículo"
      tituloEditar="Editar artículo"
      transformarParaEnviar={data => ({
        ...data,
        precioUnitario: parseFloat(data.precioUnitario) || 0,
        costoUnitario: data.costoUnitario !== '' ? parseFloat(data.costoUnitario) : null,
        activo: data.activo === true || data.activo === 'true',
      })}
    />
  );
}
