import { NextResponse } from 'next/server';
import { db } from '@/lib/db'; 
import { promises as fs } from 'fs'; 
import path from 'path';
import Formidable from 'formidable';
import { Readable } from 'stream'; 

// --- Configuración de Next.js para deshabilitar el Body Parser ---
// Esto es necesario para que 'formidable' pueda leer el raw stream de la petición.
// Usamos la nueva sintaxis de Next.js 13+ (Route Segment Config).

// Exportar una variable para definir el runtime (Node.js) y asegurar que 
// el manejo de la petición sea siempre dinámico, evitando el caching estático.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// El antiguo 'export const config = { api: { bodyParser: false } }' se ha eliminado.

// Función de utilidad para manejar tipos
const getSafeString = (value) => {
    return (typeof value === 'string' && value.trim() !== '') ? value.trim() : null;
};

// Función auxiliar para convertir el Web Stream a Node.js Stream
function convertWebStreamToNodeStream(webStream) {
    if (!webStream) {
        return null;
    }
    // 'Readable.fromWeb' convierte el Web Stream de Next.js a un Stream compatible con Node/Formidable
    return Readable.fromWeb(webStream);
}

// Función auxiliar para parsear FormData (manejo de archivo)
async function parseForm(request) {
    return new Promise((resolve, reject) => {
        // Configuración de formidable: Guardar archivos en la carpeta temporal por defecto.
        const form = Formidable({}); 
        
        const nodeStream = convertWebStreamToNodeStream(request.body);
        
        if (!nodeStream) {
             return reject(new Error('El cuerpo de la petición está vacío. Asegúrate de que el archivo se adjuntó.'));
        }

        // Crear un objeto stub (IncomingMessage) para que formidable pueda procesarlo.
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

        // Pasar el objeto stub a formidable
        form.parse(formidableReqStub, (err, fields, files) => {
            if (err) return reject(err);
            resolve({ fields, files });
        });
    });
}


// GET /api/documentos
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo'); 
    const referencia = searchParams.get('referencia');

    let whereClause = {};

    if (tipo) {
      whereClause.tipo = tipo;
    }
    
    // CORRECCIÓN DE PRISMA: Eliminamos 'mode: "insensitive"'
    if (referencia) {
        whereClause.referencia = {
            contains: referencia,
        };
    }

    const documentos = await db.documento.findMany({
      where: whereClause,
      include: {
        producto: {
          select: {
            nombre: true,
            fabricanteId: true,
            referenciaFabricante: true,
          }
        },
      },
      orderBy: { fechaSubida: 'desc' },
    });

    return NextResponse.json(documentos);
  } catch (error) {
    console.error('Error al obtener documentos:', error);
    return NextResponse.json({ message: 'Error al obtener documentos' }, { status: 500 });
  }
}


// POST /api/documentos - Maneja la subida de archivos
export async function POST(request) {
  try {
    // 1. Parsear FormData para obtener campos y archivos
    const { fields, files } = await parseForm(request);

    // Formidable devuelve un array de archivos (aunque solo esperamos uno)
    const uploadedFile = files.fileUpload ? files.fileUpload[0] : null; 
    
    // Convertir campos de array a string (como los devuelve formidable)
    const data = {};
    for (const key in fields) {
        data[key] = Array.isArray(fields[key]) ? fields[key][0] : fields[key];
    }
    
    const { tipo, referencia, descripcion, productoId, maquinaUbicacion } = data;

    // 2. Validación y Subida de Archivo
    if (!getSafeString(tipo) || !getSafeString(referencia) || !uploadedFile) {
      return NextResponse.json({ message: 'Tipo, Referencia y Archivo son requeridos.' }, { status: 400 });
    }
    
    const originalFileName = uploadedFile.originalFilename;
    const rutaArchivo = `/planos/${originalFileName}`; // Ruta para guardar en DB
    const targetPath = path.join(process.cwd(), 'public', 'planos', originalFileName);

    // Mover el archivo del temporal al directorio público (usando copyFile)
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.copyFile(uploadedFile.filepath, targetPath);
    // Se recomienda usar copyFile + unlink en lugar de rename para evitar el error EXDEV (cross-device link)
    await fs.unlink(uploadedFile.filepath);
    
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
    
    return NextResponse.json({ message: `Error en la subida y registro: ${error.message}` }, { status: 500 });
  }
}


// DELETE /api/documentos (Implementación base)
export async function DELETE(request) {
    try {
        const { id } = await request.json(); // Esperamos el ID para la eliminación
        
        if (!id) {
            return NextResponse.json({ message: 'ID del documento requerido.' }, { status: 400 });
        }
        
        // La lógica de borrado del archivo físico debe estar en 
        // /api/documentos/[id]/route.js (DELETE) para mayor seguridad y mejor patrón REST.
        
        return NextResponse.json({ message: 'DELETE a /api/documentos/route.js no implementado. Use /api/documentos/[id]' }, { status: 405 });

    } catch (error) {
        console.error('Error en DELETE /api/documentos:', error);
        return NextResponse.json({ message: 'Error en la solicitud de eliminación.' }, { status: 500 });
    }
}