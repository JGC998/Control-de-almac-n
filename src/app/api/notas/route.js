import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const dataFilePath = path.join(process.cwd(), 'src', 'data', 'notas.json');

async function readNotes() {
    try {
        const data = await fs.readFile(dataFilePath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return []; // Return empty array if file doesn't exist
        }
        throw error;
    }
}

async function writeNotes(data) {
    await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2));
}

// GET all notes
export async function GET() {
    const notes = await readNotes();
    return NextResponse.json(notes);
}

// POST a new note
export async function POST(req) {
    const { content } = await req.json();
    if (!content) {
        return NextResponse.json({ message: 'El contenido no puede estar vacío.' }, { status: 400 });
    }
    const notes = await readNotes();
    const newNote = {
        id: Date.now(), // Simple unique ID
        content,
    };
    notes.push(newNote);
    await writeNotes(notes);
    return NextResponse.json(newNote, { status: 201 });
}

// DELETE a note
export async function DELETE(req) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
        return NextResponse.json({ message: 'Se requiere el ID de la nota.' }, { status: 400 });
    }

    const notes = await readNotes();
    const filteredNotes = notes.filter(note => note.id !== parseInt(id));

    if (notes.length === filteredNotes.length) {
        return NextResponse.json({ message: 'No se encontró la nota.' }, { status: 404 });
    }

    await writeNotes(filteredNotes);
    return NextResponse.json({ message: 'Nota eliminada correctamente.' });
}