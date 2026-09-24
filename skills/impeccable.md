# SKILL: IMPECCABLE STANDARDS & BEHAVIOR PROTOCOL (skills/impeccable.md)
**Proyecto:** VeroData Retail  
**Propósito:** Protocolo de diseño y calidad frontend que la IA debe ejecutar al construir o refactorizar vistas.

---

## 1. MODOS DE OPERACIÓN
* **Modo `Operate` (Backoffice / Admin):**
  - Prioridad: Densidad de datos, velocidad y precisión.
  - Tablas compactas (`py-2.5 px-3`), hairlines de 1px (`border-zinc-800`), cero adornos superfluos.
  - `font-mono` obligatorio en: SKUs, IDs, DNI/RUC, precios numéricos (`tabular-nums`).
  - Radios contenidos: `rounded-sm` (4px) a `rounded-md` (6px). Prohibido `rounded-2xl` o `rounded-3xl`.
* **Modo `Persuade` (Storefront / Tienda):**
  - Prioridad: Decisión de compra, claridad visual y jerarquía comercial.

---

## 2. RUTINAS DE COMPORTAMIENTO (Palabras Clave para Prompts)

Cuando en el prompt se invoque una de estas directivas, aplica estrictamente su protocolo:

### Directiva: `[ROUTINE: NEW-WORK]`
* Inicia la vista desde cero asignando el modo correspondiente (`Operate` o `Persuade`).
* Crea estructura tipada en TypeScript (sin `any`), define los esquemas Zod necesarios y monta el layout base.

### Directiva: `[ROUTINE: POLISH]`
* Eleva un componente ya funcional a nivel de producción:
  1. **Los 4 Estados Mandatorios:**
     - `Loading`: Skeleton loader que calca la forma exacta del elemento (`animate-pulse`). Prohibido spinner genérico en pantalla vacía.
     - `Empty`: Ícono `lucide-react`, texto explicativo y botón de acción.
     - `Error`: Mensaje legible (no códigos crudos) y botón "Reintentar".
     - `Success`: Renderizado limpio y alineado.
  2. **Microinteracciones:** Botones con `disabled={isSubmitting}` y spinner interno para evitar doble envío.
  3. **Bordes:** 1px hairline (`border-zinc-800`), eliminar sombras difusas o glassmorphism.

### Directiva: `[ROUTINE: AUDIT]`
* Revisa el código buscando y corrigiendo:
  - Contrastes WCAG AA sobre fondos oscuros minerales (`#121214` / `zinc-950`).
  - Atributos `aria-label` en botones con solo ícono.
  - Ausencia de tipos `any`.
  - Anti-patrones visuales: colores saturados chillones, bordes redondeados excesivos o saltos de layout.