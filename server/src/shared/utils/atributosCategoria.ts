/**
 * Atributos de variante sugeridos según el nombre de la (sub)categoría.
 *
 * Reglas curadas (no dependen de los datos importados, que son inconsistentes).
 * El backend las expone como `atributos_sugeridos` en cada categoría y el
 * backoffice muestra solo esos campos al crear/editar un producto.
 *
 * Es un **respaldo**: apenas la categoría define `atributos_permitidos` (o los
 * hereda de un ancestro), manda ese conjunto. Desde la migración 021 todas las
 * raíces lo definen, así que estas reglas solo entran en juego en categorías
 * nuevas que se creen sin atributos.
 *
 * El orden de las reglas importa: la primera coincidencia gana.
 */

export const ATRIBUTOS_DEFAULT: readonly string[] = ['COLOR', 'LINE'];

interface Regla {
  patron: RegExp;
  atributos: readonly string[];
}

const normalizar = (texto: string): string =>
  (texto ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const REGLAS: readonly Regla[] = [
  {
    // Electrodomésticos (va antes que tecnología para no chocar con "electro").
    patron: /(electrodomest|coccion|licuadora|cafetera|freidora|aspiradora|lavadora|secadora|refriger)/,
    atributos: ['COLOR', 'CAPACIDAD_LITROS', 'CAPACIDAD_KG'],
  },
  {
    // Calzado: talla numérica (antes que moda, que usa talla de letras).
    patron: /(zapatilla|zapato|calzado|sandalia|bota)/,
    atributos: ['COLOR', 'TALLA_CALZADO', 'GENDER', 'LINE'],
  },
  {
    // Tecnología / electrónica / consolas: almacenamiento digital.
    patron: /(celular|smartphone|laptop|notebook|comput|monitor|televisor|tvs?|consola|audio|tablet|camara|electronic|parlante|audifon|videojuego)/,
    atributos: ['COLOR', 'STORAGE_CAPACITY', 'LINE'],
  },
  {
    // Ropa, moda y accesorios: talla de letras.
    patron: /(polo|short|abrigo|ropa|indument|gorra|moda|accesorio|equipaje|bolso|mochila|cartera)/,
    atributos: ['COLOR', 'SIZE', 'GENDER', 'LINE'],
  },
  {
    // Deportes y fitness.
    patron: /(fitness|musculacion|deporte|futbol|balon|mancuern|ciclism|bicicleta)/,
    atributos: ['COLOR', 'SIZE', 'GENDER'],
  },
  {
    // Hogar y muebles.
    patron: /(mueble|hogar|sillon|mesa|jardin|comedor)/,
    atributos: ['COLOR'],
  },
  {
    // Belleza, perfumería e higiene: contenido en ml.
    patron: /(perfume|colonia|belleza|cuidado|higiene)/,
    atributos: ['COLOR', 'CONTENIDO_ML'],
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
