import { NextResponse } from 'next/server';
import { readData } from '../../../utils/dataManager';

const FILENAME = 'movimientos.json';

// GET /api/movimientos - Obtiene todos los movimientos
export async function GET() {
  try {
    const movimientos = await readData(FILENAME);
    return NextResponse.json(movimientos);
  } catch (error) {
    console.error(`Error reading ${FILENAME}:`, error);
    return NextResponse.json({ error: `Failed to read ${FILENAME}` }, { status: 500 });
  }
}
