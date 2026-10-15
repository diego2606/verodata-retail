# ─────────────────────────────────────────────────────────────────────────────
# Escaneo SonarQube para VeroData Retail (Windows / PowerShell)
#
# Requisitos previos:
#   1. docker compose -f docker-compose.sonar.yml up -d
#   2. http://localhost:9000  ->  My Account  ->  Security  ->  Generate Token
#
# Uso:
#   $env:SONAR_TOKEN = "squ_xxxxxxxx"
#   powershell -File scripts/sonar.ps1
# ─────────────────────────────────────────────────────────────────────────────

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not $env:SONAR_TOKEN) {
    Write-Error 'Falta la variable de entorno SONAR_TOKEN. Ej: $env:SONAR_TOKEN = "squ_xxx"'
}

$hostUrl = if ($env:SONAR_HOST_URL) { $env:SONAR_HOST_URL } else { 'http://host.docker.internal:9000' }

# SonarQube Community solo admite "Revision anterior" como criterio de codigo
# nuevo, por lo que la version del proyecto debe cambiar en cada release para
# que el Quality Gate evalue el codigo nuevo. Se deriva de git y puede
# sobreescribirse con $env:SONAR_PROJECT_VERSION.
$version = $env:SONAR_PROJECT_VERSION
if (-not $version) {
    $version = (git describe --tags --always 2>$null)
}
if (-not $version) { $version = '1.0.0' }

Write-Host '[1/3] Ejecutando pruebas con cobertura (server)...' -ForegroundColor Cyan
Push-Location server
npm run test:coverage
Pop-Location

# El cliente aun no tiene pruebas: si el lcov no existe, SonarQube lo ignora.
if (Test-Path 'client/package.json') {
    try {
        $clientScripts = (Get-Content 'client/package.json' -Raw | ConvertFrom-Json).scripts
        if ($clientScripts.PSObject.Properties.Name -contains 'test:coverage') {
            Write-Host '[2/3] Ejecutando pruebas con cobertura (client)...' -ForegroundColor Cyan
            Push-Location client
            npm run test:coverage
            Pop-Location
        } else {
            Write-Host '[2/3] client no define test:coverage; se omite.' -ForegroundColor Yellow
        }
    } catch {
        Write-Host '[2/3] No se pudo leer client/package.json; se omite.' -ForegroundColor Yellow
    }
}

Write-Host '[3/3] Ejecutando el escaner de SonarQube...' -ForegroundColor Cyan

# Se usan array + splatting y '--env VAR' (pass-through) en lugar de interpolar el
# token en la linea de comandos: evita problemas de quoting de PowerShell 5.1 y
# que el token quede visible en el argv del proceso.
$env:SONAR_HOST_URL = $hostUrl

$dockerArgs = @(
    'run', '--rm'
    '--env', 'SONAR_HOST_URL'
    '--env', 'SONAR_TOKEN'
    '-v', "${root}:/usr/src"
    'sonarsource/sonar-scanner-cli'
    "-Dsonar.projectVersion=$version"
)
docker @dockerArgs

Write-Host "Analisis enviado. Ver resultados en: $hostUrl/dashboard?id=verodata-retail" -ForegroundColor Green
