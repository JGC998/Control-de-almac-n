import { db } from './db';
import { logApiError } from './logger';

/**
 * Genera el siguiente número de secuencia para un tipo dado (pedido, presupuesto, etc.)
 * con reset automático por año
 * 
 * @param {string} type - Tipo de documento ('pedido', 'presupuesto', etc.)
 * @returns {Promise<string>} - Número formateado (ej: "PEDIDO-001-2026")
 */
// NOTA: getNextNumber() se llama deliberadamente FUERA de la transacción Prisma de
// creación del documento. En SQLite, hacer un upsert dentro de una transacción que
// a su vez escribe otras tablas puede causar "SQLITE_BUSY / database is locked".
// Con concurrencia baja (app interna), el riesgo de número duplicado es mínimo.
// En producción con MySQL se puede mover dentro de la transacción usando SELECT ... FOR UPDATE.
export async function getNextNumber(type) {
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
