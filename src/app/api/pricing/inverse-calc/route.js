import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request) {
    try {
        const { targetPrice, quantity, marginId, marginRule } = await request.json();

        if (!targetPrice || quantity <= 0) {
            return NextResponse.json(
                { message: 'Precio objetivo y cantidad válida son requeridos' },
                { status: 400 }
            );
        }

        let rule = marginRule;

        // Si nos pasan un ID, buscamos la regla en la BD
        if (marginId) {
            rule = await db.reglaMargen.findUnique({
                where: { id: marginId }
            });

            if (!rule) {
                return NextResponse.json({ message: 'Regla de margen no encontrada' }, { status: 404 });
            }
        }

        if (!rule || !rule.multiplicador) {
            return NextResponse.json(
                { message: 'Se requiere una regla de margen válida con multiplicador' },
                { status: 400 }
            );
        }

        // FÓRMULA DE PRECIO DE VENTA:
        // PV = (Coste * Multiplicador) + (GastoFijoTotal / Cantidad)

        // DESPEJANDO EL COSTE:
        // PV - (GastoFijoTotal / Cantidad) = Coste * Multiplicador
        // (PV - (GastoFijoTotal / Cantidad)) / Multiplicador = Coste

        const gastoFijoUnitario = (rule.gastoFijo || 0) / quantity;
        const precioSinFijos = targetPrice - gastoFijoUnitario;

        // Si los gastos fijos ya superan el precio, el coste tendría que ser negativo (imposible)
        if (precioSinFijos <= 0) {
            return NextResponse.json({
                maxCost: 0,
                breakdown: {
                    targetPrice,
                    fixedCostPerUnit: gastoFijoUnitario,
                    marginMultiplier: rule.multiplicador,
                    message: 'El precio objetivo no cubre ni los gastos fijos.'
                }
            });
        }

        const maxCost = precioSinFijos / rule.multiplicador;

        return NextResponse.json({
            maxCost: parseFloat(maxCost.toFixed(4)), // 4 decimales para precisión
            breakdown: {
                targetPrice,
                quantity,
                marginName: rule.descripcion || 'Personalizado',
                marginMultiplier: rule.multiplicador,
                fixedCostTotal: rule.gastoFijo || 0,
                fixedCostPerUnit: parseFloat(gastoFijoUnitario.toFixed(4)),
                formula: `(${targetPrice} - ${gastoFijoUnitario.toFixed(4)}) / ${rule.multiplicador}`
            }
        });

    } catch (error) {
        console.error('Error en cálculo inverso:', error);
        return NextResponse.json(
            { message: 'Error al realizar el cálculo' },
            { status: 500 }
        );
    }
}
