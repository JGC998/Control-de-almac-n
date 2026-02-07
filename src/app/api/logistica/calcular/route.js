import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { calculoLogisticaSchema } from '@/lib/validations';

/**
 * Algoritmo de determinación de tipología según especificación Pallex 2026
 * Orden estricto de evaluación para encontrar la tarifa más económica aplicable
 */
function determinarTipologia(peso, altura, tipoPale) {
    // 1. PARCEL: Solo si es Medio Palé y cumple límites
    if (tipoPale === 'MEDIO' && peso <= 100 && altura <= 150) {
        return 'parcel';
    }

    // 2. MINI_QUARTER
    if (peso <= 175 && altura <= 80) {
        return 'miniQuarter';
    }

    // 3. QUARTER
    if (peso <= 350 && altura <= 100) {
        return 'quarter';
    }

    // 4. MINI_LIGHT
    if (peso <= 300 && altura <= 220) {
        return 'miniLight';
    }

    // 5. HALF
    if (peso <= 650 && altura <= 140) {
        return 'half';
    }

    // 6. LIGHT (Prioridad sobre FULL para palés altos pero ligeros)
    if (peso <= 500 && altura <= 245) {
        return 'light';
    }

    // 7. MEGA_LIGHT
    if (peso <= 750 && altura <= 220) {
        return 'megaLight';
    }

    // 8. FULL
    if (peso <= 900 && altura <= 200) {
        return 'full';
    }

    // 9. MEGA_FULL (por defecto si excede todos los límites)
    return 'megaFull';
}

export async function POST(request) {
    try {
        const body = await request.json();

        // Validar con Zod
        const validation = calculoLogisticaSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                {
                    error: 'Validación fallida',
                    details: validation.error.errors.map(err => ({
                        field: err.path.join('.'),
                        message: err.message
                    }))
                },
                { status: 400 }
            );
        }

        const { provincia, peso, altura, tipoPale } = validation.data;

        // 1. Obtener configuración de paletizado
        const configPale = await db.configPaletizado.findUnique({
            where: { tipo: tipoPale }
        });

        if (!configPale) {
            return NextResponse.json(
                { error: `Configuración de palé "${tipoPale}" no encontrada` },
                { status: 404 }
            );
        }

        // Calcular coste de paletizado
        const costePaletizado =
            configPale.costePale +
            configPale.costeFilm +
            configPale.costeFleje +
            configPale.costePrecinto;

        // 2. Determinar tipología según algoritmo
        const tipologia = determinarTipologia(
            parseFloat(peso),
            parseFloat(altura),
            tipoPale
        );

        // 3. Buscar tarifa de transporte por provincia
        const tarifa = await db.tarifaTransporte.findFirst({
            where: { provincia: provincia.toUpperCase() }
        });

        if (!tarifa) {
            return NextResponse.json(
                { error: `Provincia "${provincia}" no encontrada en tarifas` },
                { status: 404 }
            );
        }

        // Obtener precio según tipología
        const costeTransporte = tarifa[tipologia] || 0;

        // Calcular total
        const costeTotal = costePaletizado + costeTransporte;

        // Preparar respuesta con desglose completo
        return NextResponse.json({
            costePaletizado: parseFloat(costePaletizado.toFixed(2)),
            costeTransporte: parseFloat(costeTransporte.toFixed(2)),
            costeTotal: parseFloat(costeTotal.toFixed(2)),
            tipologia,
            tipoPale,
            provincia: tarifa.provincia,
            desglose: {
                pale: parseFloat(configPale.costePale.toFixed(2)),
                film: parseFloat(configPale.costeFilm.toFixed(4)),
                fleje: parseFloat(configPale.costeFleje.toFixed(4)),
                precinto: parseFloat(configPale.costePrecinto.toFixed(4)),
                materiales: parseFloat((
                    configPale.costeFilm +
                    configPale.costeFleje +
                    configPale.costePrecinto
                ).toFixed(2))
            },
            parametros: {
                peso: parseFloat(peso),
                altura: parseFloat(altura)
            }
        });

    } catch (error) {
        console.error('Error en cálculo logístico:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor', details: error.message },
            { status: 500 }
        );
    }
}
