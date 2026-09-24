/**
 * Atributos de variante sugeridos según el nombre de la (sub)categoría.
 *
 * Reglas curadas (no dependen de los datos importados, que son inconsistentes).
 * El backend las expone como `atributos_sugeridos` en cada categoría y el
 * backoffice muestra solo esos campos al crear/editar un producto.
 *
 * El orden de las reglas importa: la primera coincidencia gana.
 */

export const ATRIBUTOS_DEFAULT: readonly string[] = ['COLOR', 'SIZE', 'CAPACITY', 'MODEL'];

interface Regla {
  patron: RegExp;
  atributos: readonly string[];
}

const normalizar = (texto: string): string =>
  (texto ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const REGLAS: readonly Regla[] = [
  {
    // Electrodomésticos y cuidado personal (va antes que tecnología para no chocar con "electro").
    patron: /(electrodomest|coccion|licuadora|cafetera|freidora|aspiradora|cabello|secadora|plancha|refriger)/,
    atributos: ['COLOR', 'CAPACITY', 'MODEL', 'LINE'],
  },
  {
    // Tecnología / electrónica / consolas.
    patron: /(celular|smartphone|laptop|notebook|comput|monitor|televisor|tvs?|consola|audio|tablet|camara|electronic|parlante|audifon|videojuego)/,
    atributos: ['COLOR', 'CAPACITY', 'STORAGE_CAPACITY', 'MODEL', 'LINE'],
  },
  {
    // Ropa, calzado y accesorios.
    patron: /(zapatilla|calzado|polo|short|abrigo|ropa|indument|gorra|moda|accesorio|equipaje|bolso|mochila|cartera)/,
    atributos: ['COLOR', 'SIZE', 'GENDER'],
  },
  {
    // Deportes y fitness.
    patron: /(fitness|musculacion|deporte|futbol|balon|mancuern|ciclism|bicicleta)/,
    atributos: ['COLOR', 'SIZE', 'CAPACITY'],
  },
  {
    // Hogar y muebles.
    patron: /(mueble|hogar|sillon|mesa|jardin|comedor)/,
    atributos: ['COLOR', 'SIZE', 'MODEL'],
  },
  {
    // Belleza y perfumería.
    patron: /(perfume|colonia|belleza|cuidado)/,
    atributos: ['COLOR', 'CAPACITY'],
  },
  {
    // Juegos y juguetes.
    patron: /(juguete|peluche|juego|lego|construccion)/,
    atributos: ['COLOR', 'SIZE'],
  },
];

/** Devuelve las claves de atributo sugeridas para el nombre de categoría dado. */
export function atributosSugeridosPara(nombreCategoria: string): string[] {
  const nombre = normalizar(nombreCategoria);
  for (const regla of REGLAS) {
    if (regla.patron.test(nombre)) return [...regla.atributos];
  }
  return [...ATRIBUTOS_DEFAULT];
}
