import { logUpdate } from '@/lib/audit';

// GET: Obtener configuración de paletizado
// ... (omitted, same as before) 

// PUT: Actualizar configuración de paletizado
export async function PUT(request) {
    try {
        const { tipo, costePale, costeFilm, costeFleje, costePrecinto } = await request.json();

        if (!tipo) {
            return NextResponse.json({ error: 'Tipo de palé requerido' }, { status: 400 });
        }

        // Obtener config anterior
        const oldConfig = await db.configPaletizado.findUnique({
            where: { tipo },
            select: { costePale: true, costeFilm: true, costeFleje: true, costePrecinto: true }
        });

        const updatedData = {
            costePale: parseFloat(costePale),
            costeFilm: parseFloat(costeFilm),
            costeFleje: parseFloat(costeFleje),
            costePrecinto: parseFloat(costePrecinto)
        };

        const updated = await db.configPaletizado.update({
            where: { tipo },
            data: updatedData
        });

        // Registrar en Audit Log
        if (oldConfig) {
            await logUpdate(
                'ConfigPaletizado',
                updated.id,
                oldConfig,
                updatedData,
                'Admin'
            );
        }

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error updating config paletizado:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
