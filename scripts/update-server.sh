#!/bin/bash
# Script para actualizar el servidor de forma segura
# Uso: ./scripts/update-server.sh

set -e

echo "🔄 Actualizando servidor..."
echo "========================================"

cd "$(dirname "$0")/.."

# 1. Backup antes de actualizar
echo "📦 Creando backup de seguridad..."
npm run backup

# 2. Guardar cambios locales
if [[ -n $(git status --porcelain) ]]; then
    echo "💾 Guardando cambios locales en stash..."
    git stash push -m "auto-stash before update $(date +%Y%m%d_%H%M%S)"
fi

# 3. Pull de cambios
echo "⬇️ Descargando últimos cambios..."
git pull origin main

# 4. Instalar dependencias
echo "📦 Instalando dependencias..."
npm install

# 5. Regenerar Prisma
echo "🔧 Regenerando Prisma Client..."
npx prisma generate

# 6. Aplicar migraciones
echo "📊 Aplicando migraciones de BD..."
npx prisma migrate deploy

# 7. Build
echo "🏗️ Compilando aplicación..."
npm run build

echo ""
echo "========================================"
echo "✅ Actualización completada"
echo ""
echo "📌 Próximos pasos:"
echo "   1. Reiniciar el servicio:"
echo "      pm2 restart all"
echo "      # o"
echo "      systemctl restart tu-servicio"
echo ""
