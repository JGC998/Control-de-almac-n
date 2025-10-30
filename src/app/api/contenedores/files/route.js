import { NextResponse } from 'next/server';
import { writeFile, readdir } from 'fs/promises';
import path from 'path';
import fs from 'fs';

export async function POST(request) {
  try {
    const data = await request.formData();
    const file = data.get('file');

    if (!file) {
      return NextResponse.json({ message: 'No file uploaded' }, { status: 400 });
    }
    
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ message: 'Only PDF files are allowed' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'contenedores');

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Sanitize filename to prevent directory traversal
    const sanitizedFilename = path.basename(file.name);
    const filePath = path.join(uploadDir, sanitizedFilename);
    
    await writeFile(filePath, buffer);

    const publicPath = `/uploads/contenedores/${sanitizedFilename}`;

    return NextResponse.json({ message: 'File uploaded successfully', path: publicPath });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ message: 'Error uploading file' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'contenedores');

    if (!fs.existsSync(uploadDir)) {
      return NextResponse.json([]);
    }

    const files = await readdir(uploadDir);
    const fileDetails = files
      .filter(file => file.toLowerCase().endsWith('.pdf'))
      .map(file => ({
        name: file,
        url: `/uploads/contenedores/${file}`
      }));

    return NextResponse.json(fileDetails);
  } catch (error) {
    console.error('Error listing files:', error);
    return NextResponse.json({ message: 'Error listing files' }, { status: 500 });
  }
}
