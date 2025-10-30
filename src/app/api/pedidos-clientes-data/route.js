import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const FILE_PATH = path.join(process.cwd(), 'src', 'data', 'pedidos-clientes.json');

export async function GET() {
  try {
    const data = await fs.promises.readFile(FILE_PATH, 'utf-8');
    return NextResponse.json(JSON.parse(data));
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File not found, return empty array
      return NextResponse.json([]);
    }
    console.error("Error reading pedidos-clientes.json:", error);
    return NextResponse.json({ error: 'Failed to read pedidos-clientes data' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const content = await request.json();
    await fs.promises.writeFile(FILE_PATH, JSON.stringify(content, null, 2), 'utf-8');
    return NextResponse.json({ message: 'Pedidos clientes data updated successfully' });
  } catch (error) {
    console.error("Error writing pedidos-clientes.json:", error);
    return NextResponse.json({ error: 'Failed to write pedidos-clientes data' }, { status: 500 });
  }
}
