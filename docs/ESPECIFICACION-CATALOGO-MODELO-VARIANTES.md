# Especificación Técnica — Catálogo "Modelo Padre (Producto) / SKU Hijo (Variante)"

**Proyecto:** VeroData Retail
**Alcance:** Reescritura del módulo de catálogo (HU007/HU008/HU028/HU029/HU031) pasando de *modales + matriz cruzada* a *vistas de pantalla completa + lista vertical de variantes*.
**Estado:** Diseño aprobado para implementación. **Requiere actualizar `.ai/02-database.md` y registrar la HU en `.ai/04-sprints-backlog.md` antes de escribir código** (regla de `AGENTS.md` §3 y precedente HU034).

---

## 0. Resumen de decisiones

| # | Problema actual | Decisión |
|---|---|---|
| 1 | `productos` mezcla "producto padre" y "SKU" (`modelo VARCHAR`, sin FK) | Se crea `productos_modelo` (Nuevo registro). `productos` pasa a ser el **SKU hijo** y gana `modelo_id` (FK). |
| 2 | Agrupar por `modelo` string es frágil (renombres, nulos, sin FK) | Agrupación por clave foránea real `productos.modelo_id`. |
| 3 | No hay restricción dura de combinación | `UNIQUE (modelo_id, combinacion_atributos)` vía columna generada + índice único parcial. Choque `23505` → **400 controlado**. |
| 4 | `CreateProductModal`, `EditProductModal`, `MatrizVariantesModal` marean al operador | Se **eliminan**. Nuevas rutas full-screen `/admin/products/new` y `/admin/products/:id/edit`. |
| 5 | Edición de variantes sin protección del historial | SKU y atributos **bloqueados (🔒)** al editar; solo precio/stock/estado editables. Delta JSON entregado al backend. |
| 6 | Sin soporte de código de barras | `productos.codigo_barras VARCHAR(50)` + índice único parcial. |

**Por qué NO renombramos la tabla `productos`:** `pedido_items.producto_id` referencia `productos(id)` y es parte del **snapshot histórico inmutable** (HU018, `AGENTS.md` §2.A). Renombrar forzaría migrar snapshots. `productos` conserva su nombre físico y cambia de semántica a "SKU hijo"; el nuevo padre es `productos_modelo`.

---

## 1. Diagnóstico AS-IS

```
productos (HOY = padre y SKU a la vez)
 ├─ modelo VARCHAR(255)         ← familia, sin FK, editable, agrupa por texto
 ├─ atributos JSONB DEFAULT '{}' ← { COLOR:'Negro', SIZE:'42' }
 ├─ sku VARCHAR(50) UNIQUE
 ├─ precio_regular / precio_oferta
 ├─ imagen_url
 └─ inventario (1:1)             ← stock del SKU

Restricciones:  uq_productos_modelo_atributos UNIQUE(modelo, atributos)   ← NO aplica si modelo IS NULL
```

Defectos concretos que producen los errores que reportas:

1. `uq_productos_modelo_atributos` **no protege** productos creados manualmente (`modelo IS NULL`): se pueden duplicar SKUs de la misma combinación.
2. El "modelo" es texto libre: dos operadores escriben `Zapatilla Runner` / `Zapatillas Runner` y la familia se parte en dos.
3. La Matriz (`MatrizVariantesModal`) construye el producto cartesiano en el cliente; al editar no hay `diff`, se reenvía todo y se pierde el SKU inmutable.
4. Los modales apilan estado (`useState` de matrices) y no hay bloqueo de campos históricos.

---

## 2. Modelo de datos objetivo

### 2.1 Migración `server/database/migrations/017_productos_modelo.sql`

```sql
-- ============================================================
-- Migración 017 — Producto Padre (Modelo) y SKU Hijo (Variante)
-- Regla de negocio: el Modelo agrupa; el SKU es la unidad vendible
-- y de inventario. Idempotente.
-- ============================================================

-- 1. PRODUCTO PADRE (MODELO): info común, sin stock ni venta directa
CREATE TABLE IF NOT EXISTS productos_modelo (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    categoria_id     INTEGER NOT NULL REFERENCES categorias(id) ON DELETE RESTRICT,
    nombre           VARCHAR(150) NOT NULL,          -- nombre base comercial
    marca            VARCHAR(80),                    -- alimenta el token BRAND del SKU
    modelo_codigo    VARCHAR(60),                    -- alimenta el token MODEL del SKU
    descripcion      TEXT,
    -- Ejes de variante elegidos por el operador (subconjunto de los atributos de la categoría)
    atributos_variantes TEXT[] NOT NULL DEFAULT '{}',
    activo           BOOLEAN NOT NULL DEFAULT TRUE,
    destacado        BOOLEAN NOT NULL DEFAULT FALSE,
    destacado_orden  INTEGER,
    creado_en        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_modelo_categoria ON productos_modelo(categoria_id);
CREATE INDEX IF NOT EXISTS idx_modelo_activo    ON productos_modelo(activo);
CREATE INDEX IF NOT EXISTS idx_modelo_destacado ON productos_modelo(destacado, destacado_orden);

-- 2. SKU HIJO: `productos` pasa a colgar del modelo
ALTER TABLE productos ADD COLUMN IF NOT EXISTS modelo_id UUID
    REFERENCES productos_modelo(id) ON DELETE CASCADE;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS codigo_barras VARCHAR(50);

-- 2.1 Combinación canónica de atributos (llave de unicidad dura)
--     Las funciones generadas no admiten subconsultas -> función IMMUTABLE.
CREATE OR REPLACE FUNCTION combinar_atributos(a JSONB)
RETURNS TEXT
LANGUAGE sql IMMUTABLE
AS $$
  SELECT COALESCE(string_agg(key || '=' || value, '|' ORDER BY key), '')
  FROM jsonb_each_text(COALESCE(a, '{}'::jsonb));
$$;

ALTER TABLE productos ADD COLUMN IF NOT EXISTS combinacion_atributos TEXT
    GENERATED ALWAYS AS (combinar_atributos(atributos)) STORED;

-- 3. REQUISITO 6 — UNIQUE(modelo_id, combinacion_atributos)
CREATE UNIQUE INDEX IF NOT EXISTS uq_productos_modelo_combinacion
    ON productos (modelo_id, combinacion_atributos)
    WHERE modelo_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_productos_codigo_barras
    ON productos (codigo_barras)
    WHERE codigo_barras IS NOT NULL;

-- 4. Imágenes generales del padre (la galería actual cuelga del SKU)
ALTER TABLE producto_imagenes ADD COLUMN IF NOT EXISTS modelo_id UUID
    REFERENCES productos_modelo(id) ON DELETE CASCADE;
ALTER TABLE producto_imagenes ALTER COLUMN producto_id DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_imagen_principal_modelo
    ON producto_imagenes (modelo_id)
    WHERE es_principal AND modelo_id IS NOT NULL;

-- 5. Backfill: cada `modelo` de texto existente se promueve a fila de productos_modelo
INSERT INTO productos_modelo (id, categoria_id, nombre, activo)
SELECT gen_random_uuid(), p.categoria_id, p.modelo, TRUE
FROM (SELECT DISTINCT modelo, categoria_id FROM productos WHERE modelo IS NOT NULL) p
ON CONFLICT DO NOTHING;

UPDATE productos p
SET modelo_id = m.id
FROM productos_modelo m
WHERE p.modelo_id IS NULL
  AND p.modelo IS NOT NULL
  AND m.nombre = p.modelo
  AND m.categoria_id = p.categoria_id;
```

> **Deuda controlada:** la columna `productos.modelo VARCHAR(255)` se mantiene durante la transición (el storefront y la importación ML la leen) y se marca `@deprecated` en el código. Un sprint posterior la elimina cuando el storefront lea `modelo_id`.

### 2.2 Diagrama de relaciones

```
categorias ─1:N─> productos_modelo ─1:N─> productos (SKU) ─1:1─> inventario
     │                   │                      │
 categorias_atributos  producto_imagenes     pedido_items  (snapshot inmutable)
     │                (modelo_id)            (producto_id  = SKU vendido)
 atributos ─1:N─> atributo_valores
```

Reglas de integridad:

- **Modelo:** no tiene `stock` ni precio; `activo = FALSE` oculta todos sus SKUs del storefront.
- **SKU:** precio propio, `codigo_barras`, `activo`; su `sku` y sus `atributos` son **inmutables** tras el alta (HU031 CA05).
- **`eliminar_variantes`** = borrado lógico (`activo = FALSE`), nunca `DELETE`: protege `pedido_items` (HU009).

---

## 3. Contratos de API

Base versionada `/api/v1` (`.ai/03-guidelines.md` §3.1), envelope `ApiResponse<T>`, roles `ADMIN`/`SUPER_ADMIN`.

| Método | Ruta | Uso |
|---|---|---|
| `GET` | `/api/v1/product-models` | Listado de modelos (paginable/filtrable) |
| `POST` | `/api/v1/product-models` | Alta del padre (datos comunes) |
| `GET` | `/api/v1/product-models/:id` | Ficha completa: modelo + atributos de categoría + variantes |
| `PATCH` | `/api/v1/product-models/:id` | Edición de datos comunes |
| `POST` | `/api/v1/product-models/:id/variantes/delta` | **Aplicar delta** (nuevas/actualizar/eliminar) en 1 transacción ACID |
| `GET` | `/api/v1/categories/:id/atributos` | Atributos efectivos + valores para armar el formulario |

### 3.1 Tu JSON literal vs. JSON generalizado

Tu ejemplo usa claves fijas (`color`, `talla`) y un `producto_id` numérico. Eso no escala: las categorías definen atributos dinámicos (`COLOR`, `SIZE`, `STORAGE_CAPACITY`, …) y los IDs del sistema son **UUID** (`.ai/02-database.md` §6). Se conserva **tu forma**, generalizando las claves:

```jsonc
// ENVIADO A POST /api/v1/product-models/:id/variantes/delta
{
  "nuevas_variantes": [
    {
      "atributos": { "COLOR": "Negro", "SIZE": "42" },   // <-- antes color/talla
      "sku": "ZAP-NEG-42",              // opcional si la categoría tiene plantilla HU031
      "codigo_barras": "7801234567890", // opcional
      "precio_regular": 89.99,
      "precio_oferta": null,
      "stock_actual": 10,
      "stock_minimo": 5
    }
  ],
  "actualizar_variantes": [
    { "sku_id": "0b1f...uuid", "precio_regular": 95.00, "stock_actual": 5 } // SKU/atributos NO viajan: son inmutables
  ],
  "eliminar_variantes": ["3c9a...uuid"]   // borrado lógico activo=false
}
```

Nota: el `producto_id` de tu ejemplo se reemplaza por el **path param `:id`** (UUID del modelo), evitando ambigüedad sobre qué entidad se edita.

### 3.2 Respuestas

```jsonc
// 200 OK
{
  "success": true,
  "message": "Variantes actualizadas: 1 creada, 1 actualizada, 1 desactivada",
  "data": {
    "creadas": 1, "actualizadas": 1, "desactivadas": 1,
    "variantes": [ /* lista recargada de SKUs del modelo */ ]
  }
}
```

```jsonc
// 400 — duplicado de combinación (REQUISITO 6)
{
  "success": false,
  "error": {
    "code": "VARIANT_ALREADY_EXISTS",
    "message": "Ya existe la variante Negro / 42 para este producto.",
    "details": { "combinacion": { "COLOR": "Negro", "SIZE": "42" } }
  }
}
```

| `code` | HTTP | Cuándo |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Zod (incluye duplicados dentro del propio payload) |
| `VARIANT_ALREADY_EXISTS` | 400 | Índice `uq_productos_modelo_combinacion` (`23505`) |
| `SKU_ALREADY_EXISTS` | 409 | `productos.sku` duplicado |
| `INVALID_ATTRIBUTE` | 400 | Eje no permitido por la categoría (HU029 CA04) |
| `MODEL_NOT_FOUND` | 404 | Modelo inexistente |
| `VARIANT_NOT_FOUND` | 400 | `sku_id` de `actualizar/eliminar` no pertenece al modelo |

---

## 4. Backend

### 4.1 `product-model.schemas.ts` (Zod)

```ts
import { z } from 'zod';

const atributosSchema = z.record(z.string().trim().max(100));

export const MAX_VARIANTES_DELTA = 200;

const precioOfertaSchema = z
  .preprocess((v) => (v === '' ? null : v), z.number().positive().max(1_000_000).nullable())
  .optional();

export const nuevaVarianteSchema = z
  .object({
    atributos: atributosSchema,
    sku: z.string().trim().min(3).max(50).optional(),
    codigo_barras: z.string().trim().min(6).max(50).nullable().optional(),
    precio_regular: z.number().positive({ message: 'El precio debe ser mayor a 0' }).max(1_000_000),
    precio_oferta: precioOfertaSchema,
    stock_actual: z.number().int().min(0, { message: 'El stock no puede ser negativo' }),
    stock_minimo: z.number().int().min(0).optional(),
  })
  .refine((d) => d.precio_oferta == null || d.precio_oferta < d.precio_regular, {
    message: 'El precio de oferta debe ser menor que el precio regular',
    path: ['precio_oferta'],
  });

export const actualizarVarianteSchema = z
  .object({
    sku_id: z.string().uuid({ message: 'Identificador de variante inválido' }),
    // SKU y atributos NO se aceptan: son inmutables (HU031 CA05).
    precio_regular: z.number().positive().max(1_000_000).optional(),
    precio_oferta: precioOfertaSchema,
    stock_actual: z.number().int().min(0).optional(),
    stock_minimo: z.number().int().min(0).optional(),
    codigo_barras: z.string().trim().min(6).max(50).nullable().optional(),
    activo: z.boolean().optional(),
  })
  .refine((d) => Object.values(d).some((v) => v !== undefined), {
    message: 'Debe enviar al menos un campo para actualizar',
  });

export const deltaVariantesSchema = z.object({
  nuevas_variantes: z.array(nuevaVarianteSchema).max(MAX_VARIANTES_DELTA).default([]),
  actualizar_variantes: z.array(actualizarVarianteSchema).max(500).default([]),
  eliminar_variantes: z.array(z.string().uuid()).max(MAX_VARIANTES_DELTA).default([]),
});

export const crearModeloSchema = z.object({
  categoria_id: z.number().int().positive({ message: 'Selecciona una categoría' }),
  nombre: z.string().trim().min(2).max(150),
  marca: z.string().trim().max(80).nullable().optional(),
  modelo_codigo: z.string().trim().max(60).nullable().optional(),
  descripcion: z.string().trim().max(2000).nullable().optional(),
  atributos_variantes: z.array(z.string().trim().max(40)).max(12).default([]),
});

export const modeloIdParamSchema = z.object({
  id: z.string().uuid({ message: 'Identificador de producto inválido' }),
});

export type DeltaVariantesInput = z.infer<typeof deltaVariantesSchema>;
export type CrearModeloInput = z.infer<typeof crearModeloSchema>;
```

### 4.2 `product-model.service.ts` — núcleo transaccional

```ts
import { productModelRepository } from '../repositories/product-model.repository';
import { categoryRepository } from '../../categories/repositories/category.repository';
import { atributoRepository } from '../../atributos/repositories/atributo.repository';
import { resolverAtributosEfectivos } from '../../../shared/utils/atributosEfectivos';
import { generarSkuEstructurado } from '../../../shared/utils/sku';
import { normalizarValorAtributo } from '../../products/services/product.service';
import { ApiFailure, ApiResponse } from '../../../shared/types/api.types';
import { DeltaVariantesInput } from '../schemas/product-model.schemas';

function fallo(code: string, message: string, details: unknown = null): ApiFailure {
  return { success: false, error: { code, message, details } };
}

/** Combina el modelo (BRAND/MODEL) con los atributos del SKU y normaliza (HU026). */
function atributosDelSku(
  base: Record<string, string>,
  ejes: string[]
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of ejes) {
    const raw = base[key]?.trim();
    if (!raw) continue;
    const val = normalizarValorAtributo(raw);
    if (val) out[key] = val;
  }
  return out;
}

export const productModelService = {
  /**
   * Aplica el delta de variantes en UNA transacción ACID.
   * Valida categoría, ejes permitidos y duplicados ANTES de abrir la TX;
   * el índice único de BD es la última barrera (23505 -> 400 controlado).
   */
  async aplicarDelta(
    modeloId: string,
    input: DeltaVariantesInput
  ): Promise<ApiResponse<ResumenDelta>> {
    const modelo = await productModelRepository.obtenerPorId(modeloId);
    if (!modelo) return fallo('MODEL_NOT_FOUND', 'El producto no existe');

    const cadena = await categoryRepository.obtenerCadenaAtributos(modelo.categoria_id);
    if (!cadena) return fallo('MODEL_NOT_FOUND', 'La categoría del producto no existe');

    const permitidos = resolverAtributosEfectivos(cadena.cadenas, cadena.nombre);
    const ejes = modelo.atributos_variantes.length > 0 ? modelo.atributos_variantes : permitidos;
    const setEjes = new Set(ejes);

    // 1) Normalizar + validar ejes y combinaciones dentro del payload
    const vistas = new Set<string>();
    const nuevas = input.nuevas_variantes.map((v) => {
      const atributos = atributosDelSku(v.atributos, ejes);
      const invalidos = Object.keys(atributos).filter((k) => !setEjes.has(k));
      if (invalidos.length > 0) {
        throw new AtributoInvalido(invalidos, ejes);
      }
      const faltantes = ejes.filter((k) => !atributos[k]);
      if (faltantes.length > 0) {
        throw new AtributoFaltante(faltantes);
      }
      const clave = JSON.stringify(atributos);
      if (vistas.has(clave)) throw new VarianteDuplicada(atributos);
      vistas.add(clave);
      return { ...v, atributos };
    });

    // 2) Ejecutar la transacción
    try {
      const resumen = await productModelRepository.aplicarDelta(modeloId, {
        nuevas,
        actualizar: input.actualizar_variantes.map((a) => ({
          ...a,
          precio_oferta: a.precio_oferta ?? undefined,
        })),
        eliminar: input.eliminar_variantes,
      });
      const variantes = await productModelRepository.listarVariantes(modeloId);
      return {
        success: true,
        message: `Variantes actualizadas: ${resumen.creadas} creada(s), ${resumen.actualizadas} actualizada(s), ${resumen.desactivadas} desactivada(s)`,
        data: { ...resumen, variantes },
      };
    } catch (error) {
      if (esUniqueViolation(error)) {
        const constraint = (error as { constraint?: string }).constraint ?? '';
        if (constraint.includes('combinacion')) {
          return fallo('VARIANT_ALREADY_EXISTS', 'Ya existe esa combinación de atributos para este producto.');
        }
        if (constraint.includes('codigo_barras')) {
          return fallo('BARCODE_ALREADY_EXISTS', 'Ese código de barras ya está registrado.');
        }
        return fallo('SKU_ALREADY_EXISTS', 'Ya existe un producto con ese SKU.');
      }
      throw error;
    }
  },
};

function esUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === '23505';
}
```

**Excepciones de dominio** (archivo `product-model.errors.ts`) mapeadas por el controller a **400**:

```ts
export class VarianteDuplicada extends Error {
  constructor(readonly combinacion: Record<string, string>) {
    super('Esa combinación de atributos ya está en el lote enviado.');
    this.name = 'VarianteDuplicada';
  }
}
export class AtributoInvalido extends Error {
  constructor(readonly atributos: string[], readonly permitidos: string[]) {
    super(`Atributos no permitidos: ${atributos.join(', ')}`);
    this.name = 'AtributoInvalido';
  }
}
export class AtributoFaltante extends Error {
  constructor(readonly faltantes: string[]) {
    super(`Faltan ejes de variante: ${faltantes.join(', ')}`);
    this.name = 'AtributoFaltante';
  }
}
```

### 4.3 `product-model.repository.ts` — TX ACID

```ts
import pool from '../../../config/db';
import { DeltaPreparado, ModeloRow, SkuRow } from './product-model.types';

export const productModelRepository = {
  async obtenerPorId(id: string): Promise<ModeloRow | null> {
    const r = await pool.query<ModeloRow>(
      `SELECT m.id, m.categoria_id, c.nombre AS categoria_nombre, m.nombre, m.marca,
              m.modelo_codigo, m.descripcion, m.atributos_variantes, m.activo,
              m.destacado, m.destacado_orden, m.creado_en, m.actualizado_en
       FROM productos_modelo m
       JOIN categorias c ON c.id = m.categoria_id
       WHERE m.id = $1 LIMIT 1`,
      [id]
    );
    return r.rows[0] ?? null;
  },

  async listarVariantes(modeloId: string): Promise<SkuRow[]> {
    const r = await pool.query<SkuRow>(
      `SELECT p.id, p.sku, p.codigo_barras, p.atributos, p.precio_regular::float8 AS precio_regular,
              p.precio_oferta::float8 AS precio_oferta, p.activo,
              COALESCE(i.stock_actual, 0) AS stock_actual,
              COALESCE(i.stock_minimo, 5) AS stock_minimo
       FROM productos p
       LEFT JOIN inventario i ON i.producto_id = p.id
       WHERE p.modelo_id = $1
       ORDER BY p.creado_en ASC`,
      [modeloId]
    );
    return r.rows;
  },

  /** Delta completo en una sola transacción con bloqueo del padre (serializa concurrencia). */
  async aplicarDelta(modeloId: string, delta: DeltaPreparado): Promise<{
    creadas: number; actualizadas: number; desactivadas: number;
  }> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Serializa ediciones concurrentes del mismo modelo -> evita carreras del índice único.
      await client.query('SELECT id FROM productos_modelo WHERE id = $1 FOR UPDATE', [modeloId]);

      let creadas = 0;
      for (const v of delta.nuevas) {
        const ins = await client.query<{ id: string }>(
          `INSERT INTO productos
             (modelo_id, categoria_id, sku, codigo_barras, nombre, descripcion,
              precio_regular, precio_oferta, atributos, activo)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, TRUE)
           RETURNING id`,
          [modeloId, v.categoria_id, v.sku, v.codigo_barras, v.nombre, v.descripcion,
           v.precio_regular, v.precio_oferta, JSON.stringify(v.atributos)]
        );
        await client.query(
          `INSERT INTO inventario (producto_id, stock_actual, stock_minimo)
           VALUES ($1, $2, $3)`,
          [ins.rows[0].id, v.stock_actual, v.stock_minimo]
        );
        creadas += 1;
      }

      let actualizadas = 0;
      for (const v of delta.actualizar) {
        const upd = await client.query(
          `UPDATE productos
             SET precio_regular = COALESCE($1, precio_regular),
                 precio_oferta  = CASE WHEN $2::boolean THEN $3 ELSE precio_oferta END,
                 codigo_barras  = COALESCE($4, codigo_barras),
                 activo         = COALESCE($5, activo),
                 actualizado_en = NOW()
           WHERE id = $6 AND modelo_id = $7`,
          [v.precio_regular, v.reemplazaOferta, v.precio_oferta, v.codigo_barras, v.activo, v.sku_id, modeloId]
        );
        if ((upd.rowCount ?? 0) === 0) throw new VarianteAjena(v.sku_id);

        await client.query(
          `INSERT INTO inventario (producto_id, stock_actual, stock_minimo)
           VALUES ($1, COALESCE($2, 0), COALESCE($3, 5))
           ON CONFLICT (producto_id) DO UPDATE
             SET stock_actual = COALESCE($2, inventario.stock_actual),
                 stock_minimo = COALESCE($3, inventario.stock_minimo),
                 actualizado_en = NOW()`,
          [v.sku_id, v.stock_actual, v.stock_minimo]
        );
        actualizadas += 1;
      }

      let desactivadas = 0;
      if (delta.eliminar.length > 0) {
        const res = await client.query(
          `UPDATE productos SET activo = FALSE, actualizado_en = NOW()
           WHERE modelo_id = $1 AND id = ANY($2::uuid[])`,
          [modeloId, delta.eliminar]
        );
        desactivadas = res.rowCount ?? 0;
      }

      await client.query('COMMIT');
      return { creadas, actualizadas, desactivadas };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },
};
```

Puntos de integridad garantizados:

- `FOR UPDATE` sobre el modelo → dos operadores guardando a la vez se serializan.
- Todo el delta es **atómico**: si un SKU falla, `ROLLBACK` completo (ninguna variante parcial).
- El stock se escribe con `ON CONFLICT` (upsert) y respeta `CHECK (stock_actual >= 0)`.

### 4.4 Controller — mapeo de errores a HTTP

```ts
async aplicarDelta(req: Request, res: Response): Promise<void> {
  try {
    const params = modeloIdParamSchema.safeParse(req.params);
    if (!params.success) { res.status(400).json(validationError(params.error.flatten().fieldErrors)); return; }
    const body = deltaVariantesSchema.safeParse(req.body);
    if (!body.success) { res.status(400).json(validationError(body.error.flatten().fieldErrors)); return; }

    const result = await productModelService.aplicarDelta(params.data.id, body.data);
    if (!result.success) {
      const status =
        result.error.code === 'MODEL_NOT_FOUND' ? 404 :
        result.error.code === 'SKU_ALREADY_EXISTS' ? 409 : 400; // VARIANT_ALREADY_EXISTS -> 400
      res.status(status).json(result);
      return;
    }
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof VarianteDuplicada) {
      res.status(400).json(fallo('VARIANT_ALREADY_EXISTS', error.message, { combinacion: error.combinacion }));
      return;
    }
    if (error instanceof AtributoInvalido) {
      res.status(400).json(fallo('INVALID_ATTRIBUTE', error.message, { atributos: error.atributos, permitidos: error.permitidos }));
      return;
    }
    if (error instanceof AtributoFaltante) {
      res.status(400).json(fallo('MISSING_REQUIRED_ATTRIBUTE', error.message, { faltantes: error.faltantes }));
      return;
    }
    console.error('[ProductModelController] aplicarDelta error:', error);
    res.status(500).json(internalError());
  }
}
```

### 4.5 Rutas `product-model.routes.ts`

```ts
const router = Router();
router.use(authenticate, authorize('SUPER_ADMIN', 'ADMIN'));

router.get('/', productModelController.listar);
router.post('/', productModelController.crear);
router.get('/:id', productModelController.obtener);
router.patch('/:id', productModelController.actualizar);
router.post('/:id/variantes/delta', productModelController.aplicarDelta);

export default router;   // montar en index.ts: /api/v1/product-models
```

---

## 5. Frontend — rutas y estructura de pantallas

### 5.1 Router (`client/src/App.tsx`) — se eliminan los modales

```diff
  <Route path="/admin/products" element={<ProductsPage />} />
+ <Route path="/admin/products/new" element={<ProductoEditorPage modo="crear" />} />
+ <Route path="/admin/products/:id/edit" element={<ProductoEditorPage modo="editar" />} />
  <Route path="/admin/categories" element={<CategoriesPage />} />
```

`ProductsPage.tsx` pierde `CreateProductModal`, `EditProductModal` y `MatrizVariantesModal`; los botones pasan a `Link`/`navigate`:

```tsx
<Link className={buttonClasses('primary', 'md')} to="/admin/products/new">
  <Plus size={15} aria-hidden="true" /> Nuevo producto
</Link>
```

### 5.2 Pantalla "Crear/Editar Producto" (layout 70/30, sin modales)

Se monta dentro de `BackofficeLayout` (sidebar fijo a la izquierda) vía `<Outlet />`.

```
┌─ Sidebar fijo ─┬───────────────────────────────────────────────────────────────┐
│                │ ← Volver a Catálogo            [Cancelar]  [Guardar cambios]   │
│                ├──────────────────────────────┬────────────────────────────────┤
│                │ COLUMNA PRINCIPAL — 70%      │ PANEL LATERAL — 30%            │
│                │                              │                                │
│                │ 1. Datos básicos             │ Estado                         │
│                │   Nombre · Marca · Modelo    │  ● Activo  (toggle)            │
│                │   Descripción                │                                │
│                │                              │ Imágenes generales             │
│                │ 2. Categoría                 │  Galería del PADRE             │
│                │   Select jerárquico          │                                │
│                │   → Ropa › Zapatillas        │ Resumen                        │
│                │   [COLOR] [TALLA]  ← ejes    │  N SKUs · stock total          │
│                │   habilitados por categoría  │                                │
│                │                              │                                │
│                │ 3. VARIANTES E INVENTARIO    │                                │
│                │   [+ Agregar variante]       │                                │
│                │   ┌────────────────────────┐ │                                │
│                │   │ tabla vertical (abajo) │ │                                │
│                │   └────────────────────────┘ │                                │
└────────────────┴──────────────────────────────┴────────────────────────────────┘
```

- **Comportamiento dinámico:** al elegir la categoría se llama `GET /api/v1/categories/:id/atributos`; el formulario habilita los ejes de variante devueltos. Un producto de "Zapatillas" nunca ofrece "Almacenamiento".
- **Antes de definir categoría**, la sección "Variantes" aparece deshabilitada con una nota (`"Elige una categoría para configurar sus ejes"`).
- **Modo edición:** el `:id` es el del **modelo**; se cargan `modelo + listarVariantes`.

### 5.3 Sección "Variantes e Inventario" — tabla vertical

Requisito 4. `+ Agregar variante` abre un **subformulario inline** (no modal) dentro de la misma pantalla:

```
┌ Atributos ─────┬ SKU (🔒) ────┬ Stock ─┬ Precio ─┬ Oferta ─┬ Activo ┬ ⋯ ┐
│ Negro · 42  🔒  │ ZAP-NEG-42   │  5 ┃   │ 89.99 ┃ │   —  ┃ │  ●    │ 🗑 │  ← existente
│ Negro · 43  🔒  │ ZAP-NEG-43   │ 10 ┃   │ 89.99 ┃ │ 74.90┃ │  ●    │ 🗑 │  ← existente
│ [Color ▾][Talla ▾]  [SKU auto]  [ 0 ]   [ 0.00 ]  [ opt ]  [Confirmar] [×]  │  ← fila nueva inline
└─────────────────┴──────────────┴───────┴─────────┴────────┴────────┴───┘
  ↑ Celda en edición: `Input`/`Select` de `components/ui/` (prohibido `<select>` nativo).
```

Reglas de interacción:

- Filas existentes: `🔒` (Lock de `lucide-react`) sobre atributos y SKU con `title="Este dato es inmutable."` — protegidos por inmutabilidad (HU031 CA05).
- Precio/stock/estado siempre editables (con `type="number"`, `step="0.01"`, `inputMode="decimal"`).
- Fila nueva: lleva badge `Nueva variante` (pill esmeralda `pill-tag-green`).
- Interruptor `activar/desactivar` por fila → el delta aplica `activo` (o `eliminar_variantes` para borrado lógico).
- Los 4 estados obligatorios (`impeccable`): skeleton de tabla, empty state con CTA "+ Agregar variante", error con reintento, éxito.

---

## 6. Frontend — estructura de estado y lógica delta

### 6.1 Tipos (`client/src/types/productModel.types.ts`)

```ts
export type EstadoVariante = 'existente' | 'nueva' | 'eliminada';

export interface AtributosVariante { [codigo: string]: string }

/** Fila de la tabla vertical (estado de UI enriquecido). */
export interface VarianteDraft {
  /** Clave estable de React: id persistido o randomUUID() para filas nuevas. */
  key: string;
  id: string | null;                    // producto_id (SKU) o null si es nueva
  sku: string;                          // 🔒 si id !== null
  codigo_barras: string | null;
  atributos: AtributosVariante;         // 🔒 si id !== null
  precio_regular: number;
  precio_oferta: number | null;
  stock_actual: number;
  stock_minimo: number;
  activo: boolean;
  estado: EstadoVariante;
  /** Marcas para saber si hay que enviarla en `actualizar_variantes`. */
  dirty: { precio: boolean; stock: boolean; estadoActivo: boolean; barcode: boolean };
}

export interface ModeloDraft {
  categoria_id: number | null;
  nombre: string;
  marca: string;
  modelo_codigo: string;
  descripcion: string;
  atributos_variantes: string[];
  activo: boolean;
}

/** Cuerpo de POST /:id/variantes/delta */
export interface DeltaVariantesPayload {
  nuevas_variantes: Array<{
    atributos: AtributosVariante;
    sku?: string;
    codigo_barras?: string | null;
    precio_regular: number;
    precio_oferta?: number | null;
    stock_actual: number;
    stock_minimo?: number;
  }>;
  actualizar_variantes: Array<{
    sku_id: string;
    precio_regular?: number;
    precio_oferta?: number | null;
    stock_actual?: number;
    stock_minimo?: number;
    codigo_barras?: string | null;
    activo?: boolean;
  }>;
  eliminar_variantes: string[];
}
```

### 6.2 Reducer de la tabla

```ts
import { randomUUID } from 'node:crypto'; // ❌ NO: en el front no existe 'node:crypto'
```

> En el cliente usar `crypto.randomUUID()` (Web Crypto, disponible en navegadores) — **nunca `Math.random()`** (Sonar `S2245`).

```ts
// client/src/pages/admin/producto-editor/variantesReducer.ts
import type { AtributosVariante, EstadoVariante, VarianteDraft } from '../../../types/productModel.types';

export type VariantesAction =
  | { type: 'cargar'; variantes: VarianteDraft[] }
  | { type: 'agregar'; atributos: AtributosVariante; campos: Partial<VarianteDraft> }
  | { type: 'editar'; key: string; campo: 'precio_regular' | 'precio_oferta' | 'stock_actual' | 'stock_minimo' | 'codigo_barras'; valor: number | string | null }
  | { type: 'toggleActivo'; key: string }
  | { type: 'marcarEliminar'; key: string }
  | { type: 'restaurar'; key: string };

function nueva(key: string, atributos: AtributosVariante, campos: Partial<VarianteDraft>): VarianteDraft {
  return {
    key,
    id: null, sku: '', codigo_barras: null, atributos,
    precio_regular: 0, precio_oferta: null, stock_actual: 0, stock_minimo: 5,
    activo: true, estado: 'nueva',
    dirty: { precio: true, stock: true, estadoActivo: false, barcode: false },
    ...campos,
  };
}

export function variantesReducer(state: VarianteDraft[], action: VariantesAction): VarianteDraft[] {
  switch (action.type) {
    case 'cargar':
      return action.variantes;
    case 'agregar':
      // crypto.randomUUID() es Web Crypto -> impredecible y sin Math.random (S2245).
      return [...state, nueva(crypto.randomUUID(), action.atributos, action.campos)];
    case 'editar':
      return state.map((v) => (v.key === action.key ? aplicarCampo(v, action) : v));
    case 'toggleActivo':
      return state.map((v) =>
        v.key === action.key
          ? { ...v, activo: !v.activo, estado: v.id === null ? v.estado : (v.activo ? 'eliminada' : 'existente'), dirty: { ...v.dirty, estadoActivo: v.id !== null } }
          : v
      );
    case 'marcarEliminar':
      return state.map((v) => (v.key === action.key ? { ...v, estado: 'eliminada' as EstadoVariante } : v));
    case 'restaurar':
      return state.map((v) => (v.key === action.key ? { ...v, estado: 'existente' as EstadoVariante, activo: true } : v));
    default:
      return state;
  }
}

function aplicarCampo(v: VarianteDraft, a: Extract<VariantesAction, { type: 'editar' }>): VarianteDraft {
  const dirty = { ...v.dirty };
  if (a.campo === 'precio_regular' || a.campo === 'precio_oferta') dirty.precio = true;
  if (a.campo === 'stock_actual' || a.campo === 'stock_minimo') dirty.stock = true;
  if (a.campo === 'codigo_barras') dirty.barcode = true;
  return { ...v, [a.campo]: a.valor, dirty };
}
```

### 6.3 `calcularDelta` — función pura y testeable (Requisito 5)

```ts
// client/src/pages/admin/producto-editor/calcularDelta.ts
import type { DeltaVariantesPayload, VarianteDraft } from '../../../types/productModel.types';

/**
 * Compara el estado original (persistido) con el actual y devuelve SOLO el delta.
 * - Filas nuevas (id === null, estado 'nueva') -> nuevas_variantes
 * - Filas con dirty -> actualizar_variantes (nunca SKU/atributos)
 * - Filas 'eliminada' o con activo cambiado a false -> eliminar_variantes (borrado lógico)
 */
export function calcularDelta(
  originales: VarianteDraft[],
  actuales: VarianteDraft[]
): DeltaVariantesPayload {
  const payload: DeltaVariantesPayload = {
    nuevas_variantes: [],
    actualizar_variantes: [],
    eliminar_variantes: [],
  };

  for (const v of actuales) {
    if (v.estado === 'eliminada' && v.id !== null) {
      payload.eliminar_variantes.push(v.id);
      continue;
    }
    if (v.id === null) {
      payload.nuevas_variantes.push({
        atributos: v.atributos,
        ...(v.sku ? { sku: v.sku } : {}),
        codigo_barras: v.codigo_barras,
        precio_regular: v.precio_regular,
        precio_oferta: v.precio_oferta,
        stock_actual: v.stock_actual,
        stock_minimo: v.stock_minimo,
      });
      continue;
    }
    const orig = originales.find((o) => o.id === v.id);
    if (!orig) continue;
    const cambio =
      v.dirty.precio || v.dirty.stock || v.dirty.estadoActivo || v.dirty.barcode;
    if (!cambio) continue;
    payload.actualizar_variantes.push({
      sku_id: v.id,
      ...(v.dirty.precio ? { precio_regular: v.precio_regular, precio_oferta: v.precio_oferta } : {}),
      ...(v.dirty.stock ? { stock_actual: v.stock_actual, stock_minimo: v.stock_minimo } : {}),
      ...(v.dirty.barcode ? { codigo_barras: v.codigo_barras } : {}),
      ...(v.dirty.estadoActivo ? { activo: v.activo } : {}),
    });
  }
  return payload;
}
```

Prueba de regresión obligatoria (cobertura ≥ 80%, skill §1):

```ts
it('convierte "Negro 42" ya existente en solo una actualización de precio', () => {
  const originales = [existente('SKU1', 'ZAP-NEG-42', { COLOR: 'Negro', SIZE: '42' }, 89.99, 10)];
  const actuales = [{ ...originales[0], precio_regular: 95, dirty: { ...originales[0].dirty, precio: true } }];
  expect(calcularDelta(originales, actuales)).toEqual({
    nuevas_variantes: [],
    actualizar_variantes: [{ sku_id: 'SKU1', precio_regular: 95, precio_oferta: null }],
    eliminar_variantes: [],
  });
});
```

### 6.4 Hook de guardado

```ts
// client/src/pages/admin/producto-editor/useGuardarProducto.ts
export function useGuardarProducto(modeloId: string | null) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const guardar = useCallback(
    async (modelo: ModeloDraft, delta: DeltaVariantesPayload): Promise<boolean> => {
      setGuardando(true);
      setError(null);
      try {
        const base = modeloId ?? (await crearModelo(modelo));   // POST /product-models
        if (modeloId) await apiClient.patch(`/api/v1/product-models/${modeloId}`, modelo);
        const res = await apiClient.post(`/api/v1/product-models/${base}/variantes/delta`, delta); // 1 sola TX
        if (!res.success) { setError(res.error.message); return false; }
        return true;
      } catch (e) {
        setError(e instanceof ApiClientError ? e.message : 'No se pudieron guardar los cambios');
        return false;
      } finally {
        setGuardando(false);
      }
    },
    [modeloId]
  );
  return { guardar, guardando, error };
}
```

---

## 7. Módulo de Categorías (sidebar) y atributos ligados

Requisito 2. **Ya existe** (HU029/HU030/HU031, migración 016): `categorias_atributos` es el vínculo N:M categoría↔atributo maestro, con herencia efectiva. Lo que se cambia es la **presentación**: el `CategoryModal` actual se reemplaza por una vista dedicada.

```
/admin/categories   (pantalla completa, sin modales)
┌─ Árbol jerárquico ∞ ────────────┬─ Detalle de la categoría seleccionada ─────────┐
│ Ropa                            │ Nombre · Slug · Descripción                    │
│  ├ Zapatillas        (3)        │ Categoría padre ▾                              │
│  │  ├ Running                    │ ── Atributos de Categoría ────────────────     │
│  │  └ Urban                     │ ☑ Color    ☑ Talla Calzado   ☐ Almacenamiento  │
│ Tecnología                     │   (chips verdes = ligados)                     │
│  ├ Smartphones                 │ Valores sugeridos: Color [Negro, Blanco] ✎     │
│  └ Notebooks                   │ ── Plantilla de SKU ── (HU031)                 │
│                                │ [Cancelar]              [Guardar categoría]    │
└────────────────────────────────┴────────────────────────────────────────────────┘
```

El bloque "Atributos de Categoría" mantiene exactamente el contrato actual:

- Checkbox/tags → `atributos_permitidos TEXT[]`.
- Toggle "Definir propios / Usar herencia" (HU029).
- Valores sugeridos por atributo → `atributos_valores JSONB` (HU030).
- Al guardar se sincroniza `categorias_atributos` (`sincronizarAtributosCategoria`, ya implementado).

Con esto, la selección de ejes en la ficha de producto se alimenta de `GET /api/v1/categories/:id/atributos` (atributos efectivos + valores), cumpliendo el requisito 3: **"Zapatillas solo permite Color y Talla Calzado"**.

---

## 8. Caso "Talla olvidada" (Requisito 5) — flujo end-to-end

1. Operador abre `/admin/products/{modeloId}/edit`.
2. `GET /api/v1/product-models/:id` trae el modelo y `variantes[]` con `id`, `sku`, `atributos` → se pintan como `estado: 'existente'` con 🔒 en SKU/atributos.
3. Pulsa `+ Agregar variante` → fila inline: `Select` Color (Negro), `Select` Talla (42), stock 10, precio 89.99 → `Confirmar`.
4. `variantesReducer('agregar')` inyecta la fila con badge **Nueva variante**.
5. `Guardar` → `calcularDelta` produce `{ nuevas_variantes: [Negro 42 …], actualizar_variantes: [], eliminar_variantes: [] }`.
6. `POST /:id/variantes/delta` → TX: `INSERT productos` + `INSERT inventario` + `COMMIT`. El índice `uq_productos_modelo_combinacion` impide que se repita "Negro 42"; si el frontend fallara y lo enviara duplicado, el backend responde **400 `VARIANT_ALREADY_EXISTS`** sin corromper inventario.

---

## 9. Trazabilidad y criterios de aceptación (nueva HU)

Propuesta `HU035: Producto Padre con Variantes Simples Uno a Uno (Full-Screen)` — registrar en `.ai/04-sprints-backlog.md`.

| CA | Criterio | Verificación |
|---|---|---|
| CA01 | Existe `productos_modelo` (info común, sin stock ni venta directa) y `productos.modelo_id` (FK). | Migración 017 + FK |
| CA02 | Cada SKU tiene precio, stock, `codigo_barras` y SKU propios; SKU/atributos inmutables tras el alta. | HU031 CA05 se mantiene |
| CA03 | `UNIQUE(modelo_id, combinacion_atributos)`; duplicado → 400 controlado. | Test de integración `23505` |
| CA04 | Sin modales: `/admin/products/new` y `/admin/products/:id/edit` full-screen 70/30 dentro del layout. | Router + smoke E2E |
| CA05 | La categoría define los ejes: un SKU solo admite atributos ligados (`INVALID_ATTRIBUTE` si no). | HU029 CA04 |
| CA06 | La tabla vertical permite agregar/editar filas inline, sin matriz. | Test de `variantesReducer` |
| CA07 | Edición bloquea 🔒 SKU y atributos; precio/stock/estado editables. | Snapshot de UI |
| CA08 | El guardado envía solo el delta en 1 transacción ACID con `ROLLBACK` ante fallo. | Test de repositorio |
| CA09 | Los 4 estados (skeleton/vacío/error/éxito) y primitivos `components/ui/`. | Skill `impeccable` |
| CA10 | Sin `any`, Zod en servicios, y Quality Gate `VeroData Way` sin incidencias nuevas. | `scripts/sonar.ps1` |

---

## 10. Impacto en documentación e implementación

**Antes de codificar (obligatorio):**

1. Actualizar `.ai/02-database.md`: tabla `productos_modelo`, columnas nuevas (`productos.modelo_id`, `codigo_barras`, `combinacion_atributos`; `producto_imagenes.modelo_id`), índice `uq_productos_modelo_combinacion`, FK.
2. Registrar `HU035` + CAs en `.ai/04-sprints-backlog.md`.
3. Confirmar que el storefront (HU013/HU016) listará por Modelo; mientras tanto `productos.modelo` (texto) mantiene compatibilidad y se marca deprecada.

**Archivos a tocar:**

| Capa | Archivo |
|---|---|
| BD | `server/database/migrations/017_productos_modelo.sql` |
| Backend | `server/src/modules/products/modelos/{controllers,services,repositories,schemas,routes}` |
| Backend | `server/src/index.ts` (montar `/api/v1/product-models`) |
| Backend | `server/src/modules/categories/*` (endpoint `:id/atributos`) |
| Frontend | `client/src/pages/admin/producto-editor/{ProductoEditorPage,VariantesTable,VarianteInlineForm,variantesReducer,calcularDelta}.tsx` |
| Frontend | `client/src/types/productModel.types.ts`, `client/src/lib/productModelsApi.ts` |
| Frontend | `client/src/App.tsx`, `client/src/pages/admin/ProductsPage.tsx` (quitar modales) |
| Frontend | `client/src/pages/admin/CategoriesPage.tsx` (full-screen) |
| Eliminar | `client/src/components/products/MatrizVariantesModal.tsx` |

**Quality gate (`skills/code-quality-sonarqube.md` §1):**

```powershell
npm --prefix server run test:coverage
npm --prefix client run test:coverage
npm --prefix client run lint
$env:SONAR_TOKEN = "squ_xxx"; powershell -File scripts/sonar.ps1
```

Recordatorios específicos de este cambio: `crypto.randomUUID()` en el front (nunca `Math.random()`), `sort` siempre con comparador `localeCompare('es')`, `reduce` con valor inicial, promesas con `await`/`.catch`, sin `onClick` en `div` (usar `<button>`), y `app.disable('x-powered-by')` ya vigente.
