// src/lib/manejadores-api.js
import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { manejarErrorApi } from '@/utils/utils';

export function crearManejadoresCRUD(modelName, options = {}) {
  const model = db[modelName];

  const GET = async (request) => {
    try {
      const records = await model.findMany(options.findMany || {});
      return NextResponse.json(records);
    } catch (e) {
      return manejarErrorApi(e);
    }
  };

  const POST = async (request) => {
    try {
      const data = await request.json();
      
      // Lógica de mapeo opcional antes de crear
      const finalData = options.mapearCrear ? options.mapearCrear(data) : data;

      const newRecord = await model.create({ data: finalData });
      return NextResponse.json(newRecord, { status: 201 });
    } catch (e) {
      return manejarErrorApi(e);
    }
  };

  // Dejamos preparados PUT y DELETE para el futuro
  return { GET, POST };
}
