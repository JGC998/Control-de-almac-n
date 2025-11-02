import { readData } from '@/utils/dataManager';

/**
 * El motor de precios.
 * Lee todas las reglas y datos para calcular el precio final de un item.
 * @param {object} lineItem - El item de línea del presupuesto (ej. { productId, quantity }).
 * @param {string} clientId - El ID del cliente.
 * @returns {Promise<object>} Un objeto con el precio final y detalles del cálculo.
 */
export async function calculatePrice(lineItem, clientId) {
    // 1. Cargar todos los datos y reglas necesarios de forma concurrente
    const [products, clients, specialPrices, margins, discounts] = await Promise.all([
        readData('productos.json'),
        readData('clientes.json'),
        readData('precios_especiales.json'),
        readData('margenes.json'),
        readData('descuentos.json')
    ]);

    const product = products.find(p => p.id === lineItem.productId);
    const client = clients.find(c => c.id === clientId);

    if (!product) {
        return { finalPrice: 0, basePrice: 0, rule: 'Producto no encontrado' };
    }

    // --- Jerarquía de Cálculo de Precios ---

    // 1. Precio Especial (máxima prioridad)
    const specialPriceRule = specialPrices.find(r => r.clienteId === clientId && r.productoId === product.id);
    if (specialPriceRule) {
        return { finalPrice: specialPriceRule.precio, basePrice: specialPriceRule.precio, rule: 'Precio Especial' };
    }

    // 2. Precio Base (calculado por margen o usando precioUnitario como fallback)
    let basePrice = product.precioUnitario || 0;
    if (product.costo > 0) {
        const marginRuleByCategory = margins.find(r => r.tipo === 'categoria' && r.categoria === product.categoria);
        const generalMarginRule = margins.find(r => r.tipo === 'general');
        
        if (marginRuleByCategory) {
            basePrice = product.costo * marginRuleByCategory.valor;
        } else if (generalMarginRule) {
            basePrice = product.costo * generalMarginRule.valor;
        }
    }
    
    let currentPrice = basePrice;
    let discountDescription = 'Precio Base';

    // 3. Descuentos (por fecha, volumen y categoría)
    const today = new Date();
    const applicableDiscounts = discounts.filter(rule => {
        const isDateValid = (!rule.fechaInicio || new Date(rule.fechaInicio) <= today) && (!rule.fechaFin || new Date(rule.fechaFin) >= today);
        return isDateValid;
    });

    // Aplicar el mejor descuento de categoría o volumen (no son acumulables entre sí)
    let bestProductDiscount = 0;

    applicableDiscounts.forEach(rule => {
        // Descuento por categoría
        if (rule.tipo === 'categoria' && rule.categoria === product.categoria && rule.descuento > bestProductDiscount) {
            bestProductDiscount = rule.descuento;
            discountDescription = rule.descripcion;
        }
        // Descuento por volumen
        if (rule.tipo === 'volumen' && rule.categoria === product.categoria) {
            const sortedTiers = (rule.tiers || []).sort((a, b) => b.cantidadMinima - a.cantidadMinima);
            const applicableTier = sortedTiers.find(tier => lineItem.quantity >= tier.cantidadMinima);
            if (applicableTier && applicableTier.descuento > bestProductDiscount) {
                bestProductDiscount = applicableTier.descuento;
                discountDescription = rule.descripcion;
            }
        }
    });

    if (bestProductDiscount > 0) {
        currentPrice = currentPrice * (1 - bestProductDiscount);
    }

    // 4. Descuento de Cliente (se aplica al final, acumulable sobre el precio ya descontado)
    const clientDiscountRule = applicableDiscounts.find(rule => rule.tipo === 'cliente' && rule.tierCliente === client?.tier);
    if (clientDiscountRule) {
        currentPrice = currentPrice * (1 - clientDiscountRule.descuento);
        discountDescription += ` + ${clientDiscountRule.descripcion}`;
    }

    return {
        finalPrice: currentPrice,
        basePrice: basePrice,
        rule: discountDescription
    };
}
