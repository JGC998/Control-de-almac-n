import { NextResponse } from 'next/server';
import { db } from '@/lib/db'; 
import { promises as fs } from 'fs'; // Usamos las promesas de fs
import path from 'path';
import Formidable from 'formidable';
import { Readable } from 'stream'; 

// Función de utilidad para manejar tipos
const getSafeString = (value) => {
    return (typeof value === 'string' && value.trim() !== '') ? value.trim() : null;
};

// Función auxiliar para convertir el Web Stream a Node.js Stream
function convertWebStreamToNodeStream(webStream) {
    if (!webStream) {
        return null;
    }
    return Readable.fromWeb(webStream);
}

// Función auxiliar para manejar la subida de archivos
async function parseForm(request) {
    return new Promise((resolve, reject) => {
        const form = Formidable({});
        
        // 1. Convertir el cuerpo de la petición a un Node.js Readable Stream
        const nodeStream = convertWebStreamToNodeStream(request.body);
        
        if (!nodeStream) {
             return reject(new Error('El cuerpo de la petición está vacío. Asegúrate de que el archivo se adjuntó.'));
        }

        // 2. Crear un objeto stub (IncomingMessage)
        const formidableReqStub = {
            headers: Object.fromEntries(request.headers.entries()),
            method: request.method,
            on: nodeStream.on.bind(nodeStream),
            once: nodeStream.once.bind(nodeStream),
            pipe: nodeStream.pipe.bind(nodeStream),
            read: nodeStream.read.bind(nodeStream),
            pause: nodeStream.pause.bind(nodeStream), 
            resume: nodeStream.resume.bind(nodeStream),
        };

        // 3. Pasar el objeto stub a formidable
        form.parse(formidableReqStub, (err, fields, files) => {
            if (err) return reject(err);
            resolve({ fields, files });
        });
    });
}

// GET /api/documentos - (Lógica de lectura sin cambios)
export async function GET(request) {
  // ... (GET logic remains the same)
  try {
    const { searchParams } = new URL(request.url);
    const productoId = searchParams.get('productoId');
    const tipo = searchParams.get('tipo');
    const referencia = searchParams.get('referencia');

    const whereClause = {};
    if (productoId) {
      whereClause.productoId = productoId;
    }
    if (tipo) {
      whereClause.tipo = tipo;
    }
    if (referencia) {
        whereClause.referencia = {
            contains: referencia,
            mode: 'insensitive'
        };
    }

    const documentos = await db.documento.findMany({
      where: whereClause,
      include: {
        producto: {
          select: { nombre: true, fabricanteId: true, referenciaFabricante: true }
        }
      },
      orderBy: { fechaSubida: 'desc' },
    });
    
    return NextResponse.json(documentos);
  } catch (error) {
    console.error('Error al obtener documentos:', error);
    return NextResponse.json({ message: 'Error al obtener documentos' }, { status: 500 });
  }
}


// POST /api/documentos - Maneja la subida real del archivo
export async function POST(request) {
  try {
    // 1. Parsear FormData para obtener campos y archivos
    const { fields, files } = await parseForm(request);

    const uploadedFile = files.fileUpload ? files.fileUpload[0] : null;
    const rutaArchivo = uploadedFile ? `/planos/${uploadedFile.originalFilename}` : null;
    
    // Convertir campos de array a string (como los devuelve formidable)
    const data = {};
    for (const key in fields) {
        data[key] = Array.isArray(fields[key]) ? fields[key][0] : fields[key];
    }

    const { tipo, referencia, descripcion, productoId, maquinaUbicacion } = data;

    // 2. Validación y Subida de Archivo
    if (!getSafeString(tipo) || !getSafeString(referencia) || !rutaArchivo) {
      return NextResponse.json({ message: 'Tipo, Referencia y Archivo son requeridos.' }, { status: 400 });
    }
    
    // Mover el archivo del temporal al directorio público
    if (uploadedFile) {
        const targetPath = path.join(process.cwd(), 'public', 'planos', uploadedFile.originalFilename);
        await fs.mkdir(path.dirname(targetPath), { recursive: true });
        
        // FIX CRÍTICO: Usar COPY + UNLINK para evitar EXDEV (Cross-device link not permitted)
        await fs.copyFile(uploadedFile.filepath, targetPath);
        // Opcional: Eliminar el archivo temporal, aunque formidable a veces lo hace.
        // await fs.unlink(uploadedFile.filepath);
    }
    
    // 3. Guardar metadata en la base de datos
    const nuevoDocumento = await db.documento.create({
      data: {
        tipo: tipo,
        referencia: referencia,
        descripcion: getSafeString(descripcion),
        rutaArchivo: rutaArchivo, // Ruta relativa para el frontend
        productoId: getSafeString(productoId),
        maquinaUbicacion: getSafeString(maquinaUbicacion)
      },
    });
    
    return NextResponse.json(nuevoDocumento, { status: 201 });
  } catch (error) {
    console.error('Error al crear el documento (Subida):', error);
    if (error.code === 'P2002') {
        return NextResponse.json({ message: 'Ya existe un documento con la misma Referencia y Ruta de Archivo.' }, { status: 409 });
    }
    
    // Retornar mensaje de error específico para el usuario
    if (error.code === 'EXDEV') {
        return NextResponse.json({ message: 'Error de disco: No se pudo mover el archivo. Intenta de nuevo.' }, { status: 500 });
    }
    
    return NextResponse.json({ message: `Error en la subida y registro: ${error.message}` }, { status: 500 });
  }
}
