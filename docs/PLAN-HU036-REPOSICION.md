# Plan HU036 — Abastecimiento y Reposición de Stock

**Proyecto:** VeroData Retail · **Módulo:** Backoffice «Reposiciones» · **BD:** PostgreSQL / Supabase

## 1. Objetivo

Registrar las compras a proveedores y dar entrada a la mercadería al stock web de forma
semiautomatizada, evitando el ajuste manual de existencias.

## 2. Decisiones de arquitectura

| Enunciado inicial | Decisión en este repo | Motivo |
|---|---|---|
| `Producto` con stock | El stock vive en `inventario` (1:1 con `productos`, que es el **SKU**) | Esquema existente |
| `id` autoincremental | `UUID DEFAULT gen_random_uuid()` | Convención del repo |
| FLOAT para dinero | `NUMERIC(12,2)` | Nunca float para dinero |
| `/api/reposiciones` | `/api/v1/reposiciones` | Versionado obligatorio (03-guidelines §3.1) |
| `PUT .../recibir` | `PATCH .../recibir` | Es una transición de estado |
| Tabla `Proveedor` | No existía → se crea `proveedores` y un módulo de alta | El formulario necesita el dropdown |

## 3. Modelo de datos (migración `019_reposiciones_stock.sql`)

- `proveedores` — razón social única, contacto, teléfono, email, categoría.
- `estado_reposicion_enum` — `PENDIENTE | RECIBIDO | CANCELADO`.
- `ordenes_reposicion` — cabecera con `costo_total`, `unidades_totales`, `usuario_id`,
  `motivo_cancelacion` y `recibido_en`.
- `detalle_reposicion` — `subtotal` como columna **generada**; `UNIQUE (orden_id, producto_id)`.
- `movimientos_inventario` + `tipo_movimiento_enum` — kardex (base de HU023).

## 4. API (`/api/v1`, rol `SUPER_ADMIN`/`ADMIN`)

| Método | Ruta | Comportamiento |
|---|---|---|
| `GET` | `/proveedores` | Listado activo (dropdown), búsqueda opcional |
| `POST` | `/proveedores` | Alta; duplicado → `409 PROVEEDOR_ALREADY_EXISTS` |
| `POST` | `/reposiciones` | Calcula acumulados, estado `PENDIENTE`, **no** toca el stock |
| `GET` | `/reposiciones` | Historial paginado (`page`/`limit`), filtros `estado` y `proveedor_id`, JOIN al proveedor |
| `GET` | `/reposiciones/:id` | Cabecera + líneas con SKU, nombre y atributos |
| `PATCH` | `/reposiciones/:id/recibir` | Recepción atómica (ver §5) |
| `PATCH` | `/reposiciones/:id/cancelar` | Solo si `PENDIENTE`; no toca el stock |

Códigos: `PROVEEDOR_NOT_FOUND`, `PRODUCTO_NOT_FOUND`, `ORDEN_NOT_FOUND` (404);
`ORDEN_NO_PENDIENTE`, `PRODUCTO_SIN_INVENTARIO` (409).

## 5. Recepción atómica

```sql
BEGIN;
  SELECT estado FROM ordenes_reposicion WHERE id = $1 FOR UPDATE;  -- serializa el doble clic
  -- estado <> 'PENDIENTE'  -> 409 ORDEN_NO_PENDIENTE (ROLLBACK)
  -- por cada línea:
  UPDATE inventario SET stock_actual = stock_actual + $2 WHERE producto_id = $1 RETURNING stock_actual;
  INSERT INTO movimientos_inventario (... 'ENTRADA_REPOSICION' ...);
  UPDATE ordenes_reposicion SET estado = 'RECIBIDO', recibido_en = NOW() WHERE id = $1;
COMMIT;  -- cualquier fallo -> ROLLBACK total
```

## 6. Frontend

| Ruta | Pantalla |
|---|---|
| `/admin/reposiciones` | Historial: tabla con badge ámbar/esmeralda/rojo, filtro y paginación |
| `/admin/reposiciones/nueva` | Formulario: proveedor, fecha, notas, líneas dinámicas con **totales en vivo** |
| `/admin/reposiciones/:id` | Detalle: lectura + botón verde «Confirmar Recepción de Mercadería» y cancelación |

Los 4 estados obligatorios (skeleton / vacío con CTA / error con reintento / éxito) y los
primitivos de `components/ui/`.

## 7. Fuera de alcance (deuda declarada)

Impuestos/IGV en el costo, recepción parcial, devoluciones y adjuntar la factura del
proveedor. Los tipos `SALIDA_VENTA` y `AJUSTE` del kardex quedan para HU023.
