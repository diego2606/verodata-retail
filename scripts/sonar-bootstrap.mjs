#!/usr/bin/env node
/**
 * Bootstrap idempotente de VeroData Retail en SonarQube.
 *
 * Crea (si no existen) el proyecto, el Quality Gate "VeroData Way" con sus
 * condiciones sobre codigo nuevo, lo asigna al proyecto y genera el token de
 * analisis. Se puede ejecutar tantas veces como se quiera.
 *
 * Uso:
 *   node scripts/sonar-bootstrap.mjs
 *   SONAR_ADMIN_PASSWORD=miClave node scripts/sonar-bootstrap.mjs
 */

const HOST = (process.env.SONAR_HOST_URL ?? 'http://localhost:9000').replace(/\/$/, '');
const ADMIN_USER = process.env.SONAR_ADMIN_USER ?? 'admin';
const ADMIN_PASSWORD = process.env.SONAR_ADMIN_PASSWORD ?? 'admin';
const PROJECT_KEY = process.env.SONAR_PROJECT_KEY ?? 'verodata-retail';
const PROJECT_NAME = process.env.SONAR_PROJECT_NAME ?? 'VeroData Retail';
const GATE_NAME = process.env.SONAR_GATE_NAME ?? 'VeroData Way';
const TOKEN_NAME = process.env.SONAR_TOKEN_NAME ?? 'verodata-scanner';

// Condiciones del Quality Gate sobre CODIGO NUEVO.
const CONDITIONS = [
  ['new_coverage', 'LT', '80'],
  ['new_duplicated_lines_density', 'GT', '3'],
  ['new_blocker_violations', 'GT', '0'],
  ['new_critical_violations', 'GT', '0'],
  ['new_security_hotspots_reviewed', 'LT', '100'],
];

const AUTH = 'Basic ' + Buffer.from(`${ADMIN_USER}:${ADMIN_PASSWORD}`).toString('base64');

async function call(endpoint, params = {}, method = 'POST') {
  const url = new URL(`${HOST}/api/${endpoint}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, v);
  }
  const res = await fetch(url, { method, headers: { Authorization: AUTH } });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(body?.errors?.map((e) => e.msg).join('; ') || `HTTP ${res.status}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

async function waitForServer(timeoutMs = 300_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${HOST}/api/system/status`);
      if ((await res.json()).status === 'UP') return;
    } catch {
      /* servidor aun arrancando */
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error(`SonarQube no respondio en ${HOST} dentro de ${timeoutMs / 1000}s`);
}

async function main() {
  console.log(`SonarQube: ${HOST}`);
  await waitForServer();
  console.log('[ok] servidor operativo');

  // 1. Proyecto
  const projects = await call('projects/search', { ps: 1, projects: PROJECT_KEY }, 'GET');
  if (projects.components.length === 0) {
    await call('projects/create', { project: PROJECT_KEY, name: PROJECT_NAME });
    console.log(`[ok] proyecto '${PROJECT_KEY}' creado`);
  } else {
    console.log(`[--] proyecto '${PROJECT_KEY}' ya existia`);
  }

  // 2. Quality Gate
  const gates = await call('qualitygates/list', {}, 'GET');
  let gate = gates.qualitygates.find((g) => g.name === GATE_NAME);
  if (!gate) {
    await call('qualitygates/create', { name: GATE_NAME });
    try {
      await call('qualitygates/copy', { from: 'Sonar way', to: GATE_NAME });
      console.log(`[ok] gate '${GATE_NAME}' creado (condiciones base copiadas de 'Sonar way')`);
    } catch {
      console.log(`[ok] gate '${GATE_NAME}' creado`);
    }
    gate = (await call('qualitygates/list', {}, 'GET')).qualitygates.find((g) => g.name === GATE_NAME);
  } else {
    console.log(`[--] gate '${GATE_NAME}' ya existia`);
  }

  // 3. Condiciones
  const detail = await call('qualitygates/show', { name: GATE_NAME }, 'GET');
  const existing = new Set((detail.conditions ?? []).map((c) => c.metric));
  for (const [metric, op, error] of CONDITIONS) {
    if (existing.has(metric)) {
      console.log(`[--] condicion ${metric} ya definida`);
      continue;
    }
    try {
      await call('qualitygates/create_condition', { gateName: GATE_NAME, metric, op, error });
      console.log(`[ok] condicion ${metric} ${op} ${error}`);
    } catch (err) {
      console.warn(`[!!] no se pudo crear la condicion ${metric}: ${err.message}`);
    }
  }

  // 4. Asignacion al proyecto.
  // El nombre del parametro cambio entre versiones (gateId vs gateName): se
  // intenta con uno y se reintenta con el otro.
  try {
    await call('qualitygates/select', { gateName: GATE_NAME, projectKey: PROJECT_KEY });
  } catch {
    if (!gate?.id) throw new Error('no se pudo resolver el id del Quality Gate');
    await call('qualitygates/select', { gateId: gate.id, projectKey: PROJECT_KEY });
  }
  console.log(`[ok] gate '${GATE_NAME}' asignado a '${PROJECT_KEY}'`);

  // 5. Token
  const tokens = await call('user_tokens/search', { login: ADMIN_USER }, 'GET');
  if (tokens.userTokens.some((t) => t.name === TOKEN_NAME)) {
    console.log(`[--] el token '${TOKEN_NAME}' ya existe; reutilizalo o revocalo en la UI`);
  } else {
    const { token } = await call('user_tokens/generate', { name: TOKEN_NAME });
    console.log(`\n[ok] token generado (guardalo, no se vuelve a mostrar):\n     ${token}\n`);
  }

  console.log(`Listo. Dashboard: ${HOST}/dashboard?id=${PROJECT_KEY}`);
}

main().catch((err) => {
  console.error(`\nError: ${err.message}`);
  if (err.status === 401) {
    console.error('Credenciales de administrador incorrectas (SONAR_ADMIN_PASSWORD).');
  }
  process.exit(1);
});
