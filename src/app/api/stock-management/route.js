import { NextResponse } from 'next/server';
import { readData, writeData } from '../../../utils/dataManager';

const STOCK_FILE_NAME = 'stock.json';

export async function PUT(request) {
  try {
    const newStockContent = await request.json();
    await writeData(STOCK_FILE_NAME, newStockContent);
    return NextResponse.json({ message: 'Stock data updated successfully' });
  } catch (error) {
    console.error("Error writing stock.json:", error);
    return NextResponse.json({ error: 'Failed to write stock data', details: error.message }, { status: 500 });
  }
}
