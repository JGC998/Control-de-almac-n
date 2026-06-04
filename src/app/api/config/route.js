import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';
import { clearEmisorCache } from '@/lib/pdfGenerator';

// Claves de empresa que invalidan la caché del emisor en pdfGenerator
const EMPRESA_KEYS = new Set(['empresa_nombre', 'empresa_nif', 'empresa_direccion', 'empresa_telefono']);

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
    logApiError(error);
    return NextResponse.json({ message: 'Error al obtener configuración' }, { status: 500 });
  }
}

const ALLOWED_CONFIG_KEYS = [
  'iva_rate', 'empresa_nombre', 'empresa_nif', 'empresa_telefono',
  'empresa_email', 'empresa_direccion', 'empresa_cp', 'empresa_ciudad',
  'empresa_provincia', 'empresa_pais', 'empresa_web', 'empresa_logo',
  'longitud_barra_tacos', 'costeVulcanizadoMetro',
];

// PUT /api/config - Guarda o actualiza una o varias claves de configuración
export async function PUT(request) {
  try {
    const data = await request.json(); // { key: value, ... }
    const entries = Object.entries(data);

    const invalidKeys = entries.map(([k]) => k).filter(k => !ALLOWED_CONFIG_KEYS.includes(k));
    if (invalidKeys.length > 0) {
      return NextResponse.json(
        { message: `Claves no permitidas: ${invalidKeys.join(', ')}` },
        { status: 400 }
      );
    }

    await Promise.all(
      entries.map(([key, value]) =>
        db.config.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
        })
      )
    );

    // BACK-01: Invalidar caché del emisor si se actualizaron datos de empresa
    if (entries.some(([k]) => EMPRESA_KEYS.has(k))) {
      clearEmisorCache();
    }

    return NextResponse.json({ message: `${entries.length} clave(s) guardada(s)` });
  } catch (error) {
    logApiError(error);
    return NextResponse.json({ message: 'Error al guardar configuración' }, { status: 500 });
  }
}
