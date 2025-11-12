#!/bin/bash

echo "⚙️ Iniciando script para forzar la revalidación de la lista de pedidos en el cliente..."

FILE_PAGE_DETAIL="src/app/pedidos/[id]/page.js"

if [ ! -f "$FILE_PAGE_DETAIL" ]; then
    echo "❌ Error: No se encontró el archivo $FILE_PAGE_DETAIL."
    exit 1
fi

# El patrón de búsqueda del mutate es: mutate('/api/pedidos');
# Lo reemplazaremos por un patrón que Next.js/SWR procesa mejor en entornos de caché RSC.

# 1. Reemplazar la llamada a mutate para la lista general dentro de handleUpdateStatus
# Reemplazar: mutate('/api/pedidos'); 
# Por: mutate('/api/pedidos'); router.refresh(); // La línea router.refresh() obliga a la re-renderización.

# NOTA: En Next.js 16 (Turbopack), router.refresh() es la forma más limpia de revalidar datos RSC.

# La línea 157 contiene mutate('/api/pedidos');
# Reemplazar la línea 157
sed -i 's/mutate('\/api\/pedidos'\);/mutate('\/api\/pedidos'\); router.refresh();/' "$FILE_PAGE_DETAIL"

echo "✅ $FILE_PAGE_DETAIL modificado. Se añadió 'router.refresh()' para forzar la actualización de la lista de pedidos (RSC)."
echo "-------------------------------------------------------"
echo "🎉 Por favor, **reinicia tu servidor** y marca el pedido PED-2025-004 nuevamente como completado. El listado debe actualizarse al volver a él."
