#!/bin/bash

echo "⚙️ Iniciando corrección final de la API de presupuestos..."

FILE_PRES_POST="src/app/api/presupuestos/route.js"

if [ ! -f "$FILE_PRES_POST" ]; then
    echo "❌ Error: No se encontró el archivo $FILE_PRES_POST."
    exit 1
fi

# =======================================================
# PASO 1: Asegurar que la API confía en los totales del frontend
# =======================================================

echo "   Reemplazando la función POST completa en $FILE_PRES_POST..."

# Reemplazar el bloque de la función POST con la versión que usa los valores del cliente
POST_FUNCTION_CORRECTED=$(cat <<'EOF'
// POST /api/presupuestos - Crea un nuevo presupuesto
export async function POST(request) {
  try {
    const data = await request.json();
    // FIX: Recibimos los totales ya calculados (subtotal, tax, total) y el marginId
    const { clienteId, items, notes, estado, marginId, subtotal, tax, total } = data; 

    if (!clienteId || !items || items.length === 0) {
      return NextResponse.json({ message: 'Datos incompletos. Se requiere clienteId y al menos un item.' }, { status: 400 });
    }

    const newQuoteNumber = await getNextPresupuestoNumber();
    // FIX: Eliminada la llamada a calculateTotalsBackend para usar los valores del cliente.

    const newQuote = await db.presupuesto.create({
      data: {
        id: uuidv4(), 
        numero: newQuoteNumber,
        fechaCreacion: new Date().toISOString(),
        estado: estado || 'Borrador',
        
        // FIX: Usamos connect para el cliente
        cliente: { connect: { id: clienteId } },
        marginId: marginId, // FIX: Guardar el ID del margen
        
        notas: notes,
        subtotal: subtotal, // FIX: Usar Subtotal de Venta (con margen/gasto)
        tax: tax,           // FIX: Usar IVA calculado
        total: total,       // FIX: Usar Total calculado
        
        items: {
          create: items.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            productoId: item.productId,
          })),
        },
      },
    });

    return NextResponse.json(newQuote, { status: 201 });
  } catch (error) {
    console.error('Error al crear el presupuesto:', error);
    return NextResponse.json({ message: 'Error interno al guardar el nuevo presupuesto.' }, { status: 500 });
  }
}
EOF
)

# 1. Crear el archivo temporal con el nuevo contenido
echo "$POST_FUNCTION_CORRECTED" > "$FILE_PRES_POST.new"

# 2. Buscar el inicio y fin del bloque de la función POST
START_LINE=$(grep -n "export async function POST(request)" "$FILE_PRES_POST" | head -n 1 | cut -d: -f1)
END_LINE=$(awk -v start="$START_LINE" '/^}$/ { if (NR > start) { print NR; exit } }' "$FILE_PRES_POST")

if [ -z "$START_LINE" ] || [ -z "$END_LINE" ] || [ "$START_LINE" -ge "$END_LINE" ]; then
    echo "❌ Error: No se pudo encontrar el bloque 'export async function POST(request)' para reemplazar."
    rm "$FILE_PRES_POST.new"
    exit 1
fi

# 3. Reemplazar el bloque de líneas (compatible con GNU y BSD sed)
if sed --version 2>/dev/null | grep -q GNU; then
    # GNU Sed (Linux)
    sed -i "${START_LINE},${END_LINE}c$(cat "$FILE_PRES_POST.new")" "$FILE_PRES_POST"
else
    # BSD Sed (macOS)
    sed -i '' "${START_LINE},${END_LINE}c\\
$(cat "$FILE_PRES_POST.new" | sed 's/\([&/\]\)/\\\1/g' | tr '\n' '§' | sed 's/§/\\'$'\n''/g')" "$FILE_PRES_POST"
fi

rm "$FILE_PRES_POST.new"

echo "✅ $FILE_PRES_POST modificado. Los nuevos presupuestos guardarán el Total correcto."
echo "-------------------------------------------------------"
echo "🎉 Tareas pendientes:"
echo "1. **Reinicia tu servidor**."
echo "2. **Crea un NUEVO presupuesto** para asegurarte de que el valor Total (2483.16 €) se guarde correctamente en la base de datos."
echo "3. El presupuesto 2025-008 ya está grabado con el total incorrecto (1770.23 €) y debe ser editado manualmente para corregir la BD."