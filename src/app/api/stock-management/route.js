import { NextResponse } from 'next/server';
import { readData, writeData, updateData } from '../../../utils/dataManager';

const STOCK_FILE_NAME = 'stock.json';

export async function PUT(request) {
  try {
    const newStockContent = await request.json();
    // TODO: Add input validation for newStockContent
    await writeData(STOCK_FILE_NAME, newStockContent);
    return NextResponse.json({ message: 'Stock data updated successfully' });
  } catch (error) {
    console.error("Error writing stock.json:", error);
    return NextResponse.json({ error: 'Failed to write stock data', details: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const { id, updatedFields } = await request.json();

    if (!id || !updatedFields) {
      return NextResponse.json({ message: 'ID y campos a actualizar son requeridos' }, { status: 400 });
    }

    const success = await updateData(STOCK_FILE_NAME, id, updatedFields);

    if (!success) {
      return NextResponse.json({ message: 'Item de stock no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Item de stock actualizado correctamente' });
  } catch (error) {
    console.error("Error updating stock item:", error);
    return NextResponse.json({ error: 'Failed to update stock item', details: error.message }, { status: 500 });
  }
}
