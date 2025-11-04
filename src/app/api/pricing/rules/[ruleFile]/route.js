import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/pricing/rules/[ruleFile]
export async function GET(request, { params: paramsPromise }) {
  try {
    const { ruleFile } = await paramsPromise; // <-- CORREGIDO

    let data;
    if (ruleFile === 'margenes.json') {
      data = await db.reglaMargen.findMany();
    } else if (ruleFile === 'descuentos.json') {
      data = await db.reglaDescuento.findMany({ include: { tiers: true } });
    } else if (ruleFile === 'precios_especiales.json') {
      data = await db.precioEspecial.findMany();
    } else {
      return NextResponse.json({ message: 'Archivo de regla no válido' }, { status: 400 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error al obtener reglas' }, { status: 500 });
  }
}
