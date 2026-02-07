import { db } from './db';

/**
 * Genera el siguiente número de secuencia para un tipo dado (pedido, presupuesto, etc.)
 * con reset automático por año
 * 
 * @param {string} type - Tipo de documento ('pedido', 'presupuesto', etc.)
 * @returns {Promise<string>} - Número formateado (ej: "PEDIDO-001-2026")
 */
export async function getNextNumber(type) {
    const currentYear = new Date().getFullYear();

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
}

/**
 * Obtiene el número actual sin incrementar
 * 
 * @param {string} type - Tipo de documento
 * @returns {Promise<number>} - Valor actual de la secuencia
 */
export async function getCurrentNumber(type) {
    const currentYear = new Date().getFullYear();

    const sequence = await db.sequence.findUnique({
        where: {
            name_year: {
                name: type,
                year: currentYear
            }
        }
    });

    return sequence?.value || 0;
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
