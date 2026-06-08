#!/bin/bash
# =============================================================================
# Setup del cron de tracking de contenedores — Linux Mint
# Ejecuta: bash scripts/setup-tracking-cron.sh
# =============================================================================
#
# Añade una tarea cron que consulta el estado de los contenedores 3 veces al día
# (8:00, 14:00, 20:00) y envía WhatsApp si ha habido cambios.
#
# REQUISITOS PREVIOS:
#   1. App corriendo en el servidor (npm run start o pm2)
#   2. Variables de entorno configuradas en .env.local:
#        SHIP24_API_KEY=tu_api_key_de_ship24
#        CALLMEBOT_PHONE=34612345678
#        CALLMEBOT_APIKEY=tu_apikey_de_callmebot
#   3. curl instalado (sudo apt install curl)
#
# PRIMER USO:
#   bash scripts/setup-tracking-cron.sh
#
# =============================================================================

APP_URL="${APP_URL:-http://localhost:3000}"
LOG_FILE="/var/log/crm-tracking.log"
CRON_JOB="0 8,14,20 * * * curl -s -X POST ${APP_URL}/api/tracking/sync >> ${LOG_FILE} 2>&1"

echo "=== Configurando cron de tracking de contenedores ==="
echo "URL de la app: ${APP_URL}"
echo "Log: ${LOG_FILE}"
echo ""

# Crear archivo de log si no existe
sudo touch "${LOG_FILE}" 2>/dev/null || touch "${HOME}/.crm-tracking.log" && LOG_FILE="${HOME}/.crm-tracking.log"
echo "Archivo de log: ${LOG_FILE}"

# Añadir al crontab del usuario actual (sin duplicar si ya existe)
CRON_TEMP=$(mktemp)
crontab -l 2>/dev/null | grep -v "tracking/sync" > "${CRON_TEMP}"
echo "${CRON_JOB}" >> "${CRON_TEMP}"
crontab "${CRON_TEMP}"
rm "${CRON_TEMP}"

echo ""
echo "✅ Cron configurado. Verificando con: crontab -l"
echo ""
crontab -l | grep "tracking"
echo ""
echo "Para probar manualmente ahora mismo:"
echo "  curl -s -X POST ${APP_URL}/api/tracking/sync | python3 -m json.tool"
echo ""
echo "Para ver el log en tiempo real:"
echo "  tail -f ${LOG_FILE}"
