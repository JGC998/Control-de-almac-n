import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const STOCK_FILE = path.join(process.cwd(), 'public', 'data', 'stock.json');

export async function PUT(request) {
  try {
    const newStockContent = await request.json();
    await fs.promises.writeFile(STOCK_FILE, JSON.stringify(newStockContent, null, 2), 'utf-8');
    return NextResponse.json({ message: 'Stock data updated successfully' });
  } catch (error) {
    console.error("Error writing stock.json:", error);
    return NextResponse.json({ error: 'Failed to write stock data', details: error.message }, { status: 500 });
  }
}
