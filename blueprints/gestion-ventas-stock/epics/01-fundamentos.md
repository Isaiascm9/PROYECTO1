# Epic 01: Fundamentos

> Al terminar este épico existe una app Next.js corriendo, con capa de datos falsa (`MemoryRepo`),
> login por PIN, y los tres flujos de negocio completos (productos, ventas con descuento de stock,
> gastos) más el dashboard — todo contra `SHEETS_MODE=memory`, sin necesitar ninguna cuenta de Google.

| | |
|---|---|
| **Epic id** | `01-fundamentos` |
| **Tasks** | `E1-T1` … `E1-T7` |
| **Depends on** | nothing — start here |
| **Unlocks** | `02-integracion-y-despliegue` |
| **Parallel with** | nada — es lineal, cada tarea depende de la anterior |

You do not need any other file to complete this epic. Everything below is repeated here on purpose.

---

## Stack

Next.js 16.3.0 (App Router, Server Actions) · TypeScript 7.0.2 · Tailwind CSS 4.3.3 · sin base de
datos relacional — la capa de datos es la interfaz `DataRepo`, y en este épico solo se implementa
`MemoryRepo` (fake, en memoria) · auth por PIN + cookie firmada (`jose`) · hosting Vercel (recién en
el épico 02). Package manager: `pnpm`. Runtime pinned en `.nvmrc` (24.19.0). Versiones de dependencia
están en `pnpm-lock.yaml` — leerlo, nunca adivinar una.

| Task | Command |
|---|---|
| Dev | `pnpm dev` |
| Typecheck | `pnpm typecheck` |
| Lint | `pnpm lint` |
| Test (un archivo) | `pnpm test src/lib/data/stock.test.ts` |
| Build | `pnpm build` |

**Gate:** `pnpm typecheck && pnpm lint && pnpm test` pasa antes de marcar cualquier tarea de este
épico como hecha.

Ningún task de este épico necesita un servicio local (no hay base de datos ni cola que levantar) —
`MemoryRepo` vive en el propio proceso de Node.

## Directory subtree

Solo las partes que toca este épico:

```
src/
  lib/
    env.ts                 # NEW E1-T1 — validacion de env vars al boot
    money.ts                # NEW E1-T2 — centavos <-> string decimal
    auth/
      session.ts             # NEW E1-T3 — firmar/verificar JWT de sesion
      session.test.ts        # NEW E1-T3
    data/
      schemas.ts              # NEW E1-T2 — Zod: Producto, Venta, Gasto
      repo.ts                 # NEW E1-T2 — interfaz DataRepo + getRepo()
      memory-repo.ts           # NEW E1-T2 — implementacion fake
      memory-repo.test.ts      # NEW E1-T2
      stock.ts                 # NEW E1-T5 — decrementarStock() con reintento
      stock.test.ts            # NEW E1-T5
      kpis.ts                  # NEW E1-T7 — calculos del dashboard
      kpis.test.ts             # NEW E1-T7
  components/
    producto-form.tsx         # NEW E1-T4 — formulario compartido alta/edicion
  middleware.ts                # NEW E1-T3 — unico punto de chequeo de sesion
  app/
    globals.css                # NEW E1-T1
    layout.tsx                  # NEW E1-T1
    page.tsx                    # NEW E1-T1 (placeholder) -> reemplazado en E1-T7 (dashboard real)
    login/page.tsx               # NEW E1-T3
    api/
      health/route.ts             # NEW E1-T1
      auth/route.ts                # NEW E1-T3 — POST login / DELETE logout
    productos/
      page.tsx                     # NEW E1-T4
      actions.ts                    # NEW E1-T4
      nuevo/page.tsx                 # NEW E1-T4
      [id]/editar/page.tsx           # NEW E1-T4
    ventas/
      page.tsx                     # NEW E1-T7 — historial
      actions.ts                    # NEW E1-T5
      nueva/page.tsx                 # NEW E1-T5
      [id]/page.tsx                   # NEW E1-T5 (detalle) — el episodio 02 le agrega el boton de compartir
    gastos/
      page.tsx                     # NEW E1-T6
      actions.ts                    # NEW E1-T6
      nuevo/page.tsx                 # NEW E1-T6
```

Todo lo que ya está en `workspace/` en la raíz del proyecto (`package.json`, `tsconfig.json`,
`next.config.ts`, `postcss.config.mjs`, `vitest.config.ts`, `eslint.config.mjs`,
`pnpm-workspace.yaml`, `.prettierignore`, `.env.example`, `.gitignore`, `.nvmrc`, `CLAUDE.md`,
`AGENTS.md`, `.claude/**`, `public/manifest.json`, `public/icons/**`) ya existe antes de `E1-T1` —
nadie en este épico lo crea, solo lo usa.

Fuera de este árbol está fuera de alcance. Si una tarea pareciera necesitar editar un archivo no
listado acá, parar y reportarlo.

## Data model touched here

| Entity | Fields this epic adds or reads | Notes |
|---|---|---|
| `Producto` | todos — ver `blueprint.md` §4 | Creado y leído por `MemoryRepo`; el Sheet real recién en `02-integracion-y-despliegue` |
| `Venta` | todos — ver `blueprint.md` §4 | `precio_unitario_centavos` y `total_centavos` son snapshots, nunca se recalculan después de creada |
| `Gasto` | todos — ver `blueprint.md` §4 | Ledger — solo altas, nunca ediciones |

## Contracts

**Consumed** — ya existe, no reconstruir:

| From | Interface | Guarantee |
|---|---|---|
| `workspace/` (bundle raíz) | `package.json`, `next.config.ts`, `postcss.config.mjs`, `vitest.config.ts` | Ya instalados/configurados antes de `E1-T1`; `pnpm install` en el Bootstrap del build ya corrió |

**Produced** — épicos y tareas posteriores dependen exactamente de estas firmas. Cambiar una las rompe:

| Export | Signature | Used by |
|---|---|---|
| `src/lib/data/repo.ts` → `DataRepo` (interfaz), `getRepo()` | `interface DataRepo { listProductos(soloActivos?: boolean): Promise<Producto[]>; getProducto(id): Promise<Producto\|null>; createProducto(input): Promise<Producto>; updateProducto(id, patch): Promise<Producto>; listVentas(): Promise<Venta[]>; getVenta(id): Promise<Venta\|null>; createVenta(venta): Promise<Venta>; listGastos(): Promise<Gasto[]>; createGasto(input): Promise<Gasto>; }` — `getRepo(): DataRepo` | `E2-T8` (implementa `GoogleSheetsRepo` contra la misma interfaz), toda `src/app/**` de este épico |
| `src/lib/data/stock.ts` → `decrementarStock(repo, productoId, cantidad)` | `Promise<{ok:true,nuevoStock:number}\|{ok:false,error:string}>` | `src/app/ventas/actions.ts` (`E1-T5`) |
| `src/lib/auth/session.ts` → `pinValido`, `firmarSesion`, `sesionValida`, `COOKIE_SESION`, `MAX_AGE_COOKIE` | ver `blueprint.md` §9 Step 3 para el cuerpo completo | `src/middleware.ts`, `src/app/api/auth/route.ts` (`E1-T3`) |
| `src/lib/money.ts` → `centavosADecimal`, `decimalACentavos` | `(number) => string`, `(string) => number` | Todo formulario y toda tabla de dinero, en este épico y en el `02` |

## Conventions that bite in this area

- `getRepo()` memoiza la instancia — nunca instanciar `MemoryRepo` directamente fuera de `repo.ts`.
- Money es siempre un entero de centavos en `src/lib/data/**` — la conversión a string decimal pasa
  siempre por `src/lib/money.ts`, nunca `Math.round(x * 100)` a mano en un componente.
- `MemoryRepo` se siembra con 4 productos de ejemplo en su constructor — los tests y los specs E2E
  del épico 02 asumen que existen desde el arranque.

Full project rules: `CLAUDE.md`. Area rules: `.claude/rules/data-layer.md`,
`.claude/rules/server-actions-and-forms.md`. Ambos ya están en la raíz del proyecto — el builder los
copió ahí desde `workspace/` antes de la tarea uno.

---

## Tasks

Listadas en el mismo orden que `tasks.json`. Ese orden es el orden de build — trabajar de arriba
hacia abajo, sin reordenar por prioridad ni por lo que parezca más rápido.

### `E1-T1` — Layout, health check y validación de entorno

**Depends on:** nothing · **Priority:** p0 — bloquea todo lo demás

Crear la validación de entorno (`src/lib/env.ts`, Zod, exige `APP_PIN` y `SESSION_SECRET` no vacíos,
falla al importar el módulo si faltan — fail loud, nunca un default para un secreto), el shell HTML
mínimo con los tokens de diseño de `CLAUDE.md` (`globals.css` vía `@theme` de Tailwind), un `page.tsx`
placeholder (`E1-T7` lo reemplaza), y `GET /api/health` devolviendo `{ok:true}`. Este es el primer
artefacto servible del proyecto — se ejecuta de verdad en el propio Verify de esta tarea, no solo se
compila.

**Files**
- `src/lib/env.ts` — new
- `src/app/globals.css` — new
- `src/app/layout.tsx` — new
- `src/app/page.tsx` — new (placeholder temporal)
- `src/app/api/health/route.ts` — new

**Acceptance**

1. **WHEN** el server de desarrollo arranca (`pnpm dev`) **THE SYSTEM SHALL** responder 200 en `GET /`.
2. **WHEN** se hace `GET /api/health` **THE SYSTEM SHALL** responder `{"ok":true}` con status 200.
3. **WHEN** `APP_PIN` o `SESSION_SECRET` no están definidas **THE SYSTEM SHALL** fallar al arrancar
   (`pnpm build` o `pnpm dev`) con un error que nombra la variable faltante.
4. **WHEN** `pnpm build` corre con las variables requeridas presentes **THE SYSTEM SHALL** terminar
   con exit 0.

**Verify**

```bash
pnpm install
pnpm typecheck
SHEETS_MODE=memory APP_PIN=2026 SESSION_SECRET=dev-secret-at-least-32-characters-long pnpm build
bash -c 'SHEETS_MODE=memory APP_PIN=2026 SESSION_SECRET=dev-secret-at-least-32-characters-long pnpm start & echo $! > /tmp/server.pid; sleep 2; test "$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/api/health)" = 200 && curl -s http://127.0.0.1:3000/api/health | grep -q "\"ok\":true"; status=$?; kill "$(cat /tmp/server.pid)"; exit $status'
```

**Checkpoint**

```bash
git add -A && git commit -m "E1-T1: layout, health check y validacion de entorno"
git tag step-01-scaffold
```

### `E1-T2` — Capa de datos: esquemas, `DataRepo`, `MemoryRepo`

**Depends on:** `E1-T1` · **Priority:** p0

Copiar el cuerpo literal de los esquemas Zod de `blueprint.md` §4 *Schema* a `schemas.ts`. Definir la
interfaz `DataRepo` en `repo.ts` (firma completa en *Contracts* arriba) y `getRepo()`, que hoy solo
sabe instanciar `MemoryRepo` — si `SHEETS_MODE=google`, tira un error explícito diciendo que se
implementa en `E2-T8`, nunca un fallback silencioso. `MemoryRepo` guarda todo en `Map`s en memoria,
genera ids con `crypto.randomUUID()`, y se siembra con 4 productos de ejemplo en el constructor.

**Files**
- `src/lib/data/schemas.ts` — new
- `src/lib/data/repo.ts` — new
- `src/lib/data/memory-repo.ts` — new
- `src/lib/money.ts` — new
- `src/lib/data/memory-repo.test.ts` — new

**Acceptance**

1. **WHEN** se llama `createProducto` con datos válidos **THE SYSTEM SHALL** devolver un Producto con
   `id` generado, `activo: true` y `creado_en` una fecha ISO válida.
2. **WHEN** se llama `createVenta` con un `producto_id` que no existe en MemoryRepo **THE SYSTEM
   SHALL** rechazar (throw), sin crear la venta.
3. **WHEN** se llama `listProductos()` sin argumentos **THE SYSTEM SHALL** devolver solo productos
   con `activo: true`.
4. **WHEN** `pnpm test src/lib/data` corre **THE SYSTEM SHALL** reportar todos los tests pasando, 0
   fallidos.

**Verify**

```bash
pnpm typecheck
pnpm test src/lib/data
```

**Checkpoint**

```bash
git add -A && git commit -m "E1-T2: capa de datos - schemas, DataRepo, MemoryRepo"
git tag step-02-data-layer
```

### `E1-T3` — Auth: PIN, sesión, middleware

**Depends on:** `E1-T2` · **Priority:** p0

Implementar `session.ts` (cuerpo literal completo en `blueprint.md` §9 Step 3 — copiarlo, incluye
`pinValido` con `timingSafeEqual` sobre hashes SHA-256, nunca una comparación `===` directa).
`/api/auth/route.ts` expone `POST` (login) y `DELETE` (logout) en el mismo archivo. `middleware.ts`
es el único lugar que decide si una request pasa — ninguna page individual repite este chequeo.

**Files**
- `src/lib/auth/session.ts` — new
- `src/lib/auth/session.test.ts` — new
- `src/app/login/page.tsx` — new
- `src/app/api/auth/route.ts` — new
- `src/middleware.ts` — new

**Acceptance**

1. **WHEN** se hace `POST /api/auth` con el PIN correcto **THE SYSTEM SHALL** responder 200 y setear
   una cookie `session` que `sesionValida()` acepta.
2. **WHEN** se hace `POST /api/auth` con un PIN incorrecto **THE SYSTEM SHALL** responder 401 y no
   setear ninguna cookie.
3. **WHEN** se pide `GET /` sin cookie `session` **THE SYSTEM SHALL** redirigir a `/login`.
4. **WHEN** se pide `GET /` con una cookie `session` válida **THE SYSTEM SHALL** responder 200 sin
   redirigir.
5. **WHEN** se hace `DELETE /api/auth` **THE SYSTEM SHALL** invalidar la cookie de forma que el
   próximo `GET /` vuelva a redirigir a `/login`.

**Verify**

```bash
pnpm typecheck
pnpm test src/lib/auth
bash -c 'SHEETS_MODE=memory APP_PIN=2026 SESSION_SECRET=dev-secret-at-least-32-characters-long pnpm start & echo $! > /tmp/server.pid; sleep 2; ok=1; test "$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/)" = 307 || ok=0; curl -s -c /tmp/cookies.txt -o /dev/null -w "%{http_code}" -X POST http://127.0.0.1:3000/api/auth -H "Content-Type: application/json" -d "{\"pin\":\"9999\"}" | grep -q "^401$" || ok=0; curl -s -c /tmp/cookies.txt -o /dev/null -w "%{http_code}" -X POST http://127.0.0.1:3000/api/auth -H "Content-Type: application/json" -d "{\"pin\":\"2026\"}" | grep -q "^200$" || ok=0; test "$(curl -s -b /tmp/cookies.txt -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/)" = 200 || ok=0; kill "$(cat /tmp/server.pid)"; test $ok -eq 1'
```

**Checkpoint**

```bash
git add -A && git commit -m "E1-T3: auth - PIN, sesion firmada, middleware"
git tag step-03-auth
```

### `E1-T4` — CRUD de productos

**Depends on:** `E1-T3` · **Priority:** p0

`producto-form.tsx` es un client component compartido entre alta y edición — campos `tipo` (select),
`color`, `precio_venta`/`costo_tela`/`costo_mano_obra` (texto decimal, convertidos con
`decimalACentavos` al enviar), `stock_actual` (solo en alta; en edición es de solo lectura, el stock
se ajusta únicamente a través de ventas, `E1-T5`). Las Server Actions en `actions.ts` validan con los
esquemas de `E1-T2` antes de tocar `DataRepo`.

**Files**
- `src/app/productos/page.tsx` — new
- `src/app/productos/actions.ts` — new
- `src/app/productos/nuevo/page.tsx` — new
- `src/app/productos/[id]/editar/page.tsx` — new
- `src/components/producto-form.tsx` — new

**Acceptance**

1. **WHEN** se envía el formulario de alta con datos válidos **THE SYSTEM SHALL** crear el producto y
   redirigir a `/productos` mostrándolo en la tabla.
2. **WHEN** se envía el formulario de alta con `color` vacío **THE SYSTEM SHALL** mostrar el error
   bajo el campo y no crear el producto.
3. **WHEN** se desactiva un producto **THE SYSTEM SHALL** dejar de mostrarlo en `/productos` y en el
   selector de `/ventas/nueva`.
4. **WHEN** se edita el precio de un producto **THE SYSTEM SHALL** guardar el nuevo precio sin
   alterar `stock_actual`.

**Verify**

```bash
pnpm typecheck
pnpm lint
pnpm build
```

**Checkpoint**

```bash
git add -A && git commit -m "E1-T4: CRUD de productos"
git tag step-04-productos
```

### `E1-T5` — Registrar venta y descuento de stock

**Depends on:** `E1-T4` · **Priority:** p0

Implementar `decrementarStock` (cuerpo literal completo en `blueprint.md` §9 Step 5 — copiarlo tal
cual: lectura, escritura, re-lectura de verificación, 3 reintentos con backoff de 200ms). La Server
Action `registrarVenta` snapshotea `precio_unitario_centavos` del producto, calcula `total_centavos`,
llama `decrementarStock` **antes** de crear la venta — si el stock falla, no se crea la venta.

**Files**
- `src/lib/data/stock.ts` — new
- `src/lib/data/stock.test.ts` — new
- `src/app/ventas/actions.ts` — new
- `src/app/ventas/nueva/page.tsx` — new
- `src/app/ventas/[id]/page.tsx` — new

**Acceptance**

1. **WHEN** se registra una venta de 2 unidades de un producto con stock 5 **THE SYSTEM SHALL** dejar
   `stock_actual` en 3, verificado leyendo el producto después de la venta.
2. **WHEN** se intenta vender más unidades que el stock disponible **THE SYSTEM SHALL** rechazar con
   "stock insuficiente" y NO crear la venta ni modificar `stock_actual`.
3. **WHEN** se registra una venta **THE SYSTEM SHALL** guardar `precio_unitario_centavos` igual al
   precio del producto en ese momento, y `total_centavos` igual a `cantidad * precio_unitario_centavos`.
4. **WHEN** se cambia el precio de un producto después de una venta ya registrada **THE SYSTEM
   SHALL** dejar `precio_unitario_centavos` de esa venta sin cambios.
5. **WHEN** `pnpm test src/lib/data/stock.test.ts` corre **THE SYSTEM SHALL** reportar 0 fallidos.

**Verify**

```bash
pnpm typecheck
pnpm test src/lib/data/stock.test.ts
pnpm build
```

**Checkpoint**

```bash
git add -A && git commit -m "E1-T5: registrar venta y descuento de stock"
git tag step-05-ventas
```

### `E1-T6` — Gastos (tela, mano de obra, otro)

**Depends on:** `E1-T5` · **Priority:** p1

Formulario corto (categoría, descripción, monto decimal, fecha con default hoy) y una tabla ordenada
por fecha descendente. `Gasto` es un ledger — no hay edición ni borrado, solo alta.

**Files**
- `src/app/gastos/page.tsx` — new
- `src/app/gastos/actions.ts` — new
- `src/app/gastos/nuevo/page.tsx` — new

**Acceptance**

1. **WHEN** se anota un gasto de categoría `tela` con monto válido **THE SYSTEM SHALL** guardarlo y
   mostrarlo primero en `/gastos` (orden por fecha descendente).
2. **WHEN** se envía el formulario con `monto` vacío o no numérico **THE SYSTEM SHALL** mostrar el
   error y no crear el gasto.
3. **WHEN** `pnpm build` corre **THE SYSTEM SHALL** compilar las 3 rutas nuevas sin error.

**Verify**

```bash
pnpm typecheck
pnpm lint
pnpm build
```

**Checkpoint**

```bash
git add -A && git commit -m "E1-T6: gastos (tela, mano de obra, otro)"
git tag step-06-gastos
```

### `E1-T7` — Dashboard y historial de ventas

**Depends on:** `E1-T6` · **Priority:** p0

Implementar `calcularKpis` (cuerpo literal completo en `blueprint.md` §9 Step 7 — copiarlo tal cual:
ventas de hoy/semana/mes, inversión del mes, ganancia del mes, stock bajo con `UMBRAL_STOCK_BAJO=3`).
Reemplazar el placeholder de `page.tsx` (`E1-T1`) por el dashboard real con 4 `KpiCard`. Agregar
`/ventas` como historial (no existía como página propia hasta ahora, solo `/ventas/nueva` y
`/ventas/[id]`).

**Files**
- `src/lib/data/kpis.ts` — new
- `src/lib/data/kpis.test.ts` — new
- `src/app/page.tsx` — edit (reemplaza el placeholder de `E1-T1`)
- `src/app/ventas/page.tsx` — new

**Acceptance**

1. **WHEN** hay ventas registradas hoy por $500 y $300 **THE SYSTEM SHALL** mostrar
   `ventasHoyCentavos` igual a 80000.
2. **WHEN** el stock de un producto activo es 2 y el umbral es 3 **THE SYSTEM SHALL** incluirlo en
   `stockBajo`.
3. **WHEN** un producto está inactivo con `stock_actual` 0 **THE SYSTEM SHALL** NO incluirlo en
   `stockBajo`.
4. **WHEN** `pnpm test src/lib/data/kpis.test.ts` corre **THE SYSTEM SHALL** reportar 0 fallidos.

**Verify**

```bash
pnpm typecheck
pnpm test src/lib/data/kpis.test.ts
pnpm build
```

**Checkpoint**

```bash
git add -A && git commit -m "E1-T7: dashboard y historial de ventas"
git tag step-07-dashboard
```

---

## Epic acceptance

El épico está terminado cuando las 7 tareas están `done` **y**:

1. **WHEN** se completa el flujo entero a mano (login → crear producto → registrar venta → ver el
   dashboard) contra `SHEETS_MODE=memory` **THE SYSTEM SHALL** mostrar el stock descontado y la venta
   reflejada en las cifras del dashboard, sin recargar manualmente ningún dato.
2. **WHEN** se intenta acceder a cualquier ruta protegida sin sesión **THE SYSTEM SHALL** redirigir a
   `/login` en todos los casos, sin excepción.

```bash
pnpm typecheck && pnpm lint && pnpm test
pnpm build
```

Correr desde la raíz del proyecto. Ambos criterios son decidibles con estos comandos más una pasada
manual del flujo (login → producto → venta → dashboard), que es la que el épico 02 automatiza en
`E2-T12`.

## Pitfalls

- **Editar `stock_actual` a mano desde el formulario de edición de producto.** Rompe la garantía de
  `decrementarStock` — el stock solo se toca desde `E1-T5`, nunca desde `E1-T4`.
- **Paginación o caché en las listas.** A este volumen (decenas de filas) es trabajo que nadie pidió
  — ver `knowledge/shapes/internal-tool.md` Pitfalls, "over-designing".
- **Comparar el PIN con `===`.** Rompe la garantía de tiempo constante de `E1-T3` — usar siempre
  `pinValido()`.

## Before moving on

- [ ] Every task in this epic is `done` in `tasks.json` — no task left `in_progress`.
- [ ] Every `verify` command of every task in this epic passed, not just the first one.
- [ ] No `verify` command was edited, and none was skipped because a file it names did not exist.
- [ ] **Every task in this epic has its `checkpoint` tag in version control** — `git tag -l
      'step-0[1-7]-*'` lista 7 tags.
- [ ] Gate command passes clean, run from the project root.
- [ ] Every "Produced" contract above exists with the stated signature.
- [ ] No file outside the subtree was modified.
- [ ] `.env.example` no cambió en este épico — las variables que usa (`APP_PIN`, `SESSION_SECRET`,
      `SHEETS_MODE`) ya estaban desde `workspace/`.
- [ ] One commit per task, each prefixed with its task id, each followed by its checkpoint tag.
