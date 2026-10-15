/**
 * Obtiene un access token de la API de Mercado Libre (grant client_credentials)
 * y lo guarda en server/.env como ML_ACCESS_TOKEN.
 *
 * Uso:
 *   1) Coloca ML_CLIENT_ID y ML_CLIENT_SECRET en server/.env
 *   2) npm run ml:token   (o: node scripts/ml-token.js)
 */
const fs = require('fs');
const path = require('path');

const ENV_PATH = path.join(__dirname, '..', '.env');
require('dotenv').config({ path: ENV_PATH });

const { ML_CLIENT_ID, ML_CLIENT_SECRET } = process.env;

async function main() {
  if (!ML_CLIENT_ID || !ML_CLIENT_SECRET) {
    console.error('Falta ML_CLIENT_ID y/o ML_CLIENT_SECRET en server/.env');
    process.exit(1);
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: ML_CLIENT_ID,
    client_secret: ML_CLIENT_SECRET,
  });

  const response = await fetch('https://api.mercadolibre.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const data = await response.json();

  if (!response.ok || !data.access_token) {
    console.error('Error al obtener el token:', JSON.stringify(data));
    process.exit(1);
  }

  // Escribe/actualiza ML_ACCESS_TOKEN en .env
  let env = fs.readFileSync(ENV_PATH, 'utf8');
  const line = `ML_ACCESS_TOKEN=${data.access_token}`;
  if (/^ML_ACCESS_TOKEN=.*$/m.test(env)) {
    env = env.replace(/^ML_ACCESS_TOKEN=.*$/m, line);
  } else {
    env = `${env.trimEnd()}\n${line}\n`;
  }
  fs.writeFileSync(ENV_PATH, env);

  const horas = data.expires_in ? Math.round(data.expires_in / 3600) : '?';
  console.log('✅ Token obtenido y guardado en server/.env (ML_ACCESS_TOKEN)');
  console.log(`   Vigencia: ~${horas} h`);
  console.log(`   Token: ${data.access_token.slice(0, 14)}…`);
}

main().catch((error) => {
  console.error('ERROR:', error.message);
  process.exit(1);
});
