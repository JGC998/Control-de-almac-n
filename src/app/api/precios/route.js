import { NextResponse } from 'next/server';
import { readData } from '../../../utils/dataManager';

const FILENAME = 'precios.json';

// GET /api/precios - Obtiene todos los precios
export async function GET() {
  try {
    const precios = await readData(FILENAME);
    return NextResponse.json(precios);
  } catch (error) {
    console.error(`Error reading ${FILENAME}:`, error);
    return NextResponse.json({ error: `Failed to read ${FILENAME}` }, { status: 500 });
  }
}
