#!/usr/bin/env node
/**
 * Normaliza un informe lcov.info para que SonarQube pueda resolverlo.
 *
 * Vitest/istanbul escriben las rutas del informe con el separador nativo del
 * sistema (`src\lib\x.ts` en Windows). El escáner corre en Linux dentro de un
 * contenedor, así que esas entradas no resuelven y la cobertura se descarta en
 * silencio. Además las rutas vienen relativas al paquete (`src/lib/x.ts`), lo
 * que hace ambigua su resolución cuando hay varios paquetes con `src/`.
 *
 * Este script reescribe cada linea `SF:` a una ruta POSIX relativa a la raíz
 * del repositorio (`client/src/lib/x.ts`), que es lo que SonarQube espera.
 *
 * Uso:
 *   node scripts/normalize-lcov.mjs client/coverage/lcov.info
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const [reportPath] = process.argv.slice(2);

if (!reportPath) {
  console.error('Uso: node scripts/normalize-lcov.mjs <ruta/al/lcov.info>');
  process.exit(1);
}

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const reportAbs = resolve(repoRoot, reportPath);
// Convencion de Vitest: <paquete>/coverage/lcov.info
const packageAbs = dirname(dirname(reportAbs));
const packageRel = relative(repoRoot, packageAbs);

const original = readFileSync(reportAbs, 'utf8');

let normalizadas = 0;
const contenido = original
  .split('\n')
  .map((linea) => {
    if (!linea.startsWith('SF:')) return linea;

    const rutaCruda = linea.slice(3).trim();
    if (!rutaCruda) return linea;

    const posix = rutaCruda.replace(/\\/g, '/');
    let absoluta;
    if (isAbsolute(posix)) {
      absoluta = posix;
    } else if (packageRel && (posix === packageRel || posix.startsWith(`${packageRel}/`))) {
      // Ya venia relativa a la raiz del repositorio.
      absoluta = resolve(repoRoot, posix);
    } else {
      absoluta = resolve(packageAbs, posix);
    }

    normalizadas += 1;
    return `SF:${relative(repoRoot, absoluta).replace(/\\/g, '/')}`;
  })
  .join('\n');

writeFileSync(reportAbs, contenido, 'utf8');
console.log(`[lcov] ${reportPath}: ${normalizadas} rutas normalizadas a la raiz del repositorio`);
