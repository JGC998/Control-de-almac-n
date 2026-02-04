#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# SCRIPT DE EXPORTACIÓN - EJECUTAR EN EL SERVIDOR MYSQL
# ═══════════════════════════════════════════════════════════════
# Este script exporta todas las tablas de la base de datos MySQL
# a archivos JSON para su posterior importación a PostgreSQL.
#
# USO:
#   1. Copiar este archivo al servidor Linux Mint
#   2. Editar las variables de conexión abajo
#   3. Ejecutar: chmod +x export_mysql.sh && ./export_mysql.sh
#   4. Copiar la carpeta 'export_data' a tu máquina local
# ═══════════════════════════════════════════════════════════════

# ========== CONFIGURACIÓN - EDITAR ESTOS VALORES ==========
DB_HOST="localhost"
DB_USER="root"
DB_PASS="tu_password_mysql"
DB_NAME="nombre_de_tu_base_datos"
# ===========================================================

# Crear carpeta de exportación
EXPORT_DIR="./export_data"
mkdir -p $EXPORT_DIR

echo "═══════════════════════════════════════"
echo "🚀 Iniciando exportación de MySQL..."
echo "   Base de datos: $DB_NAME"
echo "═══════════════════════════════════════"

# Función para exportar una tabla a JSON
export_table() {
    TABLE=$1
    echo "📦 Exportando: $TABLE..."
    
    mysql -h $DB_HOST -u $DB_USER -p$DB_PASS $DB_NAME \
        -e "SELECT * FROM $TABLE" \
        --batch --raw \
        | python3 -c "
import sys
import json
lines = sys.stdin.read().strip().split('\n')
if len(lines) < 2:
    print('[]')
else:
    headers = lines[0].split('\t')
    rows = []
    for line in lines[1:]:
        values = line.split('\t')
        row = {}
        for i, h in enumerate(headers):
            val = values[i] if i < len(values) else None
            # Convertir NULL a None
            if val == 'NULL' or val == '\\N':
                val = None
            row[h] = val
        rows.append(row)
    print(json.dumps(rows, ensure_ascii=False, indent=2))
" > "$EXPORT_DIR/$TABLE.json"
    
    COUNT=$(cat "$EXPORT_DIR/$TABLE.json" | python3 -c "import json,sys; print(len(json.load(sys.stdin)))")
    echo "   ✓ $COUNT registros exportados"
}

# Lista de tablas a exportar (en orden de dependencias)
# Ajustar según las tablas que existan en tu MySQL

echo ""
echo "Exportando tablas principales..."

# Tablas sin dependencias
export_table "Fabricante"
export_table "Material"
export_table "Cliente"
export_table "Proveedor"
export_table "Sequence"
export_table "Config"
export_table "Nota"

# Tablas de productos y precios
export_table "Producto"
export_table "Producto_Old"
export_table "TarifaMaterial"
export_table "ReglaMargen"
export_table "ReferenciaBobina"

# Stock y movimientos
export_table "Stock"
export_table "MovimientoStock"

# Presupuestos y pedidos
export_table "Presupuesto"
export_table "PresupuestoItem"
export_table "Pedido"
export_table "PedidoItem"

# Pedidos a proveedor
export_table "PedidoProveedor"
export_table "BobinaPedido"

# Documentos
export_table "Documento"

echo ""
echo "═══════════════════════════════════════"
echo "✅ Exportación completada!"
echo "   Archivos guardados en: $EXPORT_DIR/"
echo ""
echo "📋 Próximo paso:"
echo "   1. Copia la carpeta '$EXPORT_DIR' a tu máquina local"
echo "   2. Ejecuta el script de importación: node import_to_postgres.js"
echo "═══════════════════════════════════════"

# Crear archivo de verificación
ls -la $EXPORT_DIR/*.json | awk '{print $NF, $5}' > $EXPORT_DIR/_manifest.txt
echo ""
echo "Manifest de archivos creado: $EXPORT_DIR/_manifest.txt"
