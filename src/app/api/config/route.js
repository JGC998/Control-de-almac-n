import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/config - Obtiene la configuración como un objeto
export async function GET() {
  try {
    const settingsList = await db.config.findMany();
    
    // Convertir el array de settings en un objeto clave/valor
    const configObject = settingsList.reduce((acc, setting) => {
      // Intentar parsear el valor si es un número
      const numValue = parseFloat(setting.value);
      acc[setting.key] = isNaN(numValue) ? setting.value : numValue;
      return acc;
    }, {});

    return NextResponse.json(configObject);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error al obtener configuración' }, { status: 500 });
  }
}

// PUT /api/config - Guarda o actualiza una o varias claves de configuración
export async function PUT(request) {
  try {
    const data = await request.json(); // { key: value, ... }
    const entries = Object.entries(data);
    await Promise.all(
      entries.map(([key, value]) =>
        db.config.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
        })
      )
    );
    return NextResponse.json({ message: `${entries.length} clave(s) guardada(s)` });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error al guardar configuración' }, { status: 500 });
  }
}
