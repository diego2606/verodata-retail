/**
 * Importador de catálogo desde Mercado Libre (MPE) → PostgreSQL + Supabase Storage.
 *
 * - Crea las categorías REALES de ML: 10 top-level + sus subcategorías (1 nivel),
 *   pero SOLO las que reciben al menos un producto con imagen.
 * - Trae productos del catálogo (nombre + foto reales), sube la imagen al bucket
 *   `productos` de Supabase Storage.
 * - Cada variante (color, talla, capacidad) se guarda como ficha propia con su SKU,
 *   pero se persiste `modelo` (family_name de ML) y `atributos` (JSONB) para agruparlas.
 * - Precio: real si viene; si no, estimado por categoría.
 * - VALIDA el producto: el nombre debe contener el sustantivo clave de la búsqueda
 *   y no ser accesorio/libro/llavero/etc.
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
const POR_BUSQUEDA = 5;
const RESET = process.env.RESET === '1';

/** top-level reales de ML (MPE) que usamos */
const TOPS = [
  { nombre: 'Computación', id: 'MPE1648' },
  { nombre: 'Celulares y Teléfonos', id: 'MPE1051' },
  { nombre: 'Electrónica, Audio y Video', id: 'MPE1000' },
  { nombre: 'Hogar, Muebles y Jardín', id: 'MPE1574' },
  { nombre: 'Electrodomésticos', id: 'MPE1575' },
  { nombre: 'Ropa y Accesorios', id: 'MPE1430' },
  { nombre: 'Deportes y Fitness', id: 'MPE1276' },
  { nombre: 'Belleza y Cuidado Personal', id: 'MPE1246' },
  { nombre: 'Juegos y Juguetes', id: 'MPE1132' },
  { nombre: 'Consolas y Videojuegos', id: 'MPE1144' },
];

/** búsqueda → top-level + subcategoría (deben existir en ML) + sustantivo clave */
const QUERIES = [
  { q: 'zapatillas nike', top: 'Deportes y Fitness', sub: 'Zapatillas', noun: 'zapatill' },
  { q: 'zapatillas adidas', top: 'Deportes y Fitness', sub: 'Zapatillas', noun: 'zapatill' },
  { q: 'zapatillas puma', top: 'Deportes y Fitness', sub: 'Zapatillas', noun: 'zapatill' },
  { q: 'zapatillas reebok', top: 'Deportes y Fitness', sub: 'Zapatillas', noun: 'zapatill' },
  { q: 'zapatillas vans', top: 'Deportes y Fitness', sub: 'Zapatillas', noun: 'zapatill' },
  { q: 'zapatillas converse', top: 'Deportes y Fitness', sub: 'Zapatillas', noun: 'zapatill' },
  { q: 'balon de futbol', top: 'Deportes y Fitness', sub: 'Fútbol', noun: 'balon' },
  { q: 'mancuernas', top: 'Deportes y Fitness', sub: 'Fitness y Musculación', noun: 'mancuern' },
  { q: 'bicicleta', top: 'Deportes y Fitness', sub: 'Ciclismo', noun: 'bicicleta' },
  { q: 'polo nike', top: 'Ropa y Accesorios', sub: 'Polos', noun: 'polo' },
  { q: 'short adidas', top: 'Ropa y Accesorios', sub: 'Shorts', noun: 'short' },
  { q: 'casaca puma', top: 'Ropa y Accesorios', sub: 'Abrigos', noun: 'casaca' },
  { q: 'buzo adidas', top: 'Ropa y Accesorios', sub: 'Ropa Deportiva', noun: 'buzo' },
  { q: 'mochila nike', top: 'Ropa y Accesorios', sub: 'Equipaje, Bolsos y Carteras', noun: 'mochila' },
  { q: 'gorra adidas', top: 'Ropa y Accesorios', sub: 'Accesorios de Moda', noun: 'gorra' },
  { q: 'lentes de sol', top: 'Ropa y Accesorios', sub: 'Accesorios de Moda', noun: 'lente' },
  { q: 'iphone', top: 'Celulares y Teléfonos', sub: 'Celulares y Smartphones', noun: 'iphone' },
  { q: 'samsung galaxy', top: 'Celulares y Teléfonos', sub: 'Celulares y Smartphones', noun: 'samsung' },
  { q: 'xiaomi redmi', top: 'Celulares y Teléfonos', sub: 'Celulares y Smartphones', noun: 'xiaomi' },
  { q: 'motorola moto g', top: 'Celulares y Teléfonos', sub: 'Celulares y Smartphones', noun: 'motorola' },
  { q: 'notebook hp', top: 'Computación', sub: 'Laptops y Accesorios', noun: 'notebook' },
  { q: 'macbook', top: 'Computación', sub: 'Laptops y Accesorios', noun: 'macbook' },
  { q: 'notebook lenovo', top: 'Computación', sub: 'Laptops y Accesorios', noun: 'notebook' },
  { q: 'notebook asus', top: 'Computación', sub: 'Laptops y Accesorios', noun: 'notebook' },
  { q: 'monitor lg', top: 'Computación', sub: 'Monitores y Accesorios', noun: 'monitor' },
  { q: 'monitor samsung', top: 'Computación', sub: 'Monitores y Accesorios', noun: 'monitor' },
  { q: 'monitor asus', top: 'Computación', sub: 'Monitores y Accesorios', noun: 'monitor' },
  { q: 'televisor lg', top: 'Electrónica, Audio y Video', sub: 'TVs', noun: 'televisor' },
  { q: 'televisor samsung', top: 'Electrónica, Audio y Video', sub: 'TVs', noun: 'televisor' },
  { q: 'televisor sony', top: 'Electrónica, Audio y Video', sub: 'TVs', noun: 'televisor' },
  { q: 'audifonos sony', top: 'Electrónica, Audio y Video', sub: 'Audio', noun: 'audifon' },
  { q: 'parlante jbl', top: 'Electrónica, Audio y Video', sub: 'Audio', noun: 'parlante' },
  { q: 'airpods', top: 'Electrónica, Audio y Video', sub: 'Audio', noun: 'airpod' },
  { q: 'audifonos bose', top: 'Electrónica, Audio y Video', sub: 'Audio', noun: 'audifon' },
  { q: 'licuadora', top: 'Electrodomésticos', sub: 'Pequeños Electrodomésticos', noun: 'licuadora' },
  { q: 'cafetera', top: 'Electrodomésticos', sub: 'Pequeños Electrodomésticos', noun: 'cafetera' },
  { q: 'freidora de aire', top: 'Electrodomésticos', sub: 'Cocción', noun: 'freidora' },
  { q: 'aspiradora', top: 'Electrodomésticos', sub: 'Pequeños Electrodomésticos', noun: 'aspiradora' },
  { q: 'secadora de cabello', top: 'Belleza y Cuidado Personal', sub: 'Artefactos para el Cabello', noun: 'secadora' },
  { q: 'plancha de cabello', top: 'Belleza y Cuidado Personal', sub: 'Artefactos para el Cabello', noun: 'plancha' },
  { q: 'perfume', top: 'Belleza y Cuidado Personal', sub: 'Perfumes y Colonias', noun: 'perfume' },
  { q: 'lego', top: 'Juegos y Juguetes', sub: 'Juegos de Construcción', noun: 'lego' },
  { q: 'peluche', top: 'Juegos y Juguetes', sub: 'Peluches', noun: 'peluche' },
  { q: 'playstation 5', top: 'Consolas y Videojuegos', sub: 'Consolas', noun: 'playstation' },
  { q: 'nintendo switch', top: 'Consolas y Videojuegos', sub: 'Consolas', noun: 'nintendo' },
  { q: 'control xbox', top: 'Consolas y Videojuegos', sub: 'Accesorios para Consolas', noun: 'control xbox' },
  { q: 'sillon', top: 'Hogar, Muebles y Jardín', sub: 'Muebles para el Hogar', noun: 'sill' },
  { q: 'mesa de comedor', top: 'Hogar, Muebles y Jardín', sub: 'Muebles para el Hogar', noun: 'mesa' },
];

const RANGOS_PRECIO = {
  Computación: [1499, 7999],
  'Celulares y Teléfonos': [799, 5499],
  'Electrónica, Audio y Video': [149, 4999],
  'Hogar, Muebles y Jardín': [199, 3999],
  Electrodomésticos: [129, 2499],
  'Ropa y Accesorios': [49, 599],
  'Deportes y Fitness': [99, 999],
  'Belleza y Cuidado Personal': [39, 899],
  'Juegos y Juguetes': [39, 599],
  'Consolas y Videojuegos': [199, 3499],
};

const BASURA = [
  'funda', 'case', 'cable', 'cargador', 'protector', 'adaptador', 'libro', 'guia', 'guía',
  'sticker', 'repuesto', 'forro', 'mica', 'correa', 'manual', 'tapa', 'pelicula', 'película',
  'soporte', 'organizador', 'llavero', 'llaveros', 'globo', 'almohada', 'puff', 'revista',
  'molde', 'papel', 'contenedor', 'dispensador', 'sombrilla', 'saco', 'decorativo', 'souvenir',
  'figura', 'adorno', 'juguete para mascota',
];

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
/** Evita importar dos veces la misma combinación modelo + atributos. */
const variantesVistas = new Set();

function hash(text) {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function slugify(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

const sinAcentos = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** Atributos que distinguen variantes; se guardan en `productos.atributos`. */
const ATRIBUTOS_VARIANTE = ['COLOR', 'SIZE', 'CAPACITY', 'STORAGE_CAPACITY', 'MODEL', 'GENDER', 'LINE'];

/** Subconjunto que identifica de forma única a la variante (dedupe). */
const CLAVES_VARIANTE = ['COLOR', 'SIZE', 'CAPACITY', 'STORAGE_CAPACITY', 'MODEL'];

const claveVariante = (at) =>
  CLAVES_VARIANTE.map((k) => sinAcentos(at[k] || '').replace(/\s+/g, ' ').trim()).join('|');

/** Atributos de variante del producto según la API de ML: { COLOR: 'Negro', SIZE: 'M', … } */
function extraerAtributos(detalle) {
  const out = {};
  for (const a of detalle.attributes || []) {
    if (!a || !a.id || !ATRIBUTOS_VARIANTE.includes(a.id) || out[a.id]) continue;
    const valor = a.value_name || (Array.isArray(a.values) && a.values[0] && a.values[0].name);
    if (valor) out[a.id] = String(valor).slice(0, 100);
  }
  return out;
}

/** Fallback cuando ML no da family_name: nombre sin los valores de sus atributos. */
function modeloFallback(nombre, atributos) {
  let x = ` ${sinAcentos(nombre).replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ')} `;
  for (const v of Object.values(atributos)) {
    const w = sinAcentos(v).replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (w.length > 1) x = x.split(` ${w} `).join(' ');
  }
  return x.trim().replace(/\s+/g, ' ');
}

const limpiarNombre = (n) => (n || 'Producto').replace(/\s+/g, ' ').trim().slice(0, 150);
const esBasura = (n) => { const x = n.toLowerCase(); return BASURA.some((p) => x.includes(p)); };
const precioEstimado = (cat, sku) => {
  const [min, max] = RANGOS_PRECIO[cat] || [99, 999];
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

async function ensureCategoria(nombre, padreId) {
  const key = `${padreId ?? 'T'}:${nombre}`;
  if (cache.has(key)) return cache.get(key);
  await pool.query(
    `INSERT INTO categorias (nombre, slug, descripcion, categoria_padre_id)
     VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
    [nombre, slugify(nombre), `Categoría ${nombre}`, padreId]
  );
  const r = await pool.query('SELECT id FROM categorias WHERE nombre = $1', [nombre]);
  const id = r.rows[0] ? r.rows[0].id : null;
  cache.set(key, id);
  return id;
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

async function importarBusqueda({ q, top, sub, noun }, subsMap) {
  const mlSubId = subsMap.get(`${top}|${sub}`);
  if (!mlSubId) {
    console.warn(`  ! subcategoría "${sub}" no encontrada en ${top}`);
    return 0;
  }

  const search = await mlGet(
    `/products/search?site_id=MPE&q=${encodeURIComponent(q)}&category=${mlSubId}&limit=20`
  );
  const conImagen = (search.results || []).filter((r) => (r.pictures || []).length > 0);

  let importados = 0;
  let considerados = 0;
  let topId = null;
  let subId = null;

  for (const r of conImagen) {
    if (considerados >= POR_BUSQUEDA) break;

    const nombre = limpiarNombre(r.name);
    // VALIDACIÓN: sustantivo clave presente y no es accesorio/basura
    if (!sinAcentos(nombre).includes(noun) || esBasura(nombre)) continue;
    considerados++;

    try {
      const detalle = await mlGet(`/products/${r.id}`);

      // Agrupación de variantes: modelo (familia) + atributos propios
      const atributos = extraerAtributos(detalle);
      const familia = (detalle.family_name || '').trim();
      const modelo = familia ? limpiarNombre(familia) : modeloFallback(nombre, atributos);
      const clave = `${modelo.toLowerCase()}::${claveVariante(atributos)}`;
      if (variantesVistas.has(clave)) continue;
      variantesVistas.add(clave);

      const precioReal = detalle.buy_box_winner && detalle.buy_box_winner.price;
      const sku = `ML-${r.id}`;

      // Reimportación barata: si ya existe el SKU o la misma variante, no se toca la imagen.
      const yaExiste = await pool.query(
        `SELECT 1 FROM productos WHERE sku = $1 OR (modelo = $2 AND atributos = $3::jsonb) LIMIT 1`,
        [sku, modelo, JSON.stringify(atributos)]
      );
      if (yaExiste.rows[0]) continue;

      const precio = precioReal || precioEstimado(top, sku);

      const pic = (detalle.pictures && detalle.pictures[0]) || r.pictures[0];
      const imageUrl = pic.secure_url || pic.url;
      if (!imageUrl) continue;

      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) continue;
      const buffer = Buffer.from(await imgRes.arrayBuffer());
      const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
      const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
      const publicUrl = await subirImagen(buffer, contentType, `${sku}.${ext}`);

      // Crear categorías SOLO cuando hay un producto válido
      if (topId === null) topId = await ensureCategoria(top, null);
      if (subId === null) subId = await ensureCategoria(sub, topId);

      const ins = await pool.query(
        `INSERT INTO productos (categoria_id, sku, nombre, descripcion, precio_regular, precio_oferta, imagen_url, modelo, atributos)
         VALUES ($1, $2, $3, $4, $5, NULL, $6, $7, $8::jsonb)
         ON CONFLICT DO NOTHING RETURNING id`,
        [
          subId, sku, nombre,
          'Producto importado del catálogo de Mercado Libre (precio referencial).',
          precio, publicUrl, modelo.slice(0, 255), JSON.stringify(atributos),
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
        console.log(`  + ${sku} | ${nombre.slice(0, 45)} | S/ ${precio} | ${variante}`);
      }
    } catch (err) {
      console.warn(`  ! ${r.id}: ${err.message}`);
    }
    await sleep(250);
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

  // Mapa de subcategorías reales de ML: "Top|Sub" -> id
  console.log('Leyendo árbol de categorías de ML…');
  const subsMap = new Map();
  for (const top of TOPS) {
    const det = await mlGet(`/categories/${top.id}`);
    for (const h of det.children_categories || []) {
      subsMap.set(`${top.nombre}|${h.name}`, h.id);
    }
    await sleep(250);
  }

  console.log(`\nImportando ${QUERIES.length} búsquedas validadas…\n`);
  let total = 0;
  for (const item of QUERIES) {
    console.log(`• ${item.q} → ${item.top} › ${item.sub}`);
    try {
      total += await importarBusqueda(item, subsMap);
    } catch (err) {
      console.warn(`  ! "${item.q}" omitida: ${err.message}`);
    }
    await sleep(1200);
  }

  const p = await pool.query('SELECT COUNT(*) c FROM productos');
  const c = await pool.query('SELECT COUNT(*) c FROM categorias');
  const t = await pool.query('SELECT COUNT(*) c FROM categorias WHERE categoria_padre_id IS NULL');
  const m = await pool.query('SELECT COUNT(DISTINCT modelo) c FROM productos WHERE modelo IS NOT NULL');
  console.log(`\n✅ Importados ${total}. Productos: ${p.rows[0].c} | Categorías: ${c.rows[0].c} (top-level: ${t.rows[0].c})`);
  console.log(`   Modelos (familias): ${m.rows[0].c} → ${p.rows[0].c - m.rows[0].c} variantes adicionales con SKU propio`);
  await pool.end();
}

main().catch((error) => {
  console.error('ERROR:', error.message);
  process.exit(1);
});
