"use client";
import React from 'react';
import { useParams, notFound } from 'next/navigation';
import useSWR from 'swr';
import Link from 'next/link';
import { ArrowLeft, Package, DollarSign, Ruler, Factory, Layers, MinusCircle } from 'lucide-react';

const fetcher = (url) => fetch(url).then((res) => res.json());

const InfoCard = ({ title, value, unit = '', icon: Icon = Package }) => (
  <div className="flex items-center p-4 bg-base-200 rounded-lg shadow-inner">
    <Icon className="w-5 h-5 mr-3 text-primary" />
    <div>
      <div className="text-sm font-medium text-gray-500">{title}</div>
      <div className="text-lg font-semibold">{value} {unit}</div>
    </div>
  </div>
);

export default function ProductoDetallePage() {
  const params = useParams();
  const { id } = params;

  // El endpoint ahora devuelve 'tarifaPrecioM2'
  const { data: producto, error, isLoading } = useSWR(id ? `/api/productos/${id}` : null, fetcher);

  if (isLoading) return <div className="flex justify-center items-center h-screen"><span className="loading loading-spinner loading-lg"></span></div>;
  if (error || !producto) {
      if (error?.status === 404) return notFound();
      return <div className="text-red-500 text-center">Error al cargar los detalles del producto.</div>;
  }
  
  // Función helper para manejar valores potencialmente nulos y formatear
  const formatValue = (value, fallback = 'N/A') => {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'number') return value.toFixed(2);
    return value;
  };
  
  // producto.precioUnitario ahora es el COSTO TOTAL DE LA PIEZA (Materia Prima)

  return (
    <div className="container mx-auto p-4">
      <Link href="/gestion/productos" className="btn btn-ghost mb-4">
        <ArrowLeft className="w-4 h-4" /> Volver a Productos
      </Link>
      
      <div className="bg-base-100 shadow-xl rounded-lg p-6">
        <div className="flex items-center mb-6">
          <Package className="w-8 h-8 mr-3 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">{producto.nombre}</h1>
            <p className="text-gray-500">Ref. Fabricante: {producto.referenciaFabricante || 'N/A'}</p>
          </div>
        </div>

        <div className="divider">Detalles Técnicos y de Costo</div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* Fila 1: Origen */}
          <InfoCard title="Material" value={producto.material?.nombre || 'N/A'} icon={Layers} />
          <InfoCard title="Fabricante" value={producto.fabricante?.nombre || 'N/A'} icon={Factory} />
          
          {/* Fila 2: Dimensiones */}
          <InfoCard title="Espesor" value={producto.espesor || 'N/A'} unit="mm" icon={Ruler} />
          <InfoCard title="Peso Unitario" value={formatValue(producto.pesoUnitario, '0.00')} unit="kg" icon={MinusCircle} />
          
          {/* Fila 3: Base Price (Materia Prima Cost) */}
          <InfoCard title="Largo" value={producto.largo || 'N/A'} unit="mm" icon={Ruler} />
          <InfoCard title="Ancho" value={producto.ancho || 'N/A'} unit="mm" icon={Ruler} />
          
          {/* NUEVO CAMPO: Precio de Tarifa por m2 (Obtenido del backend) */}
          <InfoCard 
            title="Precio Tarifa (€/m²)" 
            value={formatValue(producto.tarifaPrecioM2)} 
            unit="€" 
            icon={DollarSign} 
          />
          
          {/* ACTUALIZADO: Muestra el costo total de la pieza calculado */}
          <InfoCard 
            title="Costo Total Pieza" 
            value={formatValue(producto.precioUnitario, '0.00')} 
            unit="€" 
            icon={DollarSign} 
          />
        </div>
        
        <div className="divider">Precios de Venta (Pre-calculados por Tier)</div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InfoCard 
            title="Precio FABRICANTE" 
            value={formatValue(producto.precioVentaFab)} 
            unit="€" 
            icon={DollarSign}
          />
          <InfoCard 
            title="Precio INTERMEDIARIO" 
            value={formatValue(producto.precioVentaInt)} 
            unit="€" 
            icon={DollarSign}
          />
          <InfoCard 
            title="Precio CLIENTE FINAL" 
            value={formatValue(producto.precioVentaFin)} 
            unit="€" 
            icon={DollarSign}
          />
        </div>

      </div>
    </div>
  );
}
