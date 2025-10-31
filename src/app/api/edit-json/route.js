import { NextResponse } from 'next/server';
import { listDataFiles, readData, writeData } from '../../../utils/dataManager';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const filename = searchParams.get('filename');

    if (action === 'list') {
      const allowedFiles = ['fabricantes.json', 'materiales.json', 'plantillas.json', 'precios.json', 'stock.json'];
      const files = (await listDataFiles()).filter(file => allowedFiles.includes(file));
      // We map the file names to the format expected by the frontend.
      const jsonFiles = files.map(file => ({
        name: file,
        path: `src/data/${file}`,
      }));
      return NextResponse.json(jsonFiles);
    }

    const allowedFiles = ['fabricantes.json', 'materiales.json', 'plantillas.json', 'precios.json', 'stock.json'];

    if (action === 'read') {
      if (!filename) {
        return NextResponse.json({ error: 'Filename is required for read action' }, { status: 400 });
      }
      if (!allowedFiles.includes(filename)) {
        return NextResponse.json({ error: 'Access to this file is forbidden' }, { status: 403 });
      }
      try {
        const content = await readData(filename);
        return NextResponse.json({ content });
      } catch (error) {
        // dataManager throws an error if file not found or parsing fails
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
    }

    return NextResponse.json({ error: 'Invalid action specified. Use "list" or "read".' }, { status: 400 });

  } catch (error) {
    console.error("Unhandled error in GET /api/edit-json:", error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  const allowedFiles = ['fabricantes.json', 'materiales.json', 'plantillas.json', 'precios.json', 'stock.json'];
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const filename = searchParams.get('filename');

    if (action === 'write') {
      if (!filename) {
        return NextResponse.json({ error: 'Filename is required for write action' }, { status: 400 });
      }
      if (!allowedFiles.includes(filename)) {
        return NextResponse.json({ error: 'Access to this file is forbidden' }, { status: 403 });
      }

      const { content } = await request.json();

      if (content === undefined) {
        return NextResponse.json({ error: 'Content is required in the request body' }, { status: 400 });
      }

      try {
        await writeData(filename, content);
        return NextResponse.json({ message: `File '${filename}' updated successfully` });
      } catch (error) {
        // dataManager handles validation and file system errors
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Invalid action specified. Use "write".' }, { status: 400 });

  } catch (error) {
    console.error("Unhandled error in PUT /api/edit-json:", error);
    // This catches errors like invalid JSON in the request body
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
