import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request) {
  try {
    const { image } = await request.json();
    if (!image) {
      return NextResponse.json({ message: 'Image data is required' }, { status: 400 });
    }

    const base64Data = image.replace(/^data:image\/jpeg;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const timestampId = now.getTime();

    const dirPath = path.join(process.cwd(), 'public', 'fotos', String(year), month, day);
    const filePath = path.join(dirPath, `${timestampId}.jpg`);
    const publicPath = `/fotos/${year}/${month}/${day}/${timestampId}.jpg`;

    // Create directory if it doesn't exist
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    fs.writeFileSync(filePath, buffer);

    return NextResponse.json({ message: 'Photo saved successfully', path: publicPath });
  } catch (error) {
    console.error('Error saving photo:', error);
    return NextResponse.json({ message: 'Error saving photo' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const photosDir = path.join(process.cwd(), 'public', 'fotos');
    const photoFiles = [];

    const readDirRecursive = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          readDirRecursive(fullPath);
        } else if (entry.isFile() && (entry.name.endsWith('.jpg') || entry.name.endsWith('.jpeg') || entry.name.endsWith('.png'))) {
          const publicPath = fullPath.replace(path.join(process.cwd(), 'public'), '');
          photoFiles.push(publicPath.replace(/\\/g, '/')); // Ensure forward slashes for URL
        }
      }
    };

    if (fs.existsSync(photosDir)) {
      readDirRecursive(photosDir);
    }
    
    // Sort by date, newest first
    photoFiles.sort((a, b) => {
        // Extract timestamp from path /fotos/YYYY/MM/DD/timestamp.jpg
        const timestampA = path.basename(a, path.extname(a));
        const timestampB = path.basename(b, path.extname(b));
        return timestampB - timestampA;
    });

    return NextResponse.json(photoFiles);
  } catch (error) {
    console.error('Error listing photos:', error);
    return NextResponse.json({ message: 'Error listing photos' }, { status: 500 });
  }
}
