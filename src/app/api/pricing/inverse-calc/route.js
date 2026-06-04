import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';
import { z } from 'zod';

const inverseCalcSchema = z.object({
    targetPrice: z.number({ invalid_type_error: 'El precio objetivo debe ser un número' }).positive('El precio objetivo debe ser mayor que 0'),
    quantity:    z.number({ invalid_type_error: 'La cantidad debe ser un número' }).int().positive('La cantidad debe ser un entero positivo'),
    marginId:    z.string().uuid().optional().nullable(),
    marginRule:  z.object({ multiplicador: z.number().positive(), gastoFijo: z.number().optional(), descripcion: z.string().optional() }).optional().nullable(),
});

export async function POST(request) {
    try {
        const parsed = inverseCalcSchema.safeParse(await request.json());
        if (!parsed.success) {
            return NextResponse.json({ message: parsed.error.issues[0].message }, { status: 400 });
        }
        const { targetPrice, quantity, marginId, marginRule } = parsed.data;

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
        logApiError(error, 'Error en cálculo inverso:');
        return NextResponse.json(
            { message: 'Error al realizar el cálculo' },
            { status: 500 }
        );
    }
}
