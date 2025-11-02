import { NextResponse } from 'next/server';
import { calculatePrice } from '@/utils/pricingEngine';

export async function POST(request) {
  try {
    const body = await request.json();
    const { productId, clientId, quantity } = body;

    if (!productId || !clientId || quantity === undefined) {
      return NextResponse.json({ message: 'Faltan parámetros: se requiere productId, clientId y quantity.' }, { status: 400 });
    }

    const lineItem = { productId, quantity };
    const priceData = await calculatePrice(lineItem, clientId);

    return NextResponse.json(priceData);

  } catch (error) {
    console.error('Error en la API de cálculo de precios:', error);
    return NextResponse.json({ message: 'Error interno al calcular el precio.' }, { status: 500 });
  }
}
