import { NextResponse } from 'next/server';
import { readData } from '../../../utils/dataManager';

const FILENAME = 'materiales.json';

// GET /api/materiales - Obtiene todos los materiales
export async function GET() {
  try {
    const materiales = await readData(FILENAME);
    return NextResponse.json(materiales);
  } catch (error) {
    console.error(`Error reading ${FILENAME}:`, error);
    return NextResponse.json({ error: `Failed to read ${FILENAME}` }, { status: 500 });
  }
}
