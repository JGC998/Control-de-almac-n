#!/bin/bash

# --- CONFIGURACIÓN ---
PROJECT_DIR="/ruta/a/tu/proyecto/en/el/servidor" # <--- CAMBIA ESTO
DB_FILE="$PROJECT_DIR/prisma/dev.db"
BACKUP_DIR="$PROJECT_DIR/backups"
DATE=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_NAME="backup_$DATE.db"

# 1. Crear directorio si no existe
mkdir -p $BACKUP_DIR

# 2. Hacer la copia de seguridad (sqlite3 .backup es más seguro que cp si la app está corriendo)
# Si no tienes sqlite3 instalado, usa: cp "$DB_FILE" "$BACKUP_DIR/$BACKUP_NAME"
if command -v sqlite3 &> /dev/null; then
    sqlite3 "$DB_FILE" ".backup '$BACKUP_DIR/$BACKUP_NAME'"
else
    cp "$DB_FILE" "$BACKUP_DIR/$BACKUP_NAME"
fi

# 3. Comprimir para ahorrar espacio (Opcional, recomendado)
gzip "$BACKUP_DIR/$BACKUP_NAME"

echo "✅ Backup creado: $BACKUP_DIR/$BACKUP_NAME.gz"

# 4. Mantenimiento: Borrar backups de más de 30 días
find "$BACKUP_DIR" -name "backup_*.db.gz" -mtime +30 -delete
echo "🧹 Backups antiguos eliminados."

# 0 3 * * * /ruta/a/tu/proyecto/scripts/backup-diario.sh >> /ruta/a/tu/proyecto/backups/backup.log 2>&1