# QA & Arquitectura — Maestro de Atributos (VeroData Retail)

> Documento de diseño y validación del módulo **Atributos / Propiedades**.
> Actúa como línea base para el backlog (CMMI-DEV) y como guía de implementación.

## 0. Contexto actual vs. objetivo

| Pieza | Hoy | Objetivo |
|---|---|---|
| Maestro de Color | tabla `colores` | Generalizar a `atributos` + `atributo_valores` |
| Atributos por categoría | `categorias.atributos_permitidos TEXT[]` | tabla `categorias_atributos` (FK al maestro) |
| Valor de la variante | `productos.atributos` (JSONB, texto libre) | referencias a `atributo_valores` (+ cache JSONB) |
| Sección en el sidebar | solo "Colores" | sección **"Atributos"** |

Regla de oro: **fuente de verdad de atributos = maestro (`atributos`/`atributo_valores`)**;
`productos.atributos` (JSONB) es solo cache para agrupación y generación de SKU.

## 1. Modelo propuesto

```
atributos(id, codigo UNIQUE, nombre, tipo, es_variante, unidad, activo, orden)
atributo_valores(id, atributo_id FK, valor, slug, hex, meta JSONB, activo, orden)
    UNIQUE (atributo_id, slug)
categorias_atributos(categoria_id FK, atributo_id FK, obligatorio, orden)
    PK (categoria_id, atributo_id)
```

Tipos de valor (`atributos.tipo`): `TEXTO | COLOR | NUMERO | BOOLEANO`.
- `COLOR` → exige `hex` `#RRGGBB`.
- `NUMERO` → `unidad` opcional (cm, ml, GB).
- `BOOLEANO` → Sí/No.

## 2. Criterios de aceptación

**1) Independencia del maestro**
- CA1.1 Sección **"Atributos"** en el sidebar, separada de Productos.
- CA1.2 CRUD de atributo padre y de N valores hijos.
- CA1.3 Tipos: texto, HEX (color), numérico (con unidad), booleano.
- CA1.4 `es_variante` distingue atributos de variante de los informativos.

**2) Vinculación con categorías**
- CA2.1 Al editar una categoría se asocian atributos del maestro.
- CA2.2 El formulario de producto solo ofrece los atributos de su categoría (con herencia).
- CA2.3 Backend rechaza atributos no permitidos → `400 INVALID_ATTRIBUTE`.

**3) Borrado / edición referencial**
- CA3.1 Borrar valor en uso → `409 VALUE_IN_USE`.
- CA3.2 Borrar atributo en uso → `409 ATTRIBUTE_IN_USE`.
- CA3.3 Renombrar valor → se refleja en la tienda y backoffice sin tocar la ficha del producto.
- CA3.4 SKU inmutable: renombrar no reescribe SKUs existentes.

**4) Creación en caliente**
- CA4.1 Modal rápido para crear valor/atributo sin salir del formulario de producto.
- CA4.2 El valor queda en el maestro global.
- CA4.3 Si ya existe, se selecciona el existente (sin duplicar).

## 3. Escenarios de prueba

### Bloque 1 — Maestro
| ID | Input | Resultado esperado |
|---|---|---|
| AT-01 | Crear atributo `Color` tipo COLOR | 1 fila en `atributos`, aparece en sidebar |
| AT-02 | Valores Rojo/Azul/Negro | 3 filas en `atributo_valores`, slug único por atributo |
| AT-03 | HEX inválido `rojo` | `VALIDATION_ERROR` (exige `#RRGGBB`) |
| AT-04 | `Almacenamiento` NUMERO unidad GB | Valores numéricos con unidad |
| AT-05 | Duplicar valor `Azul` | `409 VALUE_ALREADY_EXISTS` |

### Bloque 2 — Vinculación con categorías
| ID | Input | Resultado esperado |
|---|---|---|
| AT-06 | Asociar Color y Talla a `Zapatillas` | filas en `categorias_atributos` |
| AT-07 | Producto en `Celulares` | solo ofrece Color/Almacenamiento |
| AT-08 | API envía `SIZE` a `Celulares` | `400 INVALID_ATTRIBUTE` |
| AT-09 | Subcategoría sin atributos | hereda del ancestro más cercano |

### Bloque 3 — Borrado / edición
| ID | Input | Resultado esperado |
|---|---|---|
| AT-10 | Borrar `Azul` usado por 3 SKUs | `409 VALUE_IN_USE` |
| AT-11 | Borrar `Azul` sin uso | se elimina o desactiva |
| AT-12 | Borrar atributo en uso | `409 ATTRIBUTE_IN_USE` |
| AT-13 | Renombrar `Azul`→`Azul Marino` | se refleja en tienda y backoffice |
| AT-14 | Revisar SKU viejo | SKU sigue igual (inmutable) |
| AT-15 | Desactivar `Azul` | desaparece de selectores; productos actuales válidos |

### Bloque 4 — Creación en caliente
| ID | Input | Resultado esperado |
|---|---|---|
| AT-16 | "+ Nuevo valor" desde el producto | se crea y queda seleccionado, sin salir |
| AT-17 | Ir al maestro | el valor aparece |
| AT-18 | Crear valor existente | selecciona el existente, no duplica |
| AT-19 | Permisos | ADMIN/SUPER_ADMIN gestionan el maestro |

## 4. Database Constraints

- `atributos.codigo` UNIQUE, `UPPER_SNAKE`; `tipo` CHECK ∈ (TEXTO,COLOR,NUMERO,BOOLEANO).
- `atributo_valores` UNIQUE (`atributo_id`,`slug`); CHECK hex cuando `tipo='COLOR'`.
- `categorias_atributos` PK (`categoria_id`,`atributo_id`); FK atributo **RESTRICT**.
- `atributo_valores.atributo_id` FK **RESTRICT** (no borrar atributo con valores).
- Productos: `UNIQUE (modelo, atributos)` como anti-duplicado de variante.
- `pedido_items` con snapshot → renombrar no altera ventas pasadas.
- SKU inmutable (HU031).

## 5. Riesgos
1. Doble fuente (texto libre + referencias) → fuente única = maestro.
2. Migración de productos importados (texto `"Negro"`, `"White"`) → mapear a valores.
3. Absorber la tabla `colores` dentro de `atributo_valores` (tipo COLOR).
4. On-the-fly de **valores** libre; de **atributos**, solo con permiso.
