import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const material = searchParams.get('material');

  const filePath = path.join(process.cwd(), 'src', 'data', 'guias.json');
  try {
    const fileContents = fs.readFileSync(filePath, 'utf8');
    let guias = JSON.parse(fileContents);

    if (material && material !== 'Todos') {
      guias = guias.filter(guia => String(guia.material) === String(material));
    }
    return NextResponse.json(guias);
  } catch (error) {
    console.error('Error reading guias.json:', error);
    return NextResponse.json({ message: 'Error al cargar las guías' }, { status: 500 });
  }
}
