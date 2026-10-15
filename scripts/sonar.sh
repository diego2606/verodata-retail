#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Escaneo SonarQube para VeroData Retail (Linux / macOS / Git Bash / WSL)
#
# Requisitos previos:
#   1. docker compose -f docker-compose.sonar.yml up -d
#   2. http://localhost:9000  ->  My Account  ->  Security  ->  Generate Token
#
# Uso:
#   export SONAR_TOKEN="squ_xxxxxxxx"
#   bash scripts/sonar.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [ -z "${SONAR_TOKEN:-}" ]; then
    echo "ERROR: falta la variable de entorno SONAR_TOKEN (ej: export SONAR_TOKEN=\"squ_xxx\")" >&2
    exit 1
fi
export SONAR_TOKEN

HOST_URL="${SONAR_HOST_URL:-http://localhost:9000}"
# En Docker Desktop (Win/Mac) el contenedor del escaner no ve 'localhost'.
if [ -z "${SONAR_HOST_URL:-}" ] && docker info 2>/dev/null | grep -qi 'docker desktop'; then
    HOST_URL="http://host.docker.internal:9000"
fi

# SonarQube Community solo admite "Revision anterior" como criterio de codigo
# nuevo: la version debe cambiar en cada release para que el Quality Gate evalue
# el codigo nuevo. Se deriva de git; SONAR_PROJECT_VERSION la sobreescribe.
VERSION="${SONAR_PROJECT_VERSION:-$(git describe --tags --always 2>/dev/null || true)}"
[ -z "$VERSION" ] && VERSION="1.0.0"

echo "[1/3] Ejecutando pruebas con cobertura (server)..."
(cd server && npm run test:coverage)

if grep -q '"test:coverage"' client/package.json 2>/dev/null; then
    echo "[2/3] Ejecutando pruebas con cobertura (client)..."
    (cd client && npm run test:coverage)
else
    echo "[2/3] client no define test:coverage; se omite."
fi

echo "[3/3] Ejecutando el escaner de SonarQube..."
# '--env VAR' reenvia el valor desde el entorno del proceso docker: evita exponer
# el token en el argv del contenedor.
export SONAR_HOST_URL="${HOST_URL}"
docker run --rm \
    --env SONAR_HOST_URL \
    --env SONAR_TOKEN \
    -v "${ROOT}:/usr/src" \
    sonarsource/sonar-scanner-cli "-Dsonar.projectVersion=${VERSION}"

echo "Analisis enviado. Ver resultados en: ${HOST_URL}/dashboard?id=verodata-retail"
