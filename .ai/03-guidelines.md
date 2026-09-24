# 03. GUÍAS DE CÓDIGO, CONVENCIONES Y ESTÁNDARES TÉCNICOS
**Entorno:** Node.js con TypeScript  
**Paradigma:** Arquitectura Limpia en Capas (Controller-Service-Repository)  

---

## 1. ESTRUCTURA DE ARCHIVOS POR MÓDULO (`src/modules`)
Cada dominio debe contener sus capas separadas:
```text
src/
├── config/              # Variables de entorno (.env), conexión a DB
├── middlewares/         # Auth JWT, Role Authorization, Error Handling, Validation
├── modules/
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.repository.ts
│   │   ├── auth.routes.ts
│   │   └── auth.schemas.ts       # Esquemas de validación Zod
│   ├── users/
│   ├── products/
│   ├── inventory/
│   └── orders/
└── shared/              # Utilidades, tipos globales, constantes
```

---

## 2. CONVENCIONES DE CÓDIGO TYPESCRIPT
* **Tipado estricto:** Prohibido el uso de `any`. Definir interfaces o tipos explícitos para inputs, outputs y entidades de base de datos.
* **Nomenclatura:**
  * Variables y funciones: `camelCase` (ej. `obtenerUsuarioPorDocumento`).
  * Clases, Tipos e Interfaces: `PascalCase` (ej. `PedidoSnapshot`, `AuthService`).
  * Constantes globales: `UPPER_SNAKE_CASE` (ej. `MAX_LOGIN_ATTEMPTS`).
  * Nombres de tablas y columnas en BD: `snake_case` (ej. `tipo_documento`).

---

## 3. ESTÁNDAR DE RESPUESTAS HTTP (API REST)

Todas las respuestas deben seguir una estructura estándar JSON:

### Respuesta Exitosa:
```json
{
  "success": true,
  "data": { ... },
  "message": "Operación ejecutada correctamente"
}
```

### Respuesta de Error:
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "El colaborador con el ID especificado no existe",
    "details": null
  }
}
```

### Códigos HTTP de Referencia:
* `200 OK`: Consulta o actualización exitosa.
* `201 Created`: Recurso creado exitosamente (usuario, pedido, producto).
* `400 Bad Request`: Parámetros o cuerpo de petición inválido (error en Zod).
* `401 Unauthorized`: Token inexistente, expirado o credenciales inválidas.
* `403 Forbidden`: El rol no cuenta con permisos para el recurso solicitado.
* `404 Not Found`: Recurso no encontrado.
* `409 Conflict`: Violación de unicidad (email o documento duplicado).
* `500 Internal Server Error`: Error inesperado del servidor.

---

## 4. PATRÓN DE CONCURRENCIA PARA INVENTARIO
Para evitar sobreventa en compras simultáneas, **NUNCA** hacer primero un `SELECT` para evaluar stock y luego un `UPDATE`. Ejecutar la deducción atómica de forma segura:

```sql
UPDATE inventario
SET stock_actual = stock_actual - $1,
    stock_alerta = (stock_actual - $1 <= stock_minimo),
    updated_at = CURRENT_TIMESTAMP
WHERE id_producto = $2 AND stock_actual >= $1
RETURNING stock_actual;
```
Si la consulta no devuelve filas afectadas, significa que no había stock suficiente y la transacción debe cancelarse (`ROLLBACK`) retornando error `409 Conflict`.