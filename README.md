# MGG · Sistema de Gestión de Inventarios — Demo

Demo HTML/CSS/JS del sistema de inventarios para **Mineral Group Guayana C.A.** (MGG),
construido bajo arquitectura de **monolito modular**. Pensado para correr en **GitHub Pages**
y validar funcionalidad antes de migrar al stack productivo.

> Empresa minera con operaciones en el estado Bolívar, Venezuela.
> · Web: <https://mineralgroupguayanaca.com.ve/>
> · Instagram: <https://www.instagram.com/mineralgroupguayana/>

---

## Cómo ejecutar

Requiere Node 18+. Flujo estándar de npm:

```bash
npm install      # primera vez (descarga `serve` a node_modules/)
npm run dev      # arranca el server estático en http://localhost:3000
```

Si `npm run dev` te dice `"serve" no se reconoce…`, es porque te falta el `npm install`
inicial: las dependencias viven en `node_modules/.bin/` y npm las encuentra
automáticamente sólo después de instalarlas.

### Cambiar el puerto

Tres opciones:

```bash
# 1. Pasarlo al ejecutar (sobreescribe el script):
npm run dev -- --listen 5500

# 2. Variable de entorno (la usa `serve` si no hay --listen):
#    Windows PowerShell
$env:PORT=5500; npm run dev
#    macOS/Linux
PORT=5500 npm run dev

# 3. Editar el script en package.json (permanente):
#    "dev": "serve . --listen 5500 --no-clipboard --single"
```


### Credenciales del demo

- **Administradora** — `admin@mineralgroupguayana.com.ve` / cualquier contraseña.
- **Analista** — `analista@mineralgroupguayana.com.ve` / cualquier contraseña.

> Datos demo se inyectan automáticamente la primera vez.
> Restaurarlos: **Inventario → ↻ Datos demo**.

### ¿Dónde viven los datos?

En `localStorage` del navegador (claves bajo el prefijo `mgg.db.*`). Esto significa que:

- Son **persistentes por navegador y dominio**: sobreviven a recargas, cierres del navegador y reinicios del equipo.
- **No se sincronizan** entre dispositivos ni entre usuarios. Cada navegador tiene su propio "Postgres" local.
- Para limpiarlos: abrir DevTools → Application → Local Storage → borrar las claves `mgg.*`, o usar el botón **↻ Datos demo** en Inventario.

En producción esto se reemplaza por **Supabase (Postgres)** sin tocar los módulos:
solo cambia `src/shared/store.js`. La interfaz (`list`, `get`, `insert`, `update`,
`remove`, `subscribe`) es idéntica a la que ofrece el cliente de Supabase.

---

## Arquitectura — Monolito modular

```
Demo/
├── index.html                 # Landing pública     ← entry de GitHub Pages
├── package.json               # Scripts y devDependencies
├── package-lock.json          # Lockfile (reproducibilidad)
├── .gitignore
├── README.md
├── pages/                     # Páginas autenticadas / privadas
│   ├── login.html             # Login con selección de rol
│   └── app.html               # Shell del monolito (sidebar + router + notif.)
├── public/
│   └── image.jpeg             # Logo MGG (assets servidos tal cual)
└── src/
    ├── main.js                # Bootstrap: hidrata sesión, seed y registra módulos
    │
    ├── shared/                # ─── Kernel transversal ───
    │   ├── store.js           #     Capa de persistencia (Supabase-like API)
    │   ├── auth.js            #     Sesión mock (reemplazable por Supabase Auth)
    │   ├── format.js          #     Helpers de formato (money, date, badges)
    │   ├── ui.js              #     Toast, modal, confirm, empty state
    │   ├── notifications.js   #     Centro de notificaciones in-app (con dedupKey + sonido)
    │   ├── sound.js           #     Beeps Web Audio (sin archivos externos)
    │   ├── config.js          #     Configs persistentes (mgg.config.*)
    │   ├── restock.js         #     Política de reabastecimiento + ABC/Pareto
    │   ├── router.js          #     Router hash-based con cleanups por ruta y `requireRole`
    │   └── styles/
    │       ├── theme.css
    │       ├── landing.css
    │       ├── login.css
    │       └── app-shell.css
    │
    ├── seed/
    │   └── seed.js            # Datos iniciales (idempotente, versionado por flag)
    │
    └── modules/               # ─── Módulos del monolito ───
        ├── dashboard/
        │   ├── dashboard.module.js
        │   └── dashboard.view.js
        ├── inventario/
        │   ├── inventario.module.js       # Entry: orquesta repo + view
        │   ├── inventario.repository.js   # Capa de datos (Store)
        │   └── inventario.view.js         # Render HTML
        ├── proveedores/
        │   ├── proveedores.module.js
        │   ├── proveedores.repository.js
        │   └── proveedores.view.js
        ├── ordenes/
        │   ├── ordenes.module.js
        │   ├── ordenes.repository.js
        │   ├── ordenes.controller.js      # ★ Reglas de negocio (flujo completo)
        │   └── ordenes.view.js
        ├── facturacion/
        │   ├── facturacion.module.js
        │   ├── facturacion.repository.js
        │   └── facturacion.view.js
        ├── usuarios/                      # CRUD usuarios + matriz de roles/permisos
        │   ├── usuarios.module.js
        │   ├── usuarios.repository.js
        │   └── usuarios.view.js
        └── ajustes/                       # Perfil + preferencias del usuario
            ├── ajustes.module.js
            └── ajustes.view.js
```

### Convención por módulo

| Archivo                  | Responsabilidad                                                |
| ------------------------ | -------------------------------------------------------------- |
| `*.module.js`            | Entry — registra la ruta y orquesta repo+view+controller       |
| `*.repository.js`        | Capa de datos. Único punto que toca `Store` para esa tabla     |
| `*.view.js`              | Renderiza HTML, no toca datos directamente                     |
| `*.controller.js` (opt.) | Reglas de negocio complejas (sólo el módulo de Órdenes lo usa) |

Esta separación replica la que tendrá el producto en React: `feature/repo.ts`,
`feature/components/*`, `feature/use-cases.ts`.

### ¿Dónde viven los `.html` y por qué?

| Archivo            | Ubicación        | Razón |
| ------------------ | ---------------- | ----- |
| `index.html`       | raíz             | Es el entry público. GitHub Pages sirve `/` → `index.html` desde la raíz del repo; moverlo rompe el deploy. |
| `login.html`       | `pages/`         | Página privada que no debe ser el entry. Agrupada con el resto del área autenticada. |
| `app.html`         | `pages/`         | Shell del sistema (sólo accesible tras login). Hermano natural de `login.html`. |

Convención por carpeta:

- **raíz** → entry público + configuración del proyecto.
- **`pages/`** → páginas privadas / autenticadas.
- **`src/`** → código fuente (JS/CSS de módulos y kernel).
- **`public/`** → assets crudos servidos tal cual (logo, futuras imágenes).

Cuando migremos a Next.js / React, esto se traduce naturalmente: `index.html` desaparece (lo genera el framework), `pages/*.html` se vuelven rutas de `src/app/` o `src/pages/`, y `src/modules/*` se mantienen casi sin cambios.

### Vista Kanban y Lista

Los módulos de **Órdenes** y **Facturación** ofrecen un toggle Kanban ⇄ Lista en la barra de filtros:

- **Kanban**: tablero con una columna por estado (Pendiente, Aprobada, Proveedor desistió, Recibida, Rechazada, Cancelada para órdenes; Pendiente, Pagada, Anulada para facturas). Cada card muestra código, proveedor, total y antigüedad. Click en una card abre el detalle con las acciones del flujo.
- **Lista**: tabla densa con todas las columnas y acciones inline (aprobar, rechazar, etc.).

El modo elegido se guarda en `localStorage` (`mgg.view.<modulo>`) y persiste entre sesiones.

### Política de reabastecimiento (ABC / Pareto)

El sistema dispara una notificación a la **Administradora** cada vez que un producto cae bajo el umbral de reabastecimiento. Quién define ese umbral, y cómo, depende de la política activa (configurable en **Inventario → ⚙ Política reabastecimiento**, sólo accesible para la Administradora).

#### Modos disponibles

| Modo          | Cómo se calcula el umbral por producto                                              | Útil cuando…                                                            |
| ------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| **Simple**    | `umbral = stockMin × % global` (un solo % para todos)                               | Inventario homogéneo o se está empezando.                              |
| **ABC**       | `umbral = stockMin × % de la clase` (A, B o C — ver abajo)                          | Productos heterogéneos en valor / criticidad.                          |
| **Detallado** | `umbral = stockMin × restockPct propio` · si el producto no lo define, usa fallback | El consumo varía mucho entre productos (insumo vs. maquinaria).         |

#### ¿Por qué hace falta el modo Detallado?

Porque la velocidad de rotación cambia drásticamente entre productos. Una **broca tricónica** dura meses y no necesita alertar al 100% del mínimo — basta con 50%. En cambio el **ANFO** que entra a producción diariamente conviene alertarlo bien antes (180%–200%), para no quedarse sin existencia mientras llega el pedido. El modo Detallado permite eso producto por producto, con un fallback global para los que no lo configuren. Editas el `%` en la ficha del producto (campo *"Umbral personalizado de reabastecimiento"*).

Ejemplos sembrados en el demo:

| Producto                | `restockPct` | Justificación                                            |
| ----------------------- | -----------: | -------------------------------------------------------- |
| Cianuro de sodio        | 200%         | Reactivo crítico de proceso. Reponer mucho antes.        |
| ANFO (saco 25 kg)       | 180%         | Insumo de voladura, consumo continuo.                    |
| Guantes anti-corte      | 150%         | EPP de alto recambio.                                    |
| Broca tricónica 8″      | 50%          | Rotación lenta, costosa y reemplazable bajo demanda.     |
| Neumático 14.00R25      | 60%          | Pieza grande, baja rotación, sólo se repone si toca.     |
| Resto (`null`)          | —            | Caen al **umbral global de fallback** del modo activo.   |

#### ABC vs Pareto

**Son lo mismo aplicado al inventario.** El principio de Pareto (80/20) dice que la mayor parte del valor se concentra en una minoría de los ítems. El análisis ABC operacionaliza ese principio dividiendo los productos en tres clases por **valor acumulado** (stock × precio):

| Clase | Valor acumulado | Significado                                       |
| ----- | --------------- | ------------------------------------------------- |
| **A** | 0 – 80%         | Críticos. Pocos SKUs pero concentran el grueso del valor. Reposición agresiva (≥100%). |
| **B** | 80 – 95%        | Intermedios. Reposición estándar (~100%).         |
| **C** | 95 – 100%       | Marginales. Muchos SKUs, poco valor. Reposición relajada (<100%). |

La clasificación se recalcula automáticamente; no hay que asignar la clase a mano. Los porcentajes por clase son editables (defaults: A=120%, B=100%, C=80%).

#### Lo que ves en el sistema

- **Inventario**: columna `ABC` con badge de color, columna `Umbral` con el valor efectivo en unidades, filtro por clase y filtro "Requiere reabastecer".
- **Dashboard**: KPI "A reabastecer" usa la política activa (no el `stockMin` crudo). La tabla "Productos a reabastecer" muestra clase + umbral por fila.
- **Notificaciones**: se generan automáticamente al cargar la app y cada vez que cambia el stock. Están deduplicadas por producto (`dedupKey: restock:<id>`) — no se repiten hasta que la marques como leída.

### Notificaciones sonoras

Cada vez que entra una notificación dirigida al usuario actual se reproduce un **doble-beep** (Web Audio API, sin archivos externos) que se repite cada 1.5 s durante la duración configurada (por defecto 10 s). Detalles:

- **Debounce**: si llegan varias notificaciones seguidas (ej. al arrancar, `Restock.notifyPending()` genera N), suena **una sola vez** (debounce de 400 ms).
- **Autoplay**: los navegadores bloquean audio hasta el primer gesto del usuario; el AudioContext se desbloquea automáticamente en el primer `click`/`keydown` después de cargar la app.
- **Detener**: cualquier click en el topbar detiene el sonido en curso; también el botón "■ Detener" en Ajustes.
- **Preferencias**: en **Ajustes** se puede desactivar notificaciones, desactivar solo el sonido, o ajustar la duración (3–30 s) con un slider; configuración persistente en `mgg.config.user.notif.*`.
- **Probar**: botón "🔊 Probar sonido" en Ajustes.

### Módulo Usuarios y Roles (sólo Administradora)

#### Pestaña Usuarios

CRUD con nombre, email, rol, departamento, teléfono y contraseña. Acciones disponibles desde la tabla:

- **Editar** datos (nombre, email, rol, departamento, teléfono).
- **🔑 Restablecer contraseña** — genera una contraseña temporal legible (formato `MGG-XXXX-XXXX` sin caracteres ambiguos), la muestra **una sola vez** en un modal con botón de copiar, y marca al usuario con `passwordTemporal: true` + `passwordResetAt`. En producción, el próximo login debe forzar cambio.
- **⊘ Deshabilitar / ✓ Habilitar** — cambia el estado del usuario. **Los usuarios no se eliminan**: por integridad referencial (órdenes históricas, aprobaciones, registros de auditoría) un usuario que ya no pertenece a la organización se deshabilita. Conservar su registro es necesario para que el historial siga teniendo sentido. La función `UsuariosRepo.removeUser()` existe en el repositorio para casos extremos (uso administrativo) pero no se expone en la UI.

Al **crear un usuario nuevo** el sistema genera automáticamente una contraseña temporal y la muestra al admin para que se la entregue al usuario por un canal seguro.

#### Pestaña Roles & Permisos

- **Crear rol** con nombre, descripción, ID interno (auto-generado si se omite) y matriz de permisos.
- **Editar permisos** de cualquier rol mediante el editor con checkboxes agrupados por módulo.
- **Eliminar** sólo roles **personalizados** (no del sistema) y **sin usuarios asignados**.
- **Protecciones**:
  - El rol `admin` (con permiso `*`) está **bloqueado** — no se puede editar ni eliminar para evitar quedarse sin acceso al sistema.
  - Los roles del sistema (`analista`, `supervisor`) sí permiten editar sus permisos (con advertencia) pero el ID y el nombre quedan readonly, y no se pueden borrar.
  - Si intentas borrar un rol con usuarios asignados, el botón está deshabilitado.

#### Modelo de permisos

Strings `<modulo>:<acción>` con wildcards:

- `*` — acceso total al sistema (sólo lo usa `admin`).
- `<modulo>:*` — acceso completo a un módulo. Al editar permisos, si marcas todas las acciones de un módulo, el sistema **colapsa automáticamente** a esta forma (más compacto y se beneficia de cualquier acción futura del módulo).
- `<modulo>:<accion>` — permiso individual.

Helpers: `UsuariosRepo.roleHasPermission(rol, key)` y `UsuariosRepo.currentHasPermission(key)`.

#### Protección de rutas

El router admite `requireRole: 'admin'` al registrar. La ruta `#/usuarios` está protegida y los no-admin reciben un estado "Acceso denegado". La entrada del sidebar también se oculta para no-admins (`data-require-role="admin"`).

### Trazabilidad por producto (kardex)

Cada producto tiene una **bitácora vertical** con todos los movimientos de stock que ha tenido. Se abre con el botón **📋** en la fila del producto en Inventario.

#### El kardex como única vía oficial de modificar stock

Toda alteración de `stock` pasa por `MovimientosRepo.registrar()`, que en una sola operación:

1. Lee el stock actual del producto.
2. Calcula `stockDespues = max(0, stockAntes + delta)`.
3. Actualiza el producto.
4. Inserta el movimiento con `stockAntes`, `stockDespues`, `actor`, `at`, referencia opcional.

Esto significa que no existen "cambios de stock huérfanos": la suma de todos los movimientos de un producto debe igualar su `stock` actual (invariante auditable).

#### Tipos de movimiento

| Tipo              | Cuándo se genera                                | Delta  |
| ----------------- | ----------------------------------------------- | ------ |
| `creacion`        | Alta del producto con stock inicial > 0         | +      |
| `ajuste`          | Edición manual del stock desde el formulario    | ±      |
| `entrada_orden`   | Recepción de una orden de pedido aprobada       | +      |
| `salida_consumo`  | **Fase 2** — consumo en proceso (Horno N, etc.) | −      |
| `transferencia`   | **Fase 2** — entre almacenes                    | ±      |

Cada movimiento guarda quién (`actor`/`actorName`), cuándo (`at`), por qué (`detalle`) y opcionalmente su referencia (`refTipo`/`refId`/`refCodigo`/`proveedorId`).

#### Vista de trazabilidad

Modal con:

- **Resumen**: stock actual + total de entradas + total de salidas (acumuladas).
- **Timeline vertical** con un punto por movimiento. Cada entrada muestra:
  - Tipo (✨ alta · ⚙ ajuste · ⬇ entrada por orden · 🔥 consumo en proceso · ↔ transferencia)
  - Delta con signo y color (verde entradas, rojo salidas)
  - Referencia: **orden + proveedor**, **proceso + número**, o motivo manual
  - Fecha + autor + saldo resultante tras el movimiento

#### Preparación para Fase 2 (Producción)

El tipo `salida_consumo` ya está definido en `MovimientosRepo.TIPOS`. Cuando se implemente el módulo de Producción, los procesos (ej. Horno 1) llamarán:

```js
MovimientosRepo.registrar({
  productoId: 'prod_10',
  tipo: 'salida_consumo',
  delta: -25,
  refTipo: 'proceso',
  refId: 'pro_42',
  refCodigo: 'PRO-2026-0042',
  detalle: 'Horno 1 · lote nocturno',
});
```

…y la línea aparecerá automáticamente en el timeline del producto, sin tocar ningún otro código.

### Módulo Ajustes

- **Perfil**: editar nombre de visualización + teléfono. Cambios se reflejan en el chip del sidebar inmediatamente.
- **Notificaciones**: tres controles (activar/desactivar notificaciones, sonido on/off, duración).
- **Vista preferida**: aplica Kanban o Lista por defecto a Órdenes y Facturación.
- **Sesión**: información de la sesión activa, recuento de permisos del rol, y botón de cerrar sesión.

---

## Roles y flujo

| Rol            | Puede |
| -------------- | ----- |
| Administradora | Aprobar / rechazar órdenes · Cancelar · Registrar desistimiento · Cambiar proveedor · Generar facturas (auto al aprobar) · Marcar pagadas / anular · Configurar política de reabastecimiento · **Gestionar usuarios y roles** |
| Analista       | Crear órdenes de pedido · Cambiar proveedor · Marcar desistimiento · Ver todo · Ajustes propios |
| Supervisor     | Acceso de solo lectura sobre las operaciones |

> Los roles se definen en la tabla `roles` con permisos del tipo `<modulo>:<acción>` (con wildcards `*` y `<modulo>:*`). Visibles y editables (en cuanto a usuarios asignados) en **Sistema → Usuarios**.

### Estados de una orden y transiciones

```
            ┌──────────────┐
            │  pendiente   │ ← creada por analista
            └──┬───────────┘
   admin       │
   aprueba     │  admin    cambio de  cancela
               ▼  rechaza  proveedor  (empresa)
            ┌──────────────┐ ┌─────────┐ ┌──────────┐
            │  aprobada    │ │rechazada│ │cancelada │
            └──┬───────────┘ └─────────┘ └──────────┘
   desistim.   │   recibida
   proveedor   │   ▼
               │ ┌──────────┐
               │ │ recibida │ ← stock incrementado
               │ └──────────┘
               ▼
        ┌──────────────────────┐
        │ desistida_proveedor  │ ← reasignable a otro proveedor
        └──────────────────────┘
                  │
                  ▼  cambio de proveedor
              (vuelve a "pendiente" con nuevo proveedor)
```

### Eventos que se registran en el historial

Toda orden lleva un array `historial[]` que se va alimentando con cada acción.
Esto sienta la base para la auditoría completa de Fase 3.

- `creada` — analista crea la solicitud
- `aprobada` / `rechazada` — admin decide
- `cancelada` — la empresa cancela (con motivo)
- `desistida_proveedor` — el proveedor no cumplió (con motivo)
- `proveedor_cambiado` — reasignación (registra proveedor anterior y nuevo + motivo)
- `recibida` — recepción confirmada, stock incrementado

### Casos cubiertos en Fase 1

- ✅ Proveedor toma la orden (en el demo: se asigna al crearla; en Fase 2 se abre el flujo de licitación).
- ✅ La empresa **cancela** la orden (con motivo, anula factura si ya existía).
- ✅ El cliente pide cancelar → se canaliza por la misma acción de cancelar.
- ✅ El proveedor no cumple → **registrar desistimiento** (queda abierta para reasignar).
- ✅ **Cambiar proveedor** sin perder la orden ni el historial (anula la factura anterior, vuelve a pendiente para nueva aprobación).
- ✅ Trazabilidad completa visible en el detalle de cada orden.

---

## Fase 1 (entregada)

- [x] Landing pública con presentación y roadmap
- [x] Login con selección de rol (admin / analista)
- [x] **Dashboard** — KPIs, gráfico 7d, stock crítico, actividad reciente con historial
- [x] **Inventario** — CRUD productos, filtros, alertas de stock bajo
- [x] **Proveedores** — CRUD con RIF, contacto, categorías, estado
- [x] **Órdenes** — Crear · Aprobar/Rechazar · Cancelar · Desistir · Cambiar proveedor · Recibir
- [x] **Facturación** — Generación automática al aprobar · estados pendiente/pagada/anulada
- [x] **Notificaciones in-app** por rol (con deduplicación, base para el flujo de licitación de Fase 2)
- [x] **Historial / trazabilidad** por orden
- [x] **Vista Kanban / Lista** alternable en Órdenes y Facturación
- [x] **Política de reabastecimiento** configurable (Simple / ABC-Pareto / Detallado) — solo Administradora
- [x] **Notificaciones sonoras** (Web Audio, patrón doble-beep, duración configurable)
- [x] **Módulo de Usuarios y Roles** con matriz de permisos
- [x] **Módulo de Ajustes** (perfil, preferencias de notificación, vista por defecto)
- [x] **Trazabilidad por producto** (kardex): timeline vertical con cada entrada/salida, quién, cuándo, referencia a orden/proveedor/proceso

## Fase 2 (pendiente)

- [ ] Módulo **Ventas**
- [ ] Módulo **Compras**
- [ ] **Notificación de licitación** — cuando una analista solicita, el sistema notifica
      al rol correspondiente; al ser tomada por el primer proveedor disponible se
      asigna la propuesta/factura
- [ ] **Almacén general** + **almacenes por departamento** (transferencias internas)
- [ ] Flujo de **desistimiento cliente** (cliente externo solicita cancelar)
- [ ] **Producción / Procesos** — registra órdenes de proceso (ej. hornos, lixiviación,
      voladura) que **consumen insumos** del inventario y opcionalmente generan output.
      Incluye BOM (Bill of Materials / "receta") por proceso, salidas por consumo y
      trazabilidad lote-a-lote. Es la primera vía formal por la que el stock **disminuye**
      sin pasar por la edición manual.

## Fase 3 (pendiente)

- [ ] Reportes y exportes (PDF / Excel)
- [ ] Bitácora de auditoría con búsqueda
- [ ] KPIs e indicadores históricos
- [ ] **Plus solicitado:** Módulo de **gestión de combustible para la flota vehicular** (carga, consumo por vehículo, alertas)

---

## Stack

### Demo actual

- HTML5 · CSS3 · JavaScript ES6 (sin framework)
- Persistencia en `localStorage` (clave `mgg.db.*`)
- `serve` (devDependency) como servidor estático
- Deploy en GitHub Pages

### Stack productivo objetivo

- **Frontend:** React + Tailwind CSS
- **Backend / Infra:** Next.js o Node.js
- **BD + Auth + Storage:** Supabase (Postgres)
- **Repositorio:** GitHub con Gitflow mínimo (`main`, `develop`, `feature/*`)
- **Despliegue:** DigitalOcean (u otra alternativa por definir)

### Mapeo demo → producto

| Capa del demo                | Equivalente productivo                                   |
| ---------------------------- | -------------------------------------------------------- |
| `shared/store.js`            | Cliente Supabase (`supabase.from(...)`)                  |
| `shared/auth.js`             | Supabase Auth + RLS por rol                              |
| `shared/notifications.js`    | Realtime de Supabase + bandeja persistida                |
| `seed/seed.js`               | Migrations + seeds SQL                                   |
| `modules/<m>/repository.js`  | `src/features/<m>/repo.ts` (Supabase wrappers)           |
| `modules/<m>/controller.js`  | `src/features/<m>/use-cases.ts` (reglas de negocio)      |
| `modules/<m>/view.js`        | `src/features/<m>/components/*` (React)                  |
| `modules/<m>/module.js`      | Página / ruta del feature                                |
| `shared/router.js`           | Next.js App Router                                       |
| `shared/ui.js`               | Componentes Tailwind + librería de toasts                |

---

Paleta derivada del logo: fondo negro/grafito + acentos naranja/dorado y plateado.

---

## Notas

- Los datos son **mock** y viven en `localStorage`. Limpiar el storage los resetea.
- El sistema asume un único almacén "General" en Fase 1; el modelo está preparado
  para multi-almacén desde Fase 2 (campo `almacen` en productos).
- Para debug rápido en la consola del navegador está expuesto `window.MGG`
  con todos los repos, controllers y utilidades.
