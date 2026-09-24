import React from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Boxes,
  FolderTree,
  LogIn,
  Package,
  ShieldAlert,
  UserCog,
} from 'lucide-react';

interface Section {
  id: string;
  label: string;
}

const SECTIONS: Section[] = [
  { id: 'acceso', label: 'Acceso al panel' },
  { id: 'colaboradores', label: 'Colaboradores' },
  { id: 'categorias', label: 'Categorías' },
  { id: 'catalogo', label: 'Catálogo' },
  { id: 'proximamente', label: 'Próximamente' },
];

function Step({ n, children }: { n: number; children: React.ReactNode }): React.ReactElement {
  return (
    <li className="flex gap-sm">
      <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-xs bg-hairline-cool font-mono text-xs text-ink-mute">
        {n}
      </span>
      <span className="text-sm leading-relaxed text-ink-secondary">{children}</span>
    </li>
  );
}

function Callout({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <div className="mt-md rounded-sm border border-hairline bg-canvas-soft p-md text-xs leading-relaxed text-ink-mute">
      {children}
    </div>
  );
}

export function ManualPage(): React.ReactElement {
  return (
    <div className="min-h-screen bg-canvas-soft">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-hairline bg-canvas">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-xl py-md">
          <Link to="/login" aria-label="VeroData Retail">
            <img src="/brand/logo-verodata.svg" alt="VeroData Retail" className="h-6 w-auto" />
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center gap-xs text-sm text-ink-mute transition-colors hover:text-ink"
          >
            <LogIn size={14} aria-hidden="true" />
            Iniciar sesión
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-xl py-xxl lg:grid lg:grid-cols-[220px_1fr] lg:gap-xxl">
        {/* Índice */}
        <nav aria-label="Índice del manual" className="mb-xl lg:mb-0">
          <p className="mb-sm flex items-center gap-xs font-mono text-xs font-semibold uppercase tracking-widest text-ink-mute">
            <BookOpen size={14} aria-hidden="true" />
            Manual de usuario
          </p>
          <ul className="space-y-xs border-l border-hairline lg:sticky lg:top-20">
            {SECTIONS.map(section => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="block border-l-2 border-transparent px-sm py-xxs text-sm text-ink-mute transition-colors hover:border-primary hover:text-ink"
                >
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Contenido */}
        <main className="space-y-xxl">
          <div>
            <h1 className="text-heading-lg font-semibold text-ink">Manual de usuario</h1>
            <p className="mt-xs text-sm text-ink-mute">
              Guía de uso del panel administrativo de VeroData Retail.
            </p>
          </div>

          {/* Acceso */}
          <section id="acceso" className="scroll-mt-20">
            <h2 className="flex items-center gap-sm text-heading-md font-medium text-ink">
              <LogIn size={16} className="text-primary-ink" aria-hidden="true" />
              Acceso al panel
            </h2>
            <div className="mt-md h-px bg-hairline" />

            <h3 className="mt-lg text-sm font-medium text-ink">Iniciar sesión</h3>
            <ol className="mt-sm space-y-sm">
              <Step n={1}>
                Ingresa tu <strong>correo institucional</strong> y tu <strong>contraseña</strong>.
              </Step>
              <Step n={2}>Pulsa <strong>Ingresar</strong>. Si son correctas, entrarás al panel.</Step>
            </ol>

            <h3 className="mt-lg text-sm font-medium text-ink">Bloqueo por 3 intentos</h3>
            <ol className="mt-sm space-y-sm">
              <Step n={1}>Tras 3 intentos fallidos consecutivos se mostrará un aviso de seguridad.</Step>
              <Step n={2}>Podrás restablecer tu contraseña o esperar e intentar de nuevo.</Step>
            </ol>

            <Callout>
              Por seguridad, no compartas tus credenciales. El acceso está restringido al personal
              autorizado.
            </Callout>
          </section>

          {/* Colaboradores */}
          <section id="colaboradores" className="scroll-mt-20">
            <h2 className="flex items-center gap-sm text-heading-md font-medium text-ink">
              <UserCog size={16} className="text-primary-ink" aria-hidden="true" />
              Gestión de colaboradores
            </h2>
            <div className="mt-md h-px bg-hairline" />
            <p className="mt-md text-sm leading-relaxed text-ink-mute">
              Disponible para el rol <strong>Super Administrador</strong>, desde el menú
              <strong> Usuarios</strong>.
            </p>

            <h3 className="mt-lg text-sm font-medium text-ink">Consultar y buscar</h3>
            <p className="mt-xs text-sm leading-relaxed text-ink-mute">
              Usa el buscador por correo o número de documento, y los filtros por rol y estado.
            </p>

            <h3 className="mt-lg text-sm font-medium text-ink">Registrar un colaborador</h3>
            <ol className="mt-sm space-y-sm">
              <Step n={1}>Pulsa <strong>Nuevo usuario</strong>.</Step>
              <Step n={2}>Completa tipo y número de documento, nombres, apellidos, correo, contraseña temporal y rol.</Step>
              <Step n={3}>Confirma con <strong>Registrar colaborador</strong>.</Step>
            </ol>

            <h3 className="mt-lg text-sm font-medium text-ink">Editar</h3>
            <p className="mt-xs text-sm leading-relaxed text-ink-mute">
              En la fila del colaborador pulsa <strong>Editar</strong>. Se modifican los datos
              personales y de contacto (la contraseña y el rol no se cambian desde aquí).
            </p>

            <h3 className="mt-lg text-sm font-medium text-ink">Bloquear / desbloquear</h3>
            <p className="mt-xs text-sm leading-relaxed text-ink-mute">
              Pulsa <strong>Bloquear</strong> para impedir el acceso de una cuenta. Al
              <strong> Desbloquear</strong> se restablecen los intentos fallidos.
            </p>
          </section>

          {/* Categorías */}
          <section id="categorias" className="scroll-mt-20">
            <h2 className="flex items-center gap-sm text-heading-md font-medium text-ink">
              <FolderTree size={16} className="text-primary-ink" aria-hidden="true" />
              Gestión de categorías
            </h2>
            <div className="mt-md h-px bg-hairline" />
            <p className="mt-md text-sm leading-relaxed text-ink-mute">
              Disponible desde el menú <strong>Categorías</strong>. Sirve para organizar el catálogo.
            </p>

            <h3 className="mt-lg text-sm font-medium text-ink">Crear</h3>
            <ol className="mt-sm space-y-sm">
              <Step n={1}>Pulsa <strong>Nueva categoría</strong>.</Step>
              <Step n={2}>Escribe el <strong>nombre</strong>; el <strong>slug</strong> (URL) se genera automáticamente y puedes editarlo.</Step>
              <Step n={3}>Añade una descripción opcional y guarda.</Step>
            </ol>

            <h3 className="mt-lg text-sm font-medium text-ink">Activar / desactivar</h3>
            <p className="mt-xs text-sm leading-relaxed text-ink-mute">
              Una categoría inactiva se oculta del catálogo público sin borrar su información.
            </p>

            <h3 className="mt-lg text-sm font-medium text-ink">Eliminar</h3>
            <p className="mt-xs text-sm leading-relaxed text-ink-mute">
              Solo se puede eliminar una categoría <strong>sin productos asociados</strong>. Si los
              tiene, desactívala en su lugar.
            </p>
          </section>

          {/* Catálogo */}
          <section id="catalogo" className="scroll-mt-20">
            <h2 className="flex items-center gap-sm text-heading-md font-medium text-ink">
              <Package size={16} className="text-primary-ink" aria-hidden="true" />
              Catálogo
            </h2>
            <div className="mt-md h-px bg-hairline" />
            <p className="mt-md text-sm leading-relaxed text-ink-mute">
              Disponible desde el menú <strong>Catálogo</strong>. Permite registrar los artículos que se
              publican en la tienda.
            </p>

            <h3 className="mt-lg text-sm font-medium text-ink">Registrar un producto</h3>
            <ol className="mt-sm space-y-sm">
              <Step n={1}>Pulsa <strong>Nuevo producto</strong>.</Step>
              <Step n={2}>
                Completa la <strong>categoría</strong>, el <strong>SKU</strong> (código único), el{' '}
                <strong>nombre</strong> y la <strong>descripción</strong>.
              </Step>
              <Step n={3}>
                Indica el <strong>precio regular</strong> y, opcionalmente, un{' '}
                <strong>precio de oferta</strong> (debe ser menor).
              </Step>
              <Step n={4}>
                Guarda. El artículo se crea con stock inicial <strong>0</strong>.
              </Step>
            </ol>

            <h3 className="mt-lg text-sm font-medium text-ink">Editar un producto</h3>
            <p className="mt-xs text-sm leading-relaxed text-ink-mute">
              Pulsa <strong>Editar</strong> en la fila del producto para actualizar su nombre,
              descripción, categoría y precios. El <strong>SKU</strong> no se modifica. Los cambios de
              precio no afectan a los pedidos ya registrados.
            </p>
            <Callout>
              El <strong>SKU</strong> es único: el sistema rechaza códigos repetidos. El stock se
              gestiona en el módulo de Inventario.
            </Callout>
          </section>

          {/* Próximamente */}
          <section id="proximamente" className="scroll-mt-20">
            <h2 className="flex items-center gap-sm text-heading-md font-medium text-ink">
              <Boxes size={16} className="text-primary-ink" aria-hidden="true" />
              Próximamente
            </h2>
            <div className="mt-md h-px bg-hairline" />
            <p className="mt-md text-sm leading-relaxed text-ink-mute">
              Inventario, pedidos y la tienda pública se documentarán aquí a medida que se habiliten.
            </p>
          </section>

          <div className="flex items-start gap-sm rounded-sm border border-hairline bg-canvas p-md">
            <ShieldAlert size={16} className="mt-px shrink-0 text-ink-mute" aria-hidden="true" />
            <p className="text-xs leading-relaxed text-ink-mute">
              ¿Necesitas ayuda adicional? Contacta a un Super Administrador del sistema.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

export default ManualPage;
