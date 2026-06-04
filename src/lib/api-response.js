import { NextResponse } from 'next/server';

export const ApiResponse = {
  ok:          (data, status = 200)           => NextResponse.json(data, { status }),
  created:     (data)                          => NextResponse.json(data, { status: 201 }),
  noContent:   ()                              => new NextResponse(null, { status: 204 }),
  notFound:    (msg = 'No encontrado')         => NextResponse.json({ message: msg }, { status: 404 }),
  conflict:    (msg = 'Conflicto de datos')    => NextResponse.json({ message: msg }, { status: 409 }),
  badRequest:  (msg = 'Datos inválidos')       => NextResponse.json({ message: msg }, { status: 400 }),
  serverError: (msg = 'Error interno')         => NextResponse.json({ message: msg }, { status: 500 }),
  unauthorized:(msg = 'No autorizado')         => NextResponse.json({ message: msg }, { status: 401 }),
};
