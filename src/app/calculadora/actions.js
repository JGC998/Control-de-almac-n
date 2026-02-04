"use server";
import { db } from '@/lib/db';

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

        const id = parseInt(productoId);
        if (isNaN(id)) {
            return { error: 'ID de producto inválido.' };
        }

        // Obtener el precio base del producto
        const producto = await db.producto.findUnique({
            where: { id: id },
            select: { precio: true, nombre: true }
        });

        if (!producto) {
            return { error: 'Producto no encontrado en la base de datos.' };
        }

        // Convertir Decimal a número flotante
        const precioBase = parseFloat(producto.precio);
        const area = ancho * alto;
        const precioTotal = area * precioBase;

        return {
            precio: parseFloat(precioTotal.toFixed(2)),
            detalle: `${producto.nombre} (${ancho}m x ${alto}m = ${area.toFixed(2)}m²) a ${precioBase.toFixed(2)} €/m²`
        };

    } catch (error) {
        console.error('Error en calculateCustomProductPrice:', error);
        return { error: 'Error interno al calcular el precio.' };
    }
}
