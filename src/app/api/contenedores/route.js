import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

const containersFilePath = path.join(process.cwd(), 'src/data/contenedores.json');

export async function GET() {
  try {
    const fileContents = await fs.readFile(containersFilePath, 'utf8');
    const containers = JSON.parse(fileContents);
    return NextResponse.json(containers);
  } catch (error) {
    console.error('Error reading containers data:', error);
    return NextResponse.json({ message: 'Error reading containers data' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const newContainer = await request.json();
    const fileContents = await fs.readFile(containersFilePath, 'utf8');
    const containers = JSON.parse(fileContents);

    // Assign a simple ID for new containers if not provided
    newContainer.id = newContainer.id || `CONT-${Date.now()}`;
    containers.push(newContainer);

    await fs.writeFile(containersFilePath, JSON.stringify(containers, null, 2), 'utf8');
    return NextResponse.json(newContainer, { status: 201 });
  } catch (error) {
    console.error('Error writing new container data:', error);
    return NextResponse.json({ message: 'Error writing new container data' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { id } = await request.json();
    const fileContents = await fs.readFile(containersFilePath, 'utf8');
    let containers = JSON.parse(fileContents);

    const containerIndex = containers.findIndex(c => c.id === id);
    if (containerIndex === -1) {
      return NextResponse.json({ message: 'Container not found' }, { status: 404 });
    }

    containers[containerIndex].estado = 'Llegado';

    await fs.writeFile(containersFilePath, JSON.stringify(containers, null, 2), 'utf8');
    return NextResponse.json(containers[containerIndex]);
  } catch (error) {
    console.error('Error updating container data:', error);
    return NextResponse.json({ message: 'Error updating container data' }, { status: 500 });
  }
}
