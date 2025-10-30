// This API route is no longer used.
// The tracking functionality has been replaced by embedding the VesselFinder website in an iframe directly on the page.
// This file can be safely deleted.

import { NextResponse } from 'next/server';

export async function POST(request) {
  return NextResponse.json({ message: 'This endpoint is deprecated.' }, { status: 410 });
}