import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ required: !!process.env.AUTH_PIN });
}
