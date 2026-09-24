# 01. VISIÓN GENERAL Y ARQUITECTURA DEL SISTEMA
**Proyecto:** VeroData Retail  
**Organización:** VeroData Retail S.A.C.  
**Rubro:** Distribución minorista omnicanal de calzado, indumentaria y accesorios.  

---

## 1. PROPÓSITO DEL SISTEMA
VeroData Retail es una plataforma transaccional diseñada para unificar la operación comercial minorista, resolviendo los tres problemas críticos identificados en el diagnóstico AS-IS:
1. **Sobreventa y quiebres de inventario:** Neutralizados mediante control concurrente y atómico del stock.
2. **Pérdida de inmutabilidad en pedidos:** Erradicada mediante un snapshot estático de precios y datos de envío en cada orden.
3. **Fricción en el proceso de compra:** Eliminada mediante una arquitectura de Checkout Dual que admite compras tanto a usuarios registrados como a invitados (*Guest Checkout*).

---

## 2. ARQUITECTURA DE SOFTWARE: MONOLITO MODULAR
El sistema está diseñado como un **Monolito Modular** en capas, desacoplando la lógica de negocio por dominios pero compartiendo una única base de datos relacional y un proceso de ejecución.

### Módulos del Núcleo:
* **Módulo de Identidad y Accesos (IAM):** Autenticación JWT, cifrado BCrypt, roles (`SUPER_ADMIN`, `ADMIN`, `CLIENTE`) y control de intentos fallidos.
* **Módulo de Usuarios y Colaboradores:** Gestión de perfiles, datos personales con documento de identidad y libretas de direcciones.
* **Módulo de Catálogo:** Categorías jerárquicas, productos con variantes y cálculo de precios con ofertas.
* **Módulo de Inventario:** Control de existencias, umbrales de alerta mínima y deducciones atómicas concurrentes.
* **Módulo de Ventas y Pedidos:** Carrito transaccional, checkout dual, generación de órdenes con snapshot histórico inmutable y estados de pedido.
* **Módulo Analítico:** Métricas de ventas, productos más vendidos y alertas de rotación para el panel administrativo.

---

## 3. ACTORES DEL SISTEMA Y ROLES (RBAC)
* **Super Administrador:** Control total de la plataforma, creación y auditoría de colaboradores internos, asignación de roles y configuración global.
* **Administrador:** Gestión operativa diaria: catálogo, ajuste de existencias de inventario, despacho de pedidos y visualización de reportes.
* **Cliente Registrado:** Navegación en el Storefront, carrito persistente, historial de órdenes, libreta de direcciones y seguimiento de compras.
* **Cliente Invitado:** Navegación y compra rápida en el Storefront mediante captura de datos en el checkout sin requerir creación de credenciales.

---

## 4. METAS ESTRATÉGICAS ALINEADAS AL SOFTWARE
* Incrementar las ventas totales en un **28%** en el primer año vía Storefront.
* Reducir las incidencias por sobreventa a **menos del 1%**.
* Disminuir tiempos de preparación de despacho de 48 horas a **menos de 12 horas**.
* Asegurar el **100%** de inmutabilidad fiscal y legal de los pedidos.