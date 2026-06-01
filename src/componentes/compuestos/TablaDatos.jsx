import React from 'react';
import Link from 'next/link';
import { Search, Inbox } from 'lucide-react';

/**
 * Componente TablaDatos - Tabla genérica para listados (Server Component)
 * 
 * REEMPLAZA:
 * - PedidosTable (pedidos/page.js)
 * - PresupuestosTable (presupuestos/page.js)
 * 
 * @param {Object} props
 * @param {Array} datos - Array de datos a mostrar
 * @param {Array<ColumnaDef>} columnas - Definición de columnas
 * @param {string} titulo - Título del bloque
 * @param {React.ElementType} icono - Icono para el título
 * @param {boolean} colapsable - Si es colapsable
 * @param {boolean} colapsadoInicial - Estado inicial si es colapsable
 * @param {string} mensajeVacio - Mensaje cuando no hay datos
 * @param {string} rutaBase - Ruta base para enlaces (ej: "/pedidos")
 * @param {string} campoEnlace - Campo para construir el enlace (ej: "id")
 * @param {boolean} mostrarAccionVer - Mostrar botón Ver en acciones
 * 
 * ColumnaDef = {
 *   clave: string,          // Campo del objeto (soporta anidados: "cliente.nombre")
 *   etiqueta: string,       // Header de la columna
 *   formato?: 'moneda'|'fecha'|'insignia',  // Formato especial
 *   insigniaConfig?: { [valor]: variante }  // Config para formato 'insignia'
 * }
 */

// Mapa de variantes de insignia a clases CSS
const variantMap = {
    exito: 'badge-success',
    error: 'badge-error',
    advertencia: 'badge-warning',
    info: 'badge-info',
    neutral: 'badge-neutral',
    primario: 'badge-primary',
};

export default function TablaDatos({
    datos = [],
    columnas = [],
    titulo = null,
    icono: Icono = null,
    colapsable = false,
    colapsadoInicial = false,
    mensajeVacio = 'No hay datos disponibles.',
    rutaBase = null,
    campoEnlace = 'id',
    mostrarAccionVer = true,
    className = '',
}) {
    if (datos.length === 0 && !colapsable) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-base-content/30">
                <Inbox className="w-12 h-12 mb-3" />
                <p className="text-sm">{mensajeVacio}</p>
            </div>
        );
    }

    if (datos.length === 0 && colapsable) return null;

    const renderCelda = (fila, columna) => {
        // Si la columna define su propio render, usarlo directamente
        if (typeof columna.render === 'function') {
            return columna.render(fila);
        }

        const valor = obtenerValorAnidado(fila, columna.clave);

        // Formatos especiales
        switch (columna.formato) {
            case 'moneda':
                return `${Number(valor || 0).toFixed(2)} €`;

            case 'fecha':
                return valor ? new Date(valor).toLocaleDateString() : '-';

            case 'insignia':
                const variantes = columna.insigniaConfig || {};
                const variante = variantes[valor] || 'neutral';
                return (
                    <span className={`badge ${variantMap[variante] || 'badge-neutral'}`}>
                        {valor}
                    </span>
                );

            default:
                return valor ?? '-';
        }
    };

    const tabla = (
        <div className="overflow-x-auto">
            <table className="table table-sm table-zebra w-full">
                <thead>
                    <tr className="text-xs uppercase tracking-wider text-base-content/50">
                        {columnas.map((col, i) => (
                            <th key={col.clave || i}>{col.etiqueta}</th>
                        ))}
                        {mostrarAccionVer && rutaBase && <th />}
                    </tr>
                </thead>
                <tbody>
                    {datos.map((fila, filaIndex) => (
                        <tr key={fila.id || filaIndex} className="hover">
                            {columnas.map((col, colIndex) => (
                                <td key={col.clave || colIndex}>
                                    {colIndex === 0 && rutaBase ? (
                                        <Link
                                            href={`${rutaBase}/${fila[campoEnlace]}`}
                                            className="link link-primary font-semibold font-mono text-sm"
                                        >
                                            {renderCelda(fila, col)}
                                        </Link>
                                    ) : (
                                        renderCelda(fila, col)
                                    )}
                                </td>
                            ))}
                            {mostrarAccionVer && rutaBase && (
                                <td className="text-right">
                                    <Link
                                        href={`${rutaBase}/${fila[campoEnlace]}`}
                                        className="btn btn-xs btn-ghost min-h-11 touch-manipulation"
                                    >
                                        Ver →
                                    </Link>
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    // Si tiene título, envolver en card colapsable
    if (titulo) {
        if (colapsable) {
            return (
                <div className={`collapse collapse-arrow bg-base-100 shadow-xl border border-base-200 ${className}`}>
                    <input type="checkbox" defaultChecked={!colapsadoInicial} />
                    <div className="collapse-title text-xl font-medium flex items-center gap-2">
                        {Icono && <Icono className="w-5 h-5" />}
                        {titulo} ({datos.length})
                    </div>
                    <div className="collapse-content p-0">
                        {tabla}
                    </div>
                </div>
            );
        }

        return (
            <div className={`card bg-base-100 shadow-xl border border-base-200 ${className}`}>
                <div className="card-body">
                    <h2 className="card-title flex items-center gap-2">
                        {Icono && <Icono className="w-6 h-6" />}
                        {titulo} ({datos.length})
                    </h2>
                    {tabla}
                </div>
            </div>
        );
    }

    return tabla;
}

// Utilidad para valores anidados
function obtenerValorAnidado(obj, ruta) {
    if (!ruta) return undefined;
    return ruta.split('.').reduce((acc, parte) => acc?.[parte], obj);
}
