# VeroData Retail

Sistema de gestión minorista y comercio omnicanal. Monolito modular en capas
(`server/` + `client/`) con persistencia en PostgreSQL (Supabase).

---

## Stack

| Capa | Tecnología |
|---|---|
| Backend | Node.js · TypeScript · Express · PostgreSQL (Supabase) · JWT · BCrypt · Zod |
| Frontend | React · Vite · TypeScript · Tailwind CSS · react-hook-form |
| Pruebas | Vitest |
| Lint | ESLint (client) |

---

## Estructura del repositorio

```text
.
├── client/                 # Frontend (React + Vite)
│   ├── public/brand/       # Logos e imágenes de marca
│   └── src/
│       ├── components/ui/  # Primitivos: Button, Input, Textarea, Select, Modal
│       ├── context/        # AuthContext (JWT)
│       ├── layouts/        # BackofficeLayout
│       ├── pages/          # auth/ (login) y admin/ (backoffice)
│       ├── router/         # ProtectedRoute, RoleRoute (RBAC)
│       └── lib/            # apiClient, utils, slugify
└── server/                 # Backend (Express en capas)
    ├── database/           # setup.sql + migrations/
    └── src/
        ├── config/         # conexión a la base de datos
        ├── middlewares/    # autenticación JWT y autorización por rol
        ├── modules/        # auth, users, categories
        └── shared/         # tipos y utilidades
```

---

## Requisitos

- Node.js 18 o superior.
- Una base de datos PostgreSQL (o un proyecto Supabase).
- npm.

---

## Puesta en marcha

### 1. Instalar dependencias

```bash
# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

### 2. Variables de entorno

Copia las plantillas y completa los valores:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

**`server/.env`**

| Variable | Descripción |
|---|---|
| `NODE_ENV` | Entorno (`development` / `production`) |
| `PORT` | Puerto del servidor (por defecto `3000`) |
| `DB_HOST` / `DB_PORT` | Host y puerto de PostgreSQL |
| `DB_NAME` / `DB_USER` / `DB_PASSWORD` | Credenciales de la base |
| `DB_SSL` | `true` si la base exige SSL (Supabase) |
| `JWT_SECRET` | Secreto para firmar tokens (largo y aleatorio) |
| `JWT_EXPIRES_IN` | Vigencia del token (ej. `8h`) |
| `JWT_REMEMBER_EXPIRES_IN` | Vigencia del token con "Recordarme" (ej. `30d`) |
| `BCRYPT_ROUNDS` | Costo del hash (mínimo `10`) |
| `CLIENT_URL` | Origen permitido por CORS |
| `ML_CLIENT_ID` / `ML_CLIENT_SECRET` | App de Mercado Libre (para importar catálogo) |
| `ML_ACCESS_TOKEN` | Token de ML; lo genera/actualiza `npm run ml:token` |
| `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` | Storage de Supabase para las imágenes importadas |

**`client/.env`**

| Variable | Descripción |
|---|---|
| `VITE_API_URL` | URL base del backend (ej. `http://localhost:3000`) |

### 3. Base de datos

Ejecuta el DDL y el seed en el editor SQL de Supabase (o con `psql`):

```bash
# Creación de tablas, tipos e índices + roles y Super Admin inicial
server/database/setup.sql

# Migraciones incrementales (en orden)
server/database/migrations/*.sql

# Catálogo de ejemplo — categorías, productos e inventario (opcional)
server/database/seeds/catalogo.sql
```

Super Admin inicial del seed:

```text
Email:      admin@verodata.com
Contraseña: Admin1234!
```

### 4. Ejecutar en desarrollo

```bash
# Terminal 1 — backend (http://localhost:3000)
cd server && npm run dev

# Terminal 2 — frontend (http://localhost:5173)
cd client && npm run dev
```

---

## Scripts

**Backend (`server/`)**

| Script | Acción |
|---|---|
| `npm run dev` | Servidor con recarga en caliente (`tsx watch`) |
| `npm run build` | Compila TypeScript a `dist/` |
| `npm start` | Ejecuta el build de producción |
| `npm test` | Ejecuta la suite de pruebas (Vitest) |
| `npm run ml:token` | Obtiene/renueva el `ML_ACCESS_TOKEN` de Mercado Libre |
| `npm run ml:import` | Importa catálogo de ML (categorías, productos, imágenes a Supabase). Con `RESET=1` limpia el catálogo antes |

**Frontend (`client/`)**

| Script | Acción |
|---|---|
| `npm run dev` | Servidor de desarrollo (Vite) |
| `npm run build` | Type-check + build de producción |
| `npm run preview` | Previsualiza el build |
| `npm run lint` | ESLint |

---

## API (v1)

Todas las respuestas usan el envelope `{ success, data, message }` o
`{ success: false, error: { code, message, details } }`.

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/api/v1/auth/login` | Público | Autenticación (JWT) |
| GET | `/api/v1/roles` | SUPER_ADMIN | Catálogo de roles |
| GET | `/api/v1/users` | SUPER_ADMIN | Listado de colaboradores (filtros `search`, `rol`, `bloqueado`) |
| POST | `/api/v1/users` | SUPER_ADMIN | Alta de personal interno |
| GET | `/api/v1/users/search?documento=` | SUPER_ADMIN | Búsqueda por documento |
| GET | `/api/v1/users/:id` | SUPER_ADMIN | Consulta unitaria |
| PATCH | `/api/v1/users/:id` | SUPER_ADMIN | Actualización de datos |
| PATCH | `/api/v1/users/:id/bloqueo` | SUPER_ADMIN | Bloquear / desbloquear |
| GET | `/api/v1/categories` | ADMIN / SUPER_ADMIN | Listado de categorías (incluye `categoria_padre_id` y `hijos_count`) |
| POST | `/api/v1/categories` | ADMIN / SUPER_ADMIN | Crear categoría (padre opcional → subcategoría) |
| PATCH | `/api/v1/categories/:id` | ADMIN / SUPER_ADMIN | Editar / activar / desactivar / cambiar categoría padre |
| DELETE | `/api/v1/categories/:id` | ADMIN / SUPER_ADMIN | Eliminar (bloqueado si tiene productos o subcategorías) |
| GET | `/api/v1/products` | ADMIN / SUPER_ADMIN | Listado de productos (filtros `search`, `categoria_id`, `activo`, `stock_bajo`) |
| POST | `/api/v1/products` | ADMIN / SUPER_ADMIN | Crear producto (SKU único + inventario 0/5; variante opcional `modelo`/`atributos`) |
| PATCH | `/api/v1/products/:id` | ADMIN / SUPER_ADMIN | Actualizar ficha, precios y variante |
| PATCH | `/api/v1/inventory/:productoId` | ADMIN / SUPER_ADMIN | Ajustar stock (`ajuste` con signo) y `stock_minimo` (HU010) |
| GET | `/api/v1/inventory/alerts` | ADMIN / SUPER_ADMIN | Productos con stock en o bajo el mínimo (HU012) |
| GET | `/api/v1/status` | Público | Estado del sistema (salud, latencia, conteos) |

---

## Roles (RBAC)

- **SUPER_ADMIN:** acceso total; gestión de colaboradores y roles.
- **ADMIN:** operación (catálogo, categorías, inventario, pedidos).
- **CLIENTE:** tienda (storefront).

---

## Pruebas

```bash
cd server && npm test
```

Cubren autenticación, alta/edición de colaboradores, categorías y normalización de slugs.

---

## Manual de usuario

Guía de uso del panel para operadores: `/documentacion` (dentro de la aplicación).
