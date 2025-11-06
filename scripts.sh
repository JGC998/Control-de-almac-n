#!/bin/bash
#
# Script para corregir el error "productos.map is not a function" 
# y la validación de Prisma.
#
set -e

echo "--- Solucionando Error de Mapeo y Recarga de Prisma ---"

# 1. Forzar la regeneración del cliente de Prisma para corregir el error 500 del API (Unknown field 'cliente').
echo "1/2 -> Forzando 'npx prisma generate'..."
npx prisma generate

# 2. Corregir el componente src/app/gestion/productos/page.js para añadir la comprobación Array.isArray().
echo "2/2 -> Aplicando corrección Array.isArray en src/app/gestion/productos/page.js"

# Uso una edición más robusta para garantizar la inclusión de Array.isArray
awk '
/<tbody>/ {
  print;
  next;
}
/productos\.map/ {
  # Reemplaza la línea que causa el error por una versión robusta
  print "            {Array.isArray(productos) && productos.map((p) => (";
  next;
}
{ print }
' src/app/gestion/productos/page.js > src/app/gestion/productos/page.js.tmp && mv src/app/gestion/productos/page.js.tmp src/app/gestion/productos/page.js

echo "--- ✅ Corrección completada ---"
echo "El componente de productos ya no debería fallar, y el cliente de Prisma está actualizado."
echo "Por favor, **reinicia tu servidor** 'npm run dev' y verifica el funcionamiento."
