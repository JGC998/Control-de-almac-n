import { NextResponse } from 'next/server';
import { writeFile, readdir } from 'fs/promises';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit

export async function POST(request) {
  try {
    const data = await request.formData();
    const file = data.get('file');
    const containerId = data.get('containerId'); // Expect containerId in formData

    if (!file) {
      return NextResponse.json({ message: 'No file uploaded' }, { status: 400 });
    }
    
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ message: 'Only PDF files are allowed' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ message: `File size exceeds the limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB` }, { status: 400 });
    }

    if (!containerId) {
      return NextResponse.json({ message: 'containerId is required' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const containerUploadDir = path.join(process.cwd(), 'public', 'uploads', 'contenedores', containerId);

    if (!fs.existsSync(containerUploadDir)) {
      fs.mkdirSync(containerUploadDir, { recursive: true });
    }

    // Sanitize filename and make it unique
    const fileExtension = path.extname(file.name);
    const uniqueFilename = `${uuidv4()}${fileExtension}`;
    const filePath = path.join(containerUploadDir, uniqueFilename);
    
    await writeFile(filePath, buffer);

    const publicPath = `/uploads/contenedores/${containerId}/${uniqueFilename}`;

    return NextResponse.json({ message: 'File uploaded successfully', path: publicPath, filename: uniqueFilename });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ message: 'Error uploading file' }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const containerId = searchParams.get('containerId');

    if (!containerId) {
      return NextResponse.json({ message: 'containerId is required' }, { status: 400 });
    }

    const containerUploadDir = path.join(process.cwd(), 'public', 'uploads', 'contenedores', containerId);

    if (!fs.existsSync(containerUploadDir)) {
      return NextResponse.json([]);
    }

    const files = await readdir(containerUploadDir);
    const fileDetails = files
      .filter(file => file.toLowerCase().endsWith('.pdf'))
      .map(file => ({
        name: file,
        url: `/uploads/contenedores/${containerId}/${file}`
      }));

    return NextResponse.json(fileDetails);
  } catch (error) {
    console.error('Error listing files:', error);
    return NextResponse.json({ message: 'Error listing files' }, { status: 500 });
  }
}
