"use server";
import { db } from '@/lib/db';
import { logApiError } from '@/lib/logger';

/**
 * Calcula el precio de un producto personalizado basado en sus dimensiones.
 *
 * @param {number|string} productoId - ID del producto base.
 * @param {number} ancho - Ancho en metros.
 * @param {number} alto - Alto en metros.
 * @returns {Promise<{precio: number, detalle: string}|{error: string}>}
 */
export async function calculateCustomProductPrice(productoId, ancho, alto) {
    try {
        if (!productoId || !ancho || !alto) {
            return { error: 'Faltan parámetros requeridos (producto, ancho, alto).' };
        }

        if (typeof productoId !== 'string' || productoId.trim() === '') {
            return { error: 'ID de producto inválido.' };
        }

        // Obtener el precio base del producto
        const producto = await db.producto.findUnique({
            where: { id: productoId },
            select: { precioUnitario: true, nombre: true }
        });

        if (!producto) {
            return { error: 'Producto no encontrado en la base de datos.' };
        }

        const precioBase = parseFloat(producto.precioUnitario);
        const area = ancho * alto;
        const precioTotal = area * precioBase;

        return {
            precio: parseFloat(precioTotal.toFixed(2)),
            detalle: `${producto.nombre} (${ancho}m x ${alto}m = ${area.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})}m²) a ${precioBase.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €/m²`
        };

    } catch (error) {
        logApiError(error, 'Error en calculateCustomProductPrice');
        return { error: 'Error interno al calcular el precio.' };
    }
}
