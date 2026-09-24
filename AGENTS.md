# DIRECTRICES DE DESARROLLO PARA AGENTES DE IA (AGENTS.md)
**Proyecto:** VeroData Retail – Sistema de Gestión Minorista y Comercio Omnicanal  
**Marco Metodológico:** CMMI-DEV v1.3 Nivel 2 (Project Planning & Requirements Management)  
**Arquitectura:** Monolito Modular en Capas Limpias (`server/` y `client/`)  
**Persistencia:** PostgreSQL / Supabase  

---

## 1. INSTRUCCIÓN OBLIGATORIA DE LECTURA PREVIA
Antes de emitir, sugerir, refactorizar o modificar cualquier archivo de código dentro del proyecto, el agente de IA **DEBE** leer y contrastar la solicitud con las dos fuentes maestras de verdad:

### A. Documentación de Arquitectura y Negocio (`.ai/`)
1. `.ai/01-overview.md`: Visión del sistema, módulos del monolito y reglas de negocio globales.
2. `.ai/02-database.md`: Esquema físico DDL de PostgreSQL, tipos ENUM, claves foráneas, índices y reglas de snapshot.
3. `.ai/03-guidelines.md`: Convenciones de código TypeScript, manejo de errores HTTP, capas arquitectónicas y seguridad.
4. `.ai/04-sprints-backlog.md`: Historias de Usuario (HU) y Criterios de Aceptación (CA) vigentes.

### B. Sistema de Diseño y UI/UX (`skills/`)
Antes de crear o modificar componentes de frontend en `client/`, consulta obligatoriamente la skill correspondiente:
1. `skills/ui-backoffice-supabase.md`: **Backoffice Administrativo** (`/admin`). Paleta monocromática sobre blanco/canvas-night (`#1c1c1c`), acento esmeralda único (`#3ecf8e` con texto dark `#171717`), radios técnicos de 6px (`rounded-sm`), tablas densas y fuentes monospace para códigos/SKUs.
2. `skills/ui-storefront-retail.md`: **Tienda Pública / E-commerce**. Alta densidad comercial inspirada en Falabella y Amazon (Header de 3 niveles con buscador central masivo y selector de distrito/geolocalización, cards de producto 1:1, doble precio oferta/regular tachado, banners de financiamiento en cuotas).
3. `skills/frontend-design.md`: **Arquitectura de Frontend** (Anthropic Standard). Jerarquía tipográfica audaz, patrones de composición limpios con React, TypeScript estricto y desacoplamiento con Shadcn UI.
4. `skills/impeccable.md`: **Criterio de Acabado y Polish UX**. Filtro de calidad transversal obligatorio: prohíbe degradados y tarjetas anidadas sin sentido, exige microinteracciones fluidas, skeleton loaders idénticos a los datos que cargan y estados vacíos (*empty states*) con llamada a la acción.

---

## 2. REGLAS INNEGOCIABLES DE GENERACIÓN DE CÓDIGO

### A. Integridad de Base de Datos y Persistencia
* **No inventar tablas, columnas ni tipos:** Todo acceso o manipulación de datos debe coincidir exactamente con el esquema documentado en `.ai/02-database.md`.
* **Respeto a la Tercera Forma Normal (3FN):** Mantener desacopladas las tablas `usuarios`, `datos_personales`, `direcciones` y `productos`.
* **Inmutabilidad de Pedidos (Snapshot Histórico):** Bajo ninguna circunstancia se debe referenciar el precio actual de `productos` o la dirección dinámica de `direcciones` para calcular o mostrar órdenes históricas. La tabla `pedidos` y `pedido_items` (o `detalles_pedido`) guardan una copia fija y estática de los datos del comprador y precios pactados al momento de la compra.
* **Soporte para Checkout Invitado:** La columna `usuario_id` en la tabla `pedidos` **debe ser anulable (`NULLABLE`)** para permitir compras directas sin cuenta obligatoria.

### B. Identificación y Seguridad de Usuarios
* **Documento de Identidad Obligatorio:** En todo registro o actualización de usuarios internos (`SUPER_ADMIN`, `ADMIN`) o clientes, es obligatorio capturar y validar el `tipo_documento` (`DNI`, `PASAPORTE`, `CARNET_EXTRANJERIA`) y el `numero_documento`.
* **Cifrado Criptográfico:** Nunca almacenar contraseñas en texto plano. Usar siempre `bcrypt` con un factor de costo mínimo de 10.
* **Manejo de Intentos Fallidos:** En el login, controlar el contador de intentos fallidos. Si el usuario acumula 3 intentos erróneos consecutivos, responder con el flag de bloqueo preventivo para disparar el modal de seguridad.

### C. Concurrencia de Inventario
* La deducción de stock en compras debe ser **atómica**. Usar transacciones de base de datos con aislamiento adecuado y cláusulas que impidan sobreventa (ej. `UPDATE inventario SET stock_actual = stock_actual - $1 WHERE producto_id = $2 AND stock_actual >= $1`).

### D. Estructura de Capas en el Backend (`server/`)
* **Rutas / Routers:** Únicamente definen endpoints, verbos HTTP y aplican middlewares (autenticación, validación, autorización RBAC).
* **Controladores:** Extraen los datos de la petición (`req.body`, `req.params`, `req.query`), ejecutan validación de esquemas (Zod) y delegan la orquestación a los servicios. No contienen consultas SQL directas.
* **Servicios (Lógica de Negocio):** Implementan las reglas del negocio, validaciones de unicidad, cálculos de impuestos y transacciones.
* **Repositorios / Acceso a Datos:** Encapsulan las consultas a PostgreSQL / cliente de Supabase.

### E. Estructura y Estándares en el Frontend (`client/`)
* **Doble Identidad Estricta:** Prohibido mezclar estilos; el Backoffice nunca debe verse colorido o como tienda, y la Tienda nunca debe verse minimalista o técnica como panel de base de datos.
* **Manejo de Formularios y Validación:** Emplear `react-hook-form` con resolución de esquemas vía `Zod`, mostrando errores inline accesibles (`aria-live="polite"`).
* **Auditoría de Acabado (Impeccable):** Toda vista debe manejar los 4 estados de pantalla: cargando (*skeleton*), vacío (*empty state*), error con reintento, y éxito con datos.

---

## 3. COMPORTAMIENTO ESPERADO ANTE SOLICITUDES DEL USUARIO
1. **Comprobar la HU correspondiente:** Identificar qué Historia de Usuario de `.ai/04-sprints-backlog.md` se está atendiendo (HU001 a HU022).
2. **Validar Criterios de Aceptación:** Asegurarse de que el código resuelva todos los CA (desde CA01 hasta el último aplicable).
3. **Manejo Estricto de Tipos:** Prohibido usar `any` en TypeScript; tipar siempre peticiones, respuestas, componentes y entidades de dominio.