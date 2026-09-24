# 04. BACKLOG COMPLETO DE SPRINTS E HISTORIAS DE USUARIO (HU001 - HU022)

**Proyecto:** VeroData Retail

**Línea Base:** CMMI-DEV v1.3 REQM (Requirements Management) / PP (Project Planning)

**Alcance Temporal:** 4 Sprints de Construcción (40 días laborables)

**Trazabilidad:** Persistencia en PostgreSQL (`.ai/02-database.md`) y Reglas de Arquitectura (`.ai/01-overview.md`, `.ai/03-guidelines.md`)

## ÍNDICE DE HISTORIAS DE USUARIO POR SPRINT

| Sprint | Código | Nombre de la Historia de Usuario | Actor Principal | 
 | ----- | ----- | ----- | ----- | 
| **Sprint 1** | **HU001** | Autenticación Administrativa y Roles RBAC | SuperAdmin / Admin | 
|  | **HU002** | Registro de Personal Interno con Documento de Identidad | Super Administrador | 
|  | **HU003** | Consulta y Auditoría de Colaboradores | Super Administrador | 
|  | **HU004** | Búsqueda Unitaria de Personal Interno | Super Administrador | 
|  | **HU005** | Actualización de Información de Colaboradores | Super Administrador | 
|  | **HU006** | Gestión de Categorías de Productos | Administrador | 
|  | **HU007** | Creación de Artículos de Catálogo y Código SKU | Administrador | 
|  | **HU008** | Actualización de Ficha Técnica y Precios de Productos | Administrador | 
|  | **HU009** | Desactivación Lógica de Artículos de Catálogo | Administrador | 
| **Sprint 2** | **HU010** | Asignación y Ajuste de Inventario Físico por SKU | Administrador | 
|  | **HU011** | Deducción Atómica de Stock y Prevención de Sobreventa | Sistema (Transaccional) | 
|  | **HU012** | Alertas de Stock Mínimo y Umbrales Críticos | Administrador / Almacén | 
| **Sprint 3** | **HU013** | Navegación del Catálogo Público en Storefront | Cliente Invitado / Registrado | 
|  | **HU016** | Búsqueda Predictiva y Filtrado Multicriterio | Cliente Invitado / Registrado | 
|  | **HU020** | Carrito de Compras y Cálculo Transaccional | Cliente Invitado / Registrado | 
|  | **HU021** | Fusión Automática de Carrito Anónimo a Cuenta | Cliente Registrado | 
| **Sprint 4** | **HU014** | Checkout Dual (Flujo de Invitado sin Cuenta Obligatoria) | Cliente Invitado | 
|  | **HU015** | Inicio de Sesión de Cliente con Modal de 3 Intentos Fallidos | Cliente Registrado | 
|  | **HU017** | Libreta de Direcciones Desacoplada en 3FN | Cliente Registrado | 
|  | **HU018** | Generación de Pedido con Snapshot Histórico Inmutable | Sistema (Transaccional) | 
|  | **HU019** | Integración y Validación de Métodos de Pago | Cliente / Administrador | 
|  | **HU022** | Trazabilidad y Transición de Estados del Pedido | Administrador / Cliente | 

## SPRINT 1: ARQUITECTURA BASE, ACCESOS Y CATÁLOGO (DÍAS 1-10)

### HU001: Autenticación Administrativa y Roles RBAC

* **Actor:** Super Administrador / Administrador

* **Narrativa:** Como operador interno, quiero autenticarme en el panel de administración con mi correo institucional y contraseña, para acceder a las funciones operativas según los permisos de mi rol asignado.

* **Criterios de Aceptación:**

  * **CA01:** Validar credenciales contra la tabla `usuarios` verificando que el usuario esté activo (`activo = TRUE`).

  * **CA02:** Comparar la contraseña mediante hash irreversible BCrypt (costo 10). Si es incorrecta, retornar error `401 Unauthorized` genérico (*"Credenciales inválidas"*).

  * **CA03:** Emitir un token JWT firmado (HS256) que incluya en el payload: `id_usuario`, `email` y el `rol` (`SUPER_ADMIN` o `ADMIN`).

  * **CA04:** Proteger las rutas del Backoffice mediante middleware RBAC; si un `ADMIN` intenta acceder a endpoints exclusivos de `SUPER_ADMIN`, retornar `403 Forbidden`.

### HU002: Registro de Personal Interno con Documento de Identidad

* **Actor:** Super Administrador

* **Narrativa:** Como Super Administrador, quiero registrar colaboradores internos solicitando sus datos de identidad, contacto y asignándoles un rol operativo, para habilitar al equipo encargado de la tienda con una identificación laboral unívoca.

* **Criterios de Aceptación:**

  * **CA01:** Solicitar obligatoriamente: nombres, apellidos, tipo de documento (`DNI`, `PASAPORTE`, `CARNET_EXTRANJERIA`), número de documento, teléfono, correo electrónico, contraseña y selección de rol (`id_rol`).

  * **CA02:** Validar formato de email y asegurar unicidad en `usuarios.email`. Si ya existe, retornar `409 Conflict`.

  * **CA03:** Validar longitud del documento (ej. 8 dígitos para DNI) y unicidad combinada (`tipo_documento`, `numero_documento`) en `datos_personales`. Si se repite, retornar `409 Conflict`.

  * **CA04:** Cifrar la contraseña con BCrypt antes de persistir en `usuarios.password_hash`.

  * **CA05:** Persistir dentro de una transacción atómica que inserte primero en `usuarios` y luego en `datos_personales`. Si alguna falla, ejecutar rollback.

  * **CA06:** Registrar marcas de tiempo automáticas del servidor (`created_at`).

### HU003: Consulta y Auditoría de Colaboradores

* **Actor:** Super Administrador

* **Narrativa:** Como Super Administrador, quiero consultar la lista completa de colaboradores internos con opciones de filtrado por rol y estado, para auditar quiénes tienen acceso al panel de administración.

* **Criterios de Aceptación:**

  * **CA01:** Retornar listado combinando `usuarios`, `datos_personales` y `roles` mostrando: ID, nombres y apellidos completos, tipo y número de documento, email, rol asignado y estado (`activo`).

  * **CA02:** Permitir filtrar la lista por `id_rol` (ej. solo `ADMIN` o solo `SUPER_ADMIN`).

  * **CA03:** Permitir filtrar por estado de actividad (`activo = true/false`).

  * **CA04:** Nunca exponer el campo `password_hash` en el payload de respuesta.

### HU004: Búsqueda Unitaria de Personal Interno

* **Actor:** Super Administrador

* **Narrativa:** Como Super Administrador, quiero buscar un colaborador específico por su ID numérico o su documento de identidad, para consultar su ficha individual de forma rápida.

* **Criterios de Aceptación:**

  * **CA01:** Permitir la consulta por parámetro de ruta `/api/users/:id`.

  * **CA02:** Permitir la búsqueda por query param `/api/users/search?documento=...`.

  * **CA03:** Si el usuario no existe, retornar código HTTP `404 Not Found` con mensaje claro de recurso inexistente.

  * **CA04:** Retornar datos personales y rol con código HTTP `200 OK`.

### HU005: Actualización de Información de Colaboradores

* **Actor:** Super Administrador

* **Narrativa:** Como Super Administrador, quiero actualizar los datos personales y de contacto de un colaborador, para mantener al día los registros del personal administrativo.

* **Criterios de Aceptación:**

  * **CA01:** Permitir modificar nombres, apellidos, teléfono, correo institucional, tipo y número de documento.

  * **CA02:** Validar que el nuevo correo o número de documento no pertenezca a otra cuenta (`id != id_actual`). Si ya existe, retornar `409 Conflict`.

  * **CA03:** La actualización de datos personales no debe modificar ni borrar `password_hash` ni `id_rol`.

  * **CA04:** Actualizar automáticamente la columna `updated_at` y retornar el objeto actualizado con `200 OK`.

### HU006: Gestión de Categorías de Productos

* **Actor:** Administrador

* **Narrativa:** Como Administrador, quiero registrar y administrar las categorías del catálogo, para organizar la indumentaria, calzado y accesorios de forma jerárquica.

* **Criterios de Aceptación:**

  * **CA01:** Solicitar nombre de categoría, slug URL y descripción opcional.

  * **CA02:** Generar o validar slug único normalizado en minúsculas sin caracteres especiales.

  * **CA03:** Impedir nombres o slugs duplicados retornando `409 Conflict`.

  * **CA04:** Bloquear el borrado físico de una categoría si tiene productos asociados (`ON DELETE RESTRICT`), permitiendo solo cambio de estado a inactivo (`activo = FALSE`).

### HU007: Creación de Artículos de Catálogo y Código SKU

* **Actor:** Administrador

* **Narrativa:** Como Administrador, quiero registrar nuevos productos con su código SKU estandarizado, categoría y precio, para publicarlos en la tienda.

* **Criterios de Aceptación:**

  * **CA01:** Solicitar obligatoriamente: `id_categoria`, `sku`, `nombre`, `precio` regular mayor a cero y descripción.

  * **CA02:** Permitir registrar opcionalmente un `precio_oferta` (debe ser menor que el `precio` regular).

  * **CA03:** Validar que el `sku` sea único a nivel del sistema; si ya existe, rechazar con `409 Conflict`.

  * **CA04:** Crear automáticamente una fila vinculada en la tabla `inventario` con `stock_actual = 0` y `stock_minimo = 5`.

### HU008: Actualización de Ficha Técnica y Precios de Productos

* **Actor:** Administrador

* **Narrativa:** Como Administrador, quiero actualizar los datos comerciales, precios o descripciones de un producto, para mantener el catálogo alineado a la oferta del negocio.

* **Criterios de Aceptación:**

  * **CA01:** Permitir modificar nombre, descripción, precio regular, precio de oferta y categoría asociada.

  * **CA02:** Validar que los precios sean valores positivos (`>= 0.00`).

  * **CA03:** Actualizar el campo `updated_at` con marca de tiempo del servidor.

  * **CA04:** La modificación de precios en la tabla `productos` no debe afectar bajo ninguna circunstancia los precios de compras ya registradas en órdenes históricas.

### HU009: Desactivación Lógica de Artículos de Catálogo

* **Actor:** Administrador

* **Narrativa:** Como Administrador, quiero dar de baja un producto sin eliminarlo de la base de datos, para ocultarlo del Storefront sin romper la integridad referencial de pedidos pasados.

* **Criterios de Aceptación:**

  * **CA01:** Aplicar borrado lógico estableciendo `activo = FALSE` en la tabla `productos`.

  * **CA02:** Excluir automáticamente el producto de las consultas públicas del Storefront y del buscador.

  * **CA03:** Mantener la fila en la base de datos para que los reportes de ventas y tablas `detalles_pedido` sigan resolviendo la clave foránea sin errores.

## SPRINT 2: STOCK CONCURRENTE, UMBRALES Y ALERTAS (DÍAS 11-20)

### HU010: Asignación y Ajuste de Inventario Físico por SKU

* **Actor:** Administrador / Responsable de Almacén

* **Narrativa:** Como Administrador, quiero registrar ingresos y ajustes de existencias físicas para cada producto, para reflejar en el sistema el stock real disponible en el almacén.

* **Criterios de Aceptación:**

  * **CA01:** Permitir registrar aumentos de existencias por compras a proveedores y disminuciones justificadas por mermas o inventario físico.

  * **CA02:** Validar que el `stock_actual` resultante nunca sea negativo (`CHECK (stock_actual >= 0)`).

  * **CA03:** Permitir configurar un `stock_minimo` personalizado por SKU.

  * **CA04:** Actualizar `updated_at` en la tabla `inventario` tras cada ajuste confirmado.

### HU011: Deducción Atómica de Stock y Prevención de Sobreventa

* **Actor:** Sistema (Transaccional)

* **Narrativa:** Como sistema transaccional, quiero deducir el stock de forma atómica durante la confirmación de una orden, para impedir condiciones de carrera y sobreventas simultáneas.

* **Criterios de Aceptación:**

  * **CA01:** Prohibido usar flujo desacoplado `SELECT stock` seguido de `UPDATE stock`.

  * **CA02:** Ejecutar la deducción mediante consulta SQL atómica con cláusula condicional estricta:
    `UPDATE inventario SET stock_actual = stock_actual - $1 WHERE id_producto = $2 AND stock_actual >= $1 RETURNING stock_actual;`

  * **CA03:** Si la sentencia no retorna filas afectadas (stock insuficiente para uno o más artículos), cancelar de inmediato la transacción (`ROLLBACK`) y retornar código `409 Conflict`.

  * **CA04:** La meta operativa es mantener la tasa de pedidos cancelados por sobreventa en `< 1%`.

### HU012: Alertas de Stock Mínimo y Umbrales Críticos

* **Actor:** Administrador / Responsable de Compras

* **Narrativa:** Como Administrador, quiero recibir alertas visuales automáticas cuando un artículo alcance o baje de su umbral mínimo, para gestionar la reposición antes de llegar a un quiebre de stock.

* **Criterios de Aceptación:**

  * **CA01:** Activar automáticamente la bandera `stock_alerta = TRUE` en la tabla `inventario` si `stock_actual <= stock_minimo` tras cualquier deducción.

  * **CA02:** Si el stock es repuesto superando el umbral mínimo, actualizar automáticamente `stock_alerta = FALSE`.

  * **CA03:** Proveer un endpoint en el Backoffice (`/api/inventory/alerts`) que liste todos los productos con bandera de alerta activa para compras urgentes.

## SPRINT 3: STOREFRONT PÚBLICO, BÚSQUEDA Y CARRITO (DÍAS 21-30)

### HU013: Navegación del Catálogo Público en Storefront

* **Actor:** Cliente Invitado / Cliente Registrado

* **Narrativa:** Como visitante de la tienda, quiero navegar por el catálogo visualizando fotos, nombres, precios y disponibilidad en tiempo real, para explorar los productos de mi interés.

* **Criterios de Aceptación:**

  * **CA01:** Listar únicamente productos donde `activo = TRUE` y `categorias.activo = TRUE`.

  * **CA02:** Mostrar precio regular y, si existe `precio_oferta`, destacar el descuento aplicado con porcentaje de ahorro.

  * **CA03:** Indicar visualmente si el producto cuenta con existencias disponibles o si figura como *"Agotado"*.

  * **CA04:** Interfaz completamente responsiva optimizada para dispositivos móviles y escritorio.

### HU016: Búsqueda Predictiva y Filtrado Multicriterio

* **Actor:** Cliente Invitado / Cliente Registrado

* **Narrativa:** Como visitante, quiero buscar productos por palabras clave y filtrarlos por categoría o rango de precios, para encontrar rápidamente lo que deseo comprar.

* **Criterios de Aceptación:**

  * **CA01:** Búsqueda predictiva por texto coincidente en nombre, descripción o SKU.

  * **CA02:** Latencia de respuesta de la API menor a **800 ms**, respaldada por índices B-Tree en PostgreSQL (`idx_productos_sku`, `idx_productos_categoria`).

  * **CA03:** Permitir combinar filtros: por categoría específica, precio mínimo y precio máximo simultáneamente.

  * **CA04:** Retornar paginación limpia (página actual, total de páginas, total de resultados).

### HU020: Carrito de Compras y Cálculo Transaccional

* **Actor:** Cliente Invitado / Cliente Registrado

* **Narrativa:** Como comprador, quiero agregar productos a mi carrito, modificar cantidades y ver el subtotal calculado al instante, para preparar mi orden antes de pagar.

* **Criterios de Aceptación:**

  * **CA01:** Permitir agregar productos con validación de cantidad positiva (`> 0`).

  * **CA02:** Impedir que el usuario seleccione una cantidad mayor al `stock_actual` disponible.

  * **CA03:** Calcular dinámicamente: subtotal por ítem, subtotal general del carrito, costo de envío y total en moneda nacional (`PEN`).

  * **CA04:** Almacenar el carrito en `localStorage` / sesión segura para usuarios en modalidad invitado.

### HU021: Fusión Automática de Carrito Anónimo a Cuenta

* **Actor:** Cliente Registrado

* **Narrativa:** Como cliente que armó su carrito como invitado y luego inició sesión, quiero que mis productos se conserven en mi cuenta, para no tener que seleccionarlos nuevamente.

* **Criterios de Aceptación:**

  * **CA01:** Al autenticarse exitosamente en el Storefront, verificar si existen productos en el carrito temporal del navegador.

  * **CA02:** Fusionar los artículos del carrito temporal con el carrito persistente guardado en la cuenta del usuario.

  * **CA03:** Si un mismo producto ya existía en la cuenta, sumar las cantidades validando que la suma no exceda el stock físico actual.

  * **CA04:** Limpiar el carrito temporal del navegador tras completar la sincronización.

## SPRINT 4: CHECKOUT DUAL, SEGURIDAD Y SNAPSHOT (DÍAS 31-40)

### HU014: Checkout Dual (Flujo de Invitado sin Cuenta Obligatoria)

* **Actor:** Cliente Invitado (Guest Checkout)

* **Narrativa:** Como comprador sin cuenta, quiero completar mi compra ingresando únicamente mis datos personales y de envío sin crear una contraseña, para finalizar rápido y sin fricción.

* **Criterios de Aceptación:**

  * **CA01:** Permitir el flujo de compra directo sin requerir contraseña ni registro previo.

  * **CA02:** Solicitar obligatoriamente: nombres, apellidos, tipo de documento (`DNI`, `PASAPORTE`, `CARNET_EXTRANJERIA`), número de documento, correo electrónico, teléfono y dirección completa de entrega.

  * **CA03:** Guardar la orden en la tabla `pedidos` con la columna `id_usuario = NULL`.

  * **CA04:** Validar el formato de correo electrónico para remitir la confirmación y número de seguimiento de la compra.

### HU015: Inicio de Sesión de Cliente con Modal de 3 Intentos Fallidos

* **Actor:** Cliente Registrado

* **Narrativa:** Como cliente registrado, quiero iniciar sesión con mi correo y contraseña, disponiendo de mecanismos preventivos ante bloqueos por intentos fallidos.

* **Criterios de Aceptación:**

  * **CA01:** Validar credenciales con BCrypt contra `usuarios.password_hash`.

  * **CA02:** Al autenticarse con éxito, emitir token JWT seguro, resetear `intentos_fallidos = 0` y actualizar el navbar con el nombre del usuario.

  * **CA03:** Si las credenciales fallan, incrementar el contador `intentos_fallidos` en la base de datos y responder mensaje genérico (*"Credenciales incorrectas"*).

  * **CA04:** Al acumular **3 intentos fallidos consecutivos**, el backend debe responder con el flag de bloqueo preventivo; la interfaz debe disparar obligatoriamente un **modal de alerta de seguridad**.

  * **CA05:** El modal debe ofrecer: enlace para restablecer contraseña (*"¿Olvidaste tu contraseña?"*) o imponer un bloqueo temporal de 5 minutos antes de habilitar nuevos intentos.

### HU017: Libreta de Direcciones Desacoplada en 3FN

* **Actor:** Cliente Registrado

* **Narrativa:** Como cliente frecuente, quiero registrar y administrar múltiples direcciones de envío, para seleccionarlas con un solo clic en mis compras futuras.

* **Criterios de Aceptación:**

  * **CA01:** Guardar direcciones en la tabla `direcciones` (desacoplada de `usuarios` según 3FN).

  * **CA02:** Solicitar campos estructurados: departamento, provincia, distrito, dirección de línea, referencia y código postal opcional.

  * **CA03:** Permitir marcar una dirección como principal (`es_principal = TRUE`). Si se marca una nueva principal, desmarcar las anteriores del usuario.

  * **CA04:** La edición o borrado de una dirección en esta libreta nunca debe modificar las direcciones de despacho de pedidos antiguos ya confirmados.

### HU018: Generación de Pedido con Snapshot Histórico Inmutable

* **Actor:** Sistema (Transaccional)

* **Narrativa:** Como sistema transaccional, quiero congelar una copia estática de los datos del comprador, su dirección y los precios en la orden, para garantizar inmutabilidad fiscal y legal ante cambios futuros.

* **Criterios de Aceptación:**

  * **CA01:** Generar un código único de orden (ej. `ORD-2026-XXXXX`).

  * **CA02:** Copiar en columnas fijas de `pedidos`: `cliente_tipo_documento`, `cliente_numero_documento`, `cliente_nombres`, `cliente_apellidos`, `cliente_email`, `cliente_telefono`, `direccion_departamento`, `direccion_provincia`, `direccion_distrito` y `direccion_completa`.

  * **CA03:** Registrar cada artículo en `detalles_pedido` congelando el campo `precio_unitario_historico` con el precio vigente al segundo exacto de la compra.

  * **CA04:** Bajo ninguna circunstancia consultar tablas maestras (`productos`, `direcciones`, `datos_personales`) para reconstruir el monto o destinatario de un pedido histórico.

  * **CA05:** Toda la operación se realiza dentro de una transacción ACID que incluye la deducción atómica de inventario (HU011).

### HU019: Integración y Validación de Métodos de Pago

* **Actor:** Cliente / Administrador

* **Narrativa:** Como cliente, quiero seleccionar entre diversos métodos de pago locales, para abonar mi pedido mediante el canal financiero de mi preferencia.

* **Criterios de Aceptación:**

  * **CA01:** Soportar los tipos definidos en `metodo_pago_enum`: `TARJETA`, `YAPE_PLIN`, `TRANSFERENCIA` y `EFECTIVO_CONTRAENTREGA`.

  * **CA02:** Si el método es `TARJETA` o pasarela electrónica aprobada de forma inmediata, registrar el pedido con estado inicial `PAGADO`.

  * **CA03:** Si el método es `TRANSFERENCIA`, `YAPE_PLIN` o `EFECTIVO_CONTRAENTREGA`, registrar el pedido con estado inicial `PENDIENTE` a la espera de validación.

  * **CA04:** Almacenar el comprobante o referencia de pago en los registros de auditoría.

### HU022: Trazabilidad y Transición de Estados del Pedido

* **Actor:** Administrador / Cliente

* **Narrativa:** Como cliente y administrador, quiero visualizar y gestionar la evolución del pedido a lo largo de su ciclo de vida, para asegurar una entrega puntual y transparente.

* **Criterios de Aceptación:**

  * **CA01:** Soportar la secuencia de estados de `estado_pedido_enum`:
    `PENDIENTE` $\rightarrow$ `PAGADO` $\rightarrow$ `EN_PREPARACION` $\rightarrow$ `ENVIADO` $\rightarrow$ `ENTREGADO` (o `CANCELADO`).

  * **CA02:** Permitir al Administrador cambiar el estado desde el panel Backoffice con validación de transiciones permitidas (no se puede pasar de `PENDIENTE` directo a `ENTREGADO`).

  * **CA03:** Si un pedido se cancela (`CANCELADO`), ejecutar una transacción que restituya automáticamente el stock al inventario (`stock_actual = stock_actual + cantidad`).

  * **CA04:** Permitir al cliente consultar el estado de su pedido mediante su código único y documento de identidad en el Storefront.