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
