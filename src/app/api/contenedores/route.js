import { NextResponse } from 'next/server';
import { readData, writeData, updateData } from '../../../../utils/dataManager';
import { v4 as uuidv4 } from 'uuid';

const FILENAME = 'contenedores.json';

export async function GET() {
  try {
    const containers = await readData(FILENAME);
    return NextResponse.json(containers);
  } catch (error) {
    console.error('Error reading containers data:', error);
    return NextResponse.json({ message: 'Error reading containers data' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const newContainer = await request.json();
    // TODO: Add input validation for newContainer

    const containers = await readData(FILENAME);

    newContainer.id = uuidv4(); // Use uuidv4 for robust ID generation
    newContainer.fechaCreacion = new Date().toISOString();
    newContainer.estado = 'Pendiente'; // Estado inicial

    containers.push(newContainer);

    await writeData(FILENAME, containers);
    return NextResponse.json(newContainer, { status: 201 });
  } catch (error) {
    console.error('Error creating new container data:', error);
    return NextResponse.json({ message: 'Error creating new container data' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { id, ...updatedFields } = await request.json(); // Destructure id and other fields

    if (!id) {
      return NextResponse.json({ message: 'ID del contenedor es requerido' }, { status: 400 });
    }

    // Use updateData to update only the specific container
    const success = await updateData(FILENAME, id, updatedFields);

    if (!success) {
      return NextResponse.json({ message: 'Contenedor no encontrado' }, { status: 404 });
    }

    // Optionally, read the updated container to return it
    const containers = await readData(FILENAME);
    const updatedContainer = containers.find(c => c.id === id);

    return NextResponse.json(updatedContainer);
  } catch (error) {
    console.error('Error updating container data:', error);
    return NextResponse.json({ message: 'Error updating container data' }, { status: 500 });
  }
}
