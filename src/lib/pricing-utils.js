import { db } from '@/lib/db';
import { roundToTwoDecimals } from '@/utils/helpers-matematicos';

/**
 * Calcula el subtotal, tax y total de una lista de items basándose en la configuración de IVA.
 * @param {Array<{quantity: number, unitPrice: number}>} items 
 * @param {object} tx - Cliente de Prisma (opcional, para transacciones)
 * @returns {Promise<{subtotal: number, tax: number, total: number}>}
 */
export async function calculateTotalsBackend(items, tx = db) {
    // 1. Obtener tasa de IVA
    const configIva = await (tx || db).config.findUnique({
      where: { key: 'iva_rate' },
    });
    const ivaRate = configIva ? parseFloat(configIva.value) : 0.21;
    
    // 2. Calcular subtotal
    const subtotal = items.reduce((acc, item) => 
        acc + (parseFloat(item.quantity || 0) * parseFloat(item.unitPrice || 0))
    , 0);

    // 3. Calcular tax y total
    const tax = subtotal * ivaRate;
    const total = subtotal + tax;

    return {
        subtotal: roundToTwoDecimals(subtotal),
        tax: roundToTwoDecimals(tax),
        total: roundToTwoDecimals(total),
    };
}
