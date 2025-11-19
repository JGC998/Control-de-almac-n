#!/bin/bash

echo "🔧 Reparando ambigüedad en validación de Proveedor..."

# FIX FULL_FLOW: Strict Mode Violation
# El texto 'Proveedor Global' aparece múltiples veces. Seleccionamos el primero.
sed -i "s/await expect(page.getByText('Proveedor Global')).toBeVisible();/await expect(page.getByText('Proveedor Global').first()).toBeVisible();/g" tests/full_flow.spec.js

# Hacemos lo mismo para el material, por si acaso aparece varias veces también
sed -i "s/await expect(page.getByText(materialExistente)).toBeVisible();/await expect(page.getByText(materialExistente).first()).toBeVisible();/g" tests/full_flow.spec.js

echo "✅ Corrección aplicada."

# EJECUCIÓN FINAL
echo "🚀 Ejecutando tests..."

pkill -f "next-server" || true
pkill -f "next start" || true

node tests/setup_seeds.js > /dev/null
npm run dev > /dev/null 2>&1 &
SERVER_PID=$!

echo "⏳ Esperando arranque (10s)..."
sleep 10

npx playwright test

kill $SERVER_PID
echo "🏁 ¡Disfruta de tu VERDE!"
