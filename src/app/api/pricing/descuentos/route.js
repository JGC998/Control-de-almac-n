import { NextResponse } from 'next/server';

// Los modelos ReglaDescuento y DescuentoTier fueron eliminados del schema
// en la migración 20260504000000_feature_calculadora_pvc.
const GONE = () =>
  NextResponse.json(
    { message: 'Este recurso ya no está disponible en esta versión.' },
    { status: 410 }
  );

export async function GET() { return GONE(); }
export async function POST() { return GONE(); }
export async function PUT() { return GONE(); }
export async function DELETE() { return GONE(); }
