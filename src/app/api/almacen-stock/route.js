import { NextResponse } from 'next/server';
import { readData, writeData } from '../../../utils/dataManager';

export async function GET() {
  try {
    const currentStock = await readData('stock.json');
    return NextResponse.json(currentStock);
  } catch (error) {
    console.error("Unhandled error in GET /api/almacen-stock:", error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const updatedStock = await request.json();
    await writeData('stock.json', updatedStock);
    return NextResponse.json({ message: 'Stock updated successfully' });
  } catch (error) {
    console.error("Error in PUT /api/almacen-stock:", error);
    return NextResponse.json({ error: 'Failed to update stock', details: error.message }, { status: 500 });
  }
}
