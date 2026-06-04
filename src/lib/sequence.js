import { db } from './db';
import { logApiError } from './logger';

/**
 * Genera el siguiente número de secuencia para un tipo dado (pedido, presupuesto, etc.)
 * con reset automático por año
 * 
 * @param {string} type - Tipo de documento ('pedido', 'presupuesto', etc.)
 * @returns {Promise<string>} - Número formateado (ej: "PEDIDO-001-2026")
 */
// NOTA: El `upsert` con `increment: 1` es atómico a nivel de BD (una sola sentencia SQL
// en SQLite y MySQL), por lo que no genera números duplicados bajo concurrencia.
// Se mantiene fuera de la transacción de creación del documento para evitar deadlocks
// en SQLite ("database is locked"). El único efecto de una creación fallida es un
// hueco en la numeración, lo cual es aceptable.
// BUG-01: Añadida whitelist de tipos válidos para evitar inserciones arbitrarias en Sequence.
const VALID_SEQUENCE_TYPES = ['pedido', 'presupuesto', 'albaran', 'factura', 'rectificativa'];

export async function getNextNumber(type) {
    if (!VALID_SEQUENCE_TYPES.includes(type)) {
        throw new Error(`Tipo de secuencia inválido: "${type}". Valores permitidos: ${VALID_SEQUENCE_TYPES.join(', ')}`);
    }
    const currentYear = new Date().getFullYear();
    try {
        const sequence = await db.sequence.upsert({
            where: {
                name_year: {
                    name: type,
                    year: currentYear
                }
            },
            update: {
                value: { increment: 1 }
            },
            create: {
                name: type,
                year: currentYear,
                value: 1
            }
        });

        const paddedNumber = String(sequence.value).padStart(3, '0');
        const prefix = type.toUpperCase();

        return `${prefix}-${paddedNumber}-${currentYear}`;
    } catch (error) {
        logApiError(error, `getNextNumber(${type})`);
        throw error;
    }
}

/**
 * Obtiene el número actual sin incrementar
 * 
 * @param {string} type - Tipo de documento
 * @returns {Promise<number>} - Valor actual de la secuencia
 */
export async function getCurrentNumber(type) {
    const currentYear = new Date().getFullYear();
    try {
        const sequence = await db.sequence.findUnique({
            where: {
                name_year: {
                    name: type,
                    year: currentYear
                }
            }
        });

        return sequence?.value || 0;
    } catch (error) {
        logApiError(error, `getCurrentNumber(${type})`);
        throw error;
    }
}

/**
 * Resetea una secuencia (útil para testing o correcciones)
 * 
 * @param {string} type - Tipo de documento
 * @param {number} year - Año (opcional, por defecto año actual)
 */
export async function resetSequence(type, year = null) {
    const targetYear = year || new Date().getFullYear();

    await db.sequence.delete({
        where: {
            name_year: {
                name: type,
                year: targetYear
            }
        }
    }).catch(() => {
        // Ignorar si no existe
    });
}
