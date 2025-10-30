import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIRECTORIES = [
  path.join(process.cwd(), 'public', 'data'),
  path.join(process.cwd(), 'src', 'data'),
];

async function getFilePath(filename) {
  if (typeof filename !== 'string' || filename.trim() === '') {
    throw new Error(`Invalid filename provided: "${filename}". Expected a non-empty string.`);
  }
  // Prevent directory traversal
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    throw new Error(`Invalid filename: "${filename}". Filename cannot contain path separators or '..'.`);
  }

  for (const dir of DATA_DIRECTORIES) {
    const filePath = path.join(dir, filename);
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }
  return null;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const filename = searchParams.get('filename');

    if (action === 'list') {
      let jsonFiles = [];
      for (const dir of DATA_DIRECTORIES) {
        try {
          const files = await fs.promises.readdir(dir);
          const jsonInDir = files.filter(file => file.endsWith('.json')).map(file => ({
            name: file,
            path: path.relative(process.cwd(), path.join(dir, file)),
          }));
          jsonFiles = jsonFiles.concat(jsonInDir);
        } catch (error) {
          console.warn(`Could not read directory ${dir}: ${error.message}`);
          // Continue to the next directory even if one fails
        }
      }
      return NextResponse.json(jsonFiles);
    } else if (action === 'read') {
      const filePath = await getFilePath(filename);

      if (!filePath) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }

      const content = await fs.promises.readFile(filePath, 'utf-8');
      try {
        return NextResponse.json({ content: JSON.parse(content) });
      } catch (jsonError) {
        console.error(`Error parsing JSON from file ${filePath}:`, jsonError);
        return NextResponse.json({ error: 'Invalid JSON content in file', details: jsonError.message }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: 'Invalid action specified. Use "list" or "read".' }, { status: 400 });
    }
  } catch (error) {
    console.error("Unhandled error in GET /api/edit-json:", error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const filename = searchParams.get('filename');

    if (action === 'write') {
      const filePath = await getFilePath(filename);

      if (!filePath) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }

      const { content } = await request.json();
      // Validate if the content is valid JSON before writing
      try {
        JSON.stringify(content, null, 2); // Attempt to stringify to validate
      } catch (jsonError) {
        console.error(`Error validating JSON content for file ${filePath}:`, jsonError);
        return NextResponse.json({ error: 'Invalid JSON content provided', details: jsonError.message }, { status: 400 });
      }

      await fs.promises.writeFile(filePath, JSON.stringify(content, null, 2), 'utf-8');
      return NextResponse.json({ message: 'File updated successfully' });
    } else {
      return NextResponse.json({ error: 'Invalid action specified. Use "write".' }, { status: 400 });
    }
  } catch (error) {
    console.error("Unhandled error in PUT /api/edit-json:", error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
