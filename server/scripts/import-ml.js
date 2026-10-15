/**
 * Importador de catálogo desde Mercado Libre (MPE) → PostgreSQL + Supabase Storage.
 *
 * v2 — Organiza el catálogo en una TAXONOMÍA CURADA (departamentos) mapeando el
 * árbol real de ML:
 *   - Nivel 0 = departamentos de comprador (Hombre, Mujer, Niños, Tecnología, …).
 *   - Nivel 1 = subcategorías reales de ML (recortadas).
 *   - Los productos van a la hoja; las variantes (color/talla) se agrupan por `modelo`.
 *
 * La API `/products/search` EXIGE `q` (keywords) → se usa el nombre de la
 * subcategoría como keyword, junto con el filtro `category`.
 *
 * Reglas:
 *   - SOLO se importan productos CON imagen (filtro duro).
 *   - Idempotente: no reimporta SKU ni combinación modelo+atributos existente.
 *
 * Env: ML_ACCESS_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_KEY
 *      RESET=1  → borra productos y categorías antes de importar
 * Uso: npm run ml:import
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Pool } = require('pg');

const ML_TOKEN = process.env.ML_ACCESS_TOKEN;
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BUCKET = 'productos';
const RESET = process.env.RESET === '1';
const POR_SUB = 6; // productos por subcategoría
const MAX_HIJOS = 10; // subcategorías por departamento

/** Departamento = regla de mapeo desde una categoría top de ML. */
const FUENTES = [
  { top: 'MPE1430', tipo: 'moda' },
  { top: 'MPE1051', dep: 'Tecnología', seccion: 'Celulares y Smartphones' },
  { top: 'MPE1648', dep: 'Tecnología', seccion: 'Computación' },
  { top: 'MPE1000', dep: 'Tecnología', seccion: 'Electrónica, Audio y Video' },
  { top: 'MPE1144', dep: 'Tecnología', seccion: 'Consolas y Videojuegos' },
  { top: 'MPE1574', dep: 'Hogar', porHijo: true },
  { top: 'MPE1575', dep: 'Hogar', seccion: 'Electrodomésticos' },
  { top: 'MPE1276', dep: 'Deportes y Fitness', porHijo: true },
  { top: 'MPE1246', dep: 'Belleza y Cuidado Personal', porHijo: true },
  { top: 'MPE1132', dep: 'Juegos y Juguetes', porHijo: true },
];

/** Rango de precio referencial por departamento (cuando ML no da precio real). */
const RANGOS_PRECIO = {
  Mujer: [39, 399],
  Hombre: [39, 499],
  'Niños y Bebés': [29, 299],
  Moda: [39, 399],
  Calzado: [59, 399],
  Accesorios: [29, 399],
  Tecnología: [199, 6999],
  Hogar: [99, 3999],
  'Deportes y Fitness': [49, 999],
  'Belleza y Cuidado Personal': [29, 799],
  'Juegos y Juguetes': [29, 499],
};

const ATRIBUTOS_VARIANTE = ['COLOR', 'SIZE', 'CAPACITY', 'STORAGE_CAPACITY', 'MODEL', 'GENDER', 'LINE'];
const CLAVES_VARIANTE = ['COLOR', 'SIZE', 'CAPACITY', 'STORAGE_CAPACITY', 'MODEL'];

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 10000,
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cache = new Map();
const rutas = new Map();
const variantesVistas = new Set();

function hash(text) {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const sinAcentos = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function slugify(s) {
  return (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const limpiarNombre = (n) => (n || 'Producto').replace(/\s+/g, ' ').trim().slice(0, 150);

/** Nombre de sección sin el género repetido: "Ropa de Hombre" → "Ropa". */
function limpiarSeccion(nombre) {
  const limpio = (nombre || '').replace(/\s+de\s+(hombre|mujer|ni[nñ]os?|beb[eé]s?)\s*$/i, '').trim();
  return (limpio || nombre || 'General').slice(0, 100);
}

/** Departamento de moda: por atributo GENDER; si no, por palabra del nombre del hijo. */
function departamentoModa(nombreHijo, atributos) {
  const g = sinAcentos(atributos.GENDER || '');
  const n = sinAcentos(nombreHijo);
  const texto = `${g} ${n}`;
  if (texto.includes('hombre') || texto.includes('masculino')) return 'Hombre';
  if (texto.includes('mujer') || texto.includes('femenin')) return 'Mujer';
  if (texto.includes('nin') || texto.includes('bebe')) return 'Niños y Bebés';
  if (n.includes('calzado') || n.includes('zapat') || n.includes('sandalia')) return 'Calzado';
  if (n.includes('accesorio') || n.includes('bolso') || n.includes('cartera') || n.includes('equipaje') || n.includes('mochila') || n.includes('lente') || n.includes('reloj')) return 'Accesorios';
  return 'Moda';
}

/** Resuelve (departamento, sección) para una subcategoría de ML y un producto. */
function destinoDe(fuente, nombreHijo, atributos) {
  if (fuente.tipo === 'moda') {
    return { departamento: departamentoModa(nombreHijo, atributos), seccion: limpiarSeccion(nombreHijo) };
  }
  if (fuente.porHijo) {
    return { departamento: fuente.dep, seccion: limpiarSeccion(nombreHijo) };
  }
  return { departamento: fuente.dep, seccion: fuente.seccion };
}

function extraerAtributos(detalle) {
  const out = {};
  for (const a of detalle.attributes || []) {
    if (!a || !a.id || !ATRIBUTOS_VARIANTE.includes(a.id) || out[a.id]) continue;
    const valor = a.value_name || (Array.isArray(a.values) && a.values[0] && a.values[0].name);
    if (valor) out[a.id] = String(valor).slice(0, 100);
  }
  return out;
}

const claveVariante = (at) =>
  CLAVES_VARIANTE.map((k) => sinAcentos(at[k] || '').replace(/\s+/g, ' ').trim()).join('|');

function modeloFallback(nombre, atributos) {
  let x = ` ${sinAcentos(nombre).replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ')} `;
  for (const v of Object.values(atributos)) {
    const w = sinAcentos(v).replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (w.length > 1) x = x.split(` ${w} `).join(' ');
  }
  return x.trim().replace(/\s+/g, ' ');
}

const precioEstimado = (dep, sku) => {
  const [min, max] = RANGOS_PRECIO[dep] || [49, 999];
  return Math.max(9.9, Math.round((min + (hash(sku) % (max - min))) / 10) * 10 - 0.1);
};

async function mlGet(pathname, intentos = 5) {
  for (let i = 0; i < intentos; i++) {
    const res = await fetch(`https://api.mercadolibre.com${pathname}`, {
      headers: { Authorization: `Bearer ${ML_TOKEN}` },
    });
    if (res.status === 429) {
      const espera = 3000 * (i + 1);
      console.log(`    (429, reintento en ${espera / 1000}s…)`);
      await sleep(espera);
      continue;
    }
    if (!res.ok) throw new Error(`ML ${pathname} -> ${res.status}`);
    return res.json();
  }
  throw new Error(`ML ${pathname} -> 429`);
}

/** Crea (si no existe) una categoría con un slug único por ruta. */
async function ensureCategoria(nombre, padreId, slugPadre) {
  const slug = slugPadre ? `${slugPadre}-${slugify(nombre)}` : slugify(nombre);
  const key = `c:${padreId ?? 'T'}:${slug}`;
  if (cache.has(key)) return cache.get(key);

  await pool.query(
    `INSERT INTO categorias (nombre, slug, descripcion, categoria_padre_id)
     VALUES ($1, $2, $3, $4) ON CONFLICT (slug) DO NOTHING`,
    [nombre, slug, `Categoría ${nombre}`, padreId]
  );
  const r = await pool.query('SELECT id FROM categorias WHERE slug = $1 LIMIT 1', [slug]);
  const id = r.rows[0] ? r.rows[0].id : null;
  cache.set(key, id);
  return id;
}

/** Garantiza la ruta departamento › sección y devuelve el id de la sección. */
async function ensureRuta(departamento, seccion) {
  const key = `${departamento}|${seccion}`;
  if (rutas.has(key)) return rutas.get(key);
  const depId = await ensureCategoria(departamento, null, null);
  const secId = await ensureCategoria(seccion, depId, slugify(departamento));
  rutas.set(key, secId);
  return secId;
}

async function subirImagen(buffer, contentType, nombreArchivo) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${nombreArchivo}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': contentType, 'x-upsert': 'true' },
    body: buffer,
  });
  if (!res.ok) throw new Error(`Storage ${res.status}`);
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${nombreArchivo}`;
}

/** Importa los productos de una subcategoría de ML. */
async function importarCategoria(fuente, nombreHijo, mlCatId) {
  const q = encodeURIComponent(nombreHijo);
  const search = await mlGet(`/products/search?site_id=MPE&category=${mlCatId}&q=${q}&limit=30`);
  const resultados = search.results || [];
  if (resultados.length === 0) return 0;

  let importados = 0;

  for (const r of resultados) {
    if (importados >= POR_SUB) break;

    try {
      const detalle = await mlGet(`/products/${r.id}`);
      const atributos = extraerAtributos(detalle);
      const familia = (detalle.family_name || '').trim();
      const modelo = familia ? limpiarNombre(familia) : modeloFallback(limpiarNombre(r.name), atributos);
      const clave = `${modelo.toLowerCase()}::${claveVariante(atributos)}`;
      if (variantesVistas.has(clave)) continue;
      variantesVistas.add(clave);

      const sku = `ML-${r.id}`;
      const yaExiste = await pool.query(
        `SELECT 1 FROM productos WHERE sku = $1 OR (modelo = $2 AND atributos = $3::jsonb) LIMIT 1`,
        [sku, modelo, JSON.stringify(atributos)]
      );
      if (yaExiste.rows[0]) continue;

      const pic = (detalle.pictures && detalle.pictures[0]) || (Array.isArray(r.pictures) ? r.pictures[0] : null);
      const imageUrl = pic && (pic.secure_url || pic.url);
      if (!imageUrl) continue;

      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) continue;
      const buffer = Buffer.from(await imgRes.arrayBuffer());
      const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
      const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
      const publicUrl = await subirImagen(buffer, contentType, `${sku}.${ext}`);

      const { departamento, seccion } = destinoDe(fuente, nombreHijo, atributos);
      const secId = await ensureRuta(departamento, seccion);

      const precioReal = detalle.buy_box_winner && detalle.buy_box_winner.price;
      const precio = precioReal || precioEstimado(departamento, sku);

      const ins = await pool.query(
        `INSERT INTO productos (categoria_id, sku, nombre, descripcion, precio_regular, precio_oferta, imagen_url, modelo, atributos)
         VALUES ($1, $2, $3, $4, $5, NULL, $6, $7, $8::jsonb)
         ON CONFLICT DO NOTHING RETURNING id`,
        [
          secId,
          sku,
          limpiarNombre(r.name),
          'Producto importado del catálogo de Mercado Libre (precio referencial).',
          precio,
          publicUrl,
          modelo.slice(0, 255),
          JSON.stringify(atributos),
        ]
      );

      if (ins.rows[0]) {
        await pool.query(
          `INSERT INTO inventario (producto_id, stock_actual, stock_minimo)
           VALUES ($1, $2, 5) ON CONFLICT (producto_id) DO NOTHING`,
          [ins.rows[0].id, 3 + (hash(sku) % 30)]
        );
        importados++;
        const variante = claveVariante(atributos).replace(/\|+$/, '').replace(/\|/g, ' / ') || '-';
        console.log(`  + ${departamento} › ${seccion} | ${sku} | S/ ${precio} | ${variante}`);
      }
    } catch (err) {
      console.warn(`  ! ${r.id}: ${err.message}`);
    }
    await sleep(200);
  }
  return importados;
}

async function main() {
  if (!ML_TOKEN || !SUPABASE_URL || !SERVICE_KEY) {
    throw new Error('Faltan ML_ACCESS_TOKEN / SUPABASE_URL / SUPABASE_SERVICE_KEY en server/.env');
  }

  if (RESET) {
    console.log('RESET=1 → borrando productos y categorías…');
    await pool.query('DELETE FROM productos');
    await pool.query('DELETE FROM categorias');
  }

  let total = 0;
  for (const fuente of FUENTES) {
    console.log(`\n▸ Departamento desde ML ${fuente.top}`);
    let det;
    try {
      det = await mlGet(`/categories/${fuente.top}`);
    } catch (err) {
      console.warn(`  ! categoría ${fuente.top}: ${err.message}`);
      continue;
    }
    const hijos = (det.children_categories || []).slice(0, MAX_HIJOS);
    for (const hijo of hijos) {
      console.log(`• ${hijo.name}  (ML ${hijo.id})`);
      try {
        total += await importarCategoria(fuente, hijo.name, hijo.id);
      } catch (err) {
        console.warn(`  ! "${hijo.name}" omitida: ${err.message}`);
      }
      await sleep(400);
    }
  }

  const p = await pool.query('SELECT COUNT(*) c FROM productos');
  const c = await pool.query('SELECT COUNT(*) c FROM categorias');
  const t = await pool.query('SELECT COUNT(*) c FROM categorias WHERE categoria_padre_id IS NULL');
  console.log(`\n✅ Importados ${total}. Productos: ${p.rows[0].c} | Categorías: ${c.rows[0].c} (departamentos: ${t.rows[0].c})`);
  await pool.end();
}

main().catch((error) => {
  console.error('ERROR:', error.message);
  process.exit(1);
});
