# Epic 02: Integración real, pulido y despliegue

> Al terminar este épico, la app lee y escribe el Google Sheet real (no solo `MemoryRepo`), comparte
> ventas por WhatsApp, es instalable como PWA, cumple accesibilidad AA básica, tiene 3 tests E2E
> automatizados, loguea errores estructurados, y está desplegada en Vercel respondiendo en producción.

| | |
|---|---|
| **Epic id** | `02-integracion-y-despliegue` |
| **Tasks** | `E2-T8` … `E2-T14` |
| **Depends on** | `01-fundamentos` |
| **Unlocks** | nada — es el último épico |
| **Parallel with** | `E2-T8` (GoogleSheetsRepo) y `E2-T9` (WhatsApp) no comparten archivos y pueden correr en paralelo; el resto es lineal |

You do not need any other file to complete this epic. Everything below is repeated here on purpose.

---

## Stack

Next.js 16.3.0 · TypeScript 7.0.2 · Tailwind CSS 4.3.3 · `googleapis` 174.0.1 (API real de Google
Sheets) · `@ducanh2912/next-pwa` 10.2.9 · `@playwright/test` 1.62.1 · hosting Vercel. Package
manager: `pnpm`. Runtime pinned en `.nvmrc` (24.19.0). Versiones de dependencia están en
`pnpm-lock.yaml` — leerlo, nunca adivinar una.

| Task | Command |
|---|---|
| Dev | `pnpm dev` |
| Typecheck | `pnpm typecheck` |
| Lint | `pnpm lint` |
| Test (un archivo) | `pnpm test src/lib/whatsapp.test.ts` |
| E2E | `pnpm test:e2e` (instalar el browser una vez: `pnpm exec playwright install --with-deps chromium`) |
| Build | `pnpm build` |

**Gate:** `pnpm typecheck && pnpm lint && pnpm test` pasa antes de marcar cualquier tarea de este
épico como hecha.

`E2-T8` (`GoogleSheetsRepo` contra la API real) necesita las credenciales de Google del usuario —
`GOOGLE_SHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` — que no
están provisionadas por el bundle (son del usuario, ver `blueprint.md` §10 *Accounts to create
first*). El resto de la `verify` de esa tarea (typecheck + los mismos tests de `MemoryRepo`) no las
necesita y corre igual sin ellas.

## Directory subtree

Solo las partes que toca este épico:

```
src/
  lib/
    logger.ts                  # NEW E2-T13 — logging estructurado a stdout/stderr
    whatsapp.ts                 # NEW E2-T9
    whatsapp.test.ts            # NEW E2-T9
    env.ts                       # exists (E1-T1) — EDIT E2-T8: agrega validacion condicional de Google
    data/
      repo.ts                    # exists (E1-T2) — EDIT E2-T8: getRepo() instancia GoogleSheetsRepo
      sheets-client.ts            # NEW E2-T8
      google-sheets-repo.ts       # NEW E2-T8
  components/
    compartir-venta-button.tsx  # NEW E2-T9
    producto-form.tsx            # exists (E1-T4) — EDIT E2-T11: labels, aria, foco, tap targets
  app/
    layout.tsx                   # exists (E1-T1) — EDIT E2-T10: metadata de PWA
    offline/page.tsx              # NEW E2-T10
    error.tsx                     # NEW E2-T13
    global-error.tsx              # NEW E2-T13
    login/page.tsx                 # exists (E1-T3) — EDIT E2-T11: accesibilidad
    api/health/route.ts             # exists (E1-T1) — EDIT E2-T13: agrega chequeo de Sheets
    ventas/
      [id]/page.tsx                  # exists (E1-T5) — EDIT E2-T9: agrega CompartirVentaButton
      nueva/page.tsx                  # exists (E1-T5) — EDIT E2-T11: accesibilidad
    gastos/nuevo/page.tsx             # exists (E1-T6) — EDIT E2-T11: accesibilidad
e2e/
  login.spec.ts                 # NEW E2-T12
  registrar-venta.spec.ts        # NEW E2-T12
  compartir-venta.spec.ts        # NEW E2-T12
```

Todo lo que ya está en `workspace/` en la raíz del proyecto sigue igual — `E2-T10` no toca
`next.config.ts` (ya trae la config de `@ducanh2912/next-pwa` desde `workspace/`) ni
`public/manifest.json`/`public/icons/**` (ya están, solo se verifican).

Fuera de este árbol está fuera de alcance. Si una tarea pareciera necesitar editar un archivo no
listado acá, parar y reportarlo.

## Data model touched here

Ninguna entidad nueva — este épico agrega una segunda implementación (`GoogleSheetsRepo`) de las
entidades ya definidas en `01-fundamentos` (`blueprint.md` §4), con el mismo contrato exacto.

## Contracts

**Consumed** — ya existe, no reconstruir:

| From | Interface | Guarantee |
|---|---|---|
| `01-fundamentos` (`E1-T2`) | `DataRepo` (interfaz) | `GoogleSheetsRepo` debe implementarla completa — ningún método opcional ni que tire "not implemented" |
| `01-fundamentos` (`E1-T5`) | `decrementarStock(repo, id, cantidad)` | Sigue siendo el único camino para tocar `stock_actual`, ahora también con `GoogleSheetsRepo` de por medio |
| `01-fundamentos` (`E1-T2`) | `Venta`, `Producto`, `Gasto` (tipos Zod-inferidos) | `mensajeVenta`/`linkWhatsapp` (`E2-T9`) consumen `Venta` tal cual está definida, sin campos nuevos |

**Produced** — nada en este épico expone un contrato nuevo hacia código posterior (es el último
épico); `GoogleSheetsRepo` es un *consumidor* de `DataRepo`, no un productor de una interfaz nueva.

## Conventions that bite in this area

- Todo método nuevo en `GoogleSheetsRepo` tiene su equivalente en `MemoryRepo` — si se agrega uno sin
  el otro, `.claude/rules/data-layer.md` lo marca como defecto.
- `GoogleSheetsRepo` lee/escribe rangos completos y filtra en memoria — nunca intentar una "consulta"
  por celda individual, la API no tiene `WHERE`.
- El link de WhatsApp nunca incluye datos que el cliente no vaya a ver igual en su propio chat — no
  hay tracking ni parámetros ocultos en el link `wa.me`.

Full project rules: `CLAUDE.md`. Area rules: `.claude/rules/data-layer.md`,
`.claude/rules/server-actions-and-forms.md`.

---

## Tasks

Listadas en el mismo orden que `tasks.json`. `E2-T8` y `E2-T9` dependen ambas solo de `E1-T7` y no
comparten archivos — pueden ejecutarse en paralelo; el resto es lineal.

### `E2-T8` — `GoogleSheetsRepo` real

**Depends on:** `E1-T7` · **Priority:** p0

`sheets-client.ts` crea un cliente `sheets_v4.Sheets` autenticado con `google.auth.JWT` (cuenta de
servicio), memoizado a nivel módulo. `google-sheets-repo.ts` implementa `DataRepo` completo sobre los
rangos exactos de `blueprint.md` §4 *Schema* — lecturas con `values.get`, altas con `values.append`,
ediciones puntuales (`updateProducto`) buscando la fila por `id` y escribiendo solo esa fila con
`values.update`, nunca reescribiendo el rango entero. Editar `repo.ts` para que `getRepo()`
instancie `GoogleSheetsRepo` cuando `SHEETS_MODE=google`, y `env.ts` para exigir las 3 variables de
Google solo en ese modo.

**Files**
- `src/lib/data/sheets-client.ts` — new
- `src/lib/data/google-sheets-repo.ts` — new
- `src/lib/data/repo.ts` — edit
- `src/lib/env.ts` — edit

**Acceptance**

1. **WHEN** `SHEETS_MODE=memory` (default) **THE SYSTEM SHALL** arrancar sin pedir ninguna variable
   de Google.
2. **WHEN** `SHEETS_MODE=google` y falta `GOOGLE_SHEET_ID` **THE SYSTEM SHALL** fallar al arrancar
   nombrando la variable faltante.
3. **WHEN** `SHEETS_MODE=google` con credenciales reales y el Sheet compartido con la cuenta de
   servicio **THE SYSTEM SHALL** leer `listProductos()` y devolver las filas reales de la pestaña
   "Productos".
4. **WHEN** se crea un producto con `SHEETS_MODE=google` **THE SYSTEM SHALL** agregar exactamente una
   fila nueva a la pestaña "Productos", sin tocar las filas existentes.

**Verify**

```bash
pnpm typecheck
pnpm test src/lib/data
# manual: requiere credenciales reales de Google, ver blueprint.md Step 8 Verify y Section 20.1 item 14
```

Los criterios 3 y 4 solo son verificables a mano, con las credenciales reales del usuario — no hay
manera de decidirlos en una máquina sin cuenta de Google real, así que el tercer comando de arriba es
un recordatorio, no un gate automático. Los criterios 1 y 2 sí están cubiertos por `pnpm typecheck` +
`pnpm test src/lib/data` (que corren contra `MemoryRepo` y contra la validación de `env.ts`).

**Checkpoint**

```bash
git add -A && git commit -m "E2-T8: GoogleSheetsRepo real"
git tag step-08-sheets-real
```

### `E2-T9` — Compartir venta por WhatsApp

**Depends on:** `E1-T7` · **Priority:** p1

`mensajeVenta`/`linkWhatsapp` (cuerpo literal completo en `blueprint.md` §9 Step 9 — copiarlo tal
cual). El componente usa `navigator.share` si existe (mobile, la ruta principal de uso real) y cae a
abrir `linkWhatsapp` en pestaña nueva si no. Sin número de teléfono del cliente, el link abre el
selector de contactos de WhatsApp con el mensaje ya escrito.

**Files**
- `src/lib/whatsapp.ts` — new
- `src/lib/whatsapp.test.ts` — new
- `src/components/compartir-venta-button.tsx` — new
- `src/app/ventas/[id]/page.tsx` — edit

**Acceptance**

1. **WHEN** se genera el link de una venta sin teléfono de cliente **THE SYSTEM SHALL** producir
   `https://wa.me/?text=...` con el mensaje URL-encoded.
2. **WHEN** se genera el link de una venta con teléfono "11 2345-6789" **THE SYSTEM SHALL** producir
   `https://wa.me/1123456789?text=...`.
3. **WHEN** el mensaje se decodifica **THE SYSTEM SHALL** contener la cantidad, el tipo de producto,
   el color y el total en formato `$XX.XX`.
4. **WHEN** `pnpm test src/lib/whatsapp.test.ts` corre **THE SYSTEM SHALL** reportar 0 fallidos.

**Verify**

```bash
pnpm typecheck
pnpm test src/lib/whatsapp.test.ts
pnpm build
```

**Checkpoint**

```bash
git add -A && git commit -m "E2-T9: compartir venta por WhatsApp"
git tag step-09-whatsapp
```

### `E2-T10` — PWA instalable

**Depends on:** `E2-T9` · **Priority:** p1

`next.config.ts` (ya en `workspace/`) ya configura `@ducanh2912/next-pwa` — esta tarea no lo toca,
solo agrega el `export const metadata` en `layout.tsx` (`manifest: "/manifest.json"`, `themeColor:
"#db2777"`, `appleWebApp`) y una página `/offline` simple. El Verify confirma que el build genera el
service worker y que `public/manifest.json` (ya en `workspace/`) trae los campos que Chrome exige
para el criterio de instalabilidad.

**Files**
- `src/app/layout.tsx` — edit
- `src/app/offline/page.tsx` — new

**Acceptance**

1. **WHEN** `pnpm build` corre en modo producción **THE SYSTEM SHALL** generar `public/sw.js`.
2. **WHEN** `manifest.json` se valida contra su propio JSON **THE SYSTEM SHALL** tener `name`,
   `short_name`, `start_url`, `display: "standalone"`, y al menos un ícono de 192×192 y uno de
   512×512.

**Verify**

```bash
pnpm build
test -f public/sw.js
node -e 'const m = require("./public/manifest.json"); const req = ["name","short_name","start_url","display","icons"]; for (const k of req) if (!(k in m)) process.exit(1); if (!m.icons.some(i => i.sizes === "192x192")) process.exit(1); if (!m.icons.some(i => i.sizes === "512x512")) process.exit(1);'
```

**Checkpoint**

```bash
git add -A && git commit -m "E2-T10: PWA instalable"
git tag step-10-pwa
```

### `E2-T11` — Accesibilidad y pulido mobile

**Depends on:** `E2-T10` · **Priority:** p1

Pasada sobre los 4 formularios existentes: `<label htmlFor>` en cada campo, errores como texto con
`aria-describedby` (nunca solo color), `focus-visible:ring-2` en todo elemento enfocable, botones y
filas clicables con mínimo 44×44px (`min-h-11 min-w-11`). No se crea ningún archivo nuevo — es una
edición sobre lo que ya existe.

**Files**
- `src/components/producto-form.tsx` — edit
- `src/app/ventas/nueva/page.tsx` — edit
- `src/app/gastos/nuevo/page.tsx` — edit
- `src/app/login/page.tsx` — edit

**Acceptance**

1. **WHEN** se navega cualquiera de las 4 pantallas de formulario solo con teclado **THE SYSTEM
   SHALL** permitir completar y enviar el formulario sin usar el mouse.
2. **WHEN** un campo tiene un error de validación **THE SYSTEM SHALL** asociarlo con
   `aria-describedby` y mostrarlo como texto, no solo como borde rojo.
3. **WHEN** se corre el chequeo automático de accesibilidad sobre las 4 pantallas **THE SYSTEM
   SHALL** reportar 0 violaciones critical o serious de axe-core.

**Verify**

```bash
pnpm typecheck
pnpm lint
pnpm build
```

El criterio 3 (axe-core) se ejecuta de verdad recién en `E2-T12`, dentro de los specs E2E — esta
tarea deja el markup listo para esa aserción; no duplicar la instalación de `@axe-core/playwright`
acá.

**Checkpoint**

```bash
git add -A && git commit -m "E2-T11: accesibilidad y pulido mobile"
git tag step-11-a11y
```

### `E2-T12` — Tests E2E de los 3 flujos críticos

**Depends on:** `E2-T11` · **Priority:** p0

Los 3 specs corren contra `SHEETS_MODE=memory` (ver `playwright.config.ts` en `workspace/`, que ya
levanta el server con esas env vars). Cada spec es independiente — ninguno asume el orden de los
otros ni deja estado que el siguiente necesite, porque `MemoryRepo` se resiembra en cada arranque de
server que hace `webServer` de Playwright.

**Files**
- `e2e/login.spec.ts` — new
- `e2e/registrar-venta.spec.ts` — new
- `e2e/compartir-venta.spec.ts` — new

**Acceptance**

1. **WHEN** `pnpm test:e2e` corre contra `SHEETS_MODE=memory` **THE SYSTEM SHALL** reportar 3 specs
   ejecutados, 0 fallidos.
2. **WHEN** el spec de registrar venta corre dos veces seguidas contra un server recién levantado
   **THE SYSTEM SHALL** pasar ambas veces.

**Verify**

```bash
pnpm exec playwright install --with-deps chromium
pnpm test:e2e
```

**Checkpoint**

```bash
git add -A && git commit -m "E2-T12: tests E2E de los 3 flujos criticos"
git tag step-12-e2e
```

### `E2-T13` — Observabilidad y manejo de errores

**Depends on:** `E2-T12` · **Priority:** p1

`logger.ts` emite una línea JSON por evento (`nivel`, `mensaje`, `ts`, metadata) a stdout/stderr —
sin dependencia externa, los logs de Vercel ya la capturan. `error.tsx`/`global-error.tsx` son los
error boundaries de segmento y de layout raíz respectivamente. `api/health/route.ts` (existente)
suma un intento con timeout de 3s de `getRepo().listProductos()`, reportando `"sheets":"up"` o
`"sheets":"down"` sin dejar de responder 200 (el health check de Vercel es sobre el proceso, no sobre
Sheets).

**Files**
- `src/lib/logger.ts` — new
- `src/app/error.tsx` — new
- `src/app/global-error.tsx` — new
- `src/app/api/health/route.ts` — edit

**Acceptance**

1. **WHEN** un componente server tira una excepción no capturada **THE SYSTEM SHALL** mostrar
   `error.tsx` en vez de una pantalla en blanco, y emitir una línea de log con nivel `error`.
2. **WHEN** `GET /api/health` corre con `SHEETS_MODE=google` y credenciales inválidas **THE SYSTEM
   SHALL** seguir respondiendo 200 pero con `"sheets":"down"` en el body.
3. **WHEN** `GET /api/health` corre en condiciones normales **THE SYSTEM SHALL** responder
   `{"ok":true,"sheets":"up"}` en menos de 3 segundos.

**Verify**

```bash
pnpm typecheck
pnpm build
bash -c 'SHEETS_MODE=memory APP_PIN=2026 SESSION_SECRET=dev-secret-at-least-32-characters-long pnpm start & echo $! > /tmp/server.pid; sleep 2; curl -s http://127.0.0.1:3000/api/health | grep -q "\"sheets\":\"up\""; status=$?; kill "$(cat /tmp/server.pid)"; exit $status'
```

**Checkpoint**

```bash
git add -A && git commit -m "E2-T13: observabilidad y manejo de errores"
git tag step-13-observabilidad
```

### `E2-T14` — Deploy a Vercel

**Depends on:** `E2-T8`, `E2-T13` · **Priority:** p0

Sin archivos de aplicación nuevos. Crear el proyecto en Vercel importando el repo de GitHub,
configurar las 6 variables de entorno de producción (`blueprint.md` §10), crear el Google Sheet real
con las 3 pestañas y encabezados exactos de §4, compartirlo con la cuenta de servicio como Editor, y
pushear a `main`.

**Files**

Ninguno — es configuración de infraestructura, no código.

**Acceptance**

1. **WHEN** se pushea a `main` con las env vars de producción configuradas **THE SYSTEM SHALL**
   desplegar y responder 200 en `https://<proyecto>.vercel.app/api/health`.
2. **WHEN** se visita la URL de producción sin cookie de sesión **THE SYSTEM SHALL** redirigir a
   `/login`.
3. **WHEN** se loguea con el PIN de producción y se registra una venta **THE SYSTEM SHALL** reflejar
   la fila nueva en el Google Sheet real.

**Verify**

```bash
pnpm build
# manual: crear el proyecto en Vercel, configurar env vars, pushear a main, y correr:
# test "$(curl -s -o /dev/null -w '%{http_code}' "$VERCEL_DEPLOY_URL/api/health")" = 200
```

Los 3 criterios de aceptación necesitan una cuenta de Vercel y un Google Sheet reales del usuario —
no son decidibles en una máquina sin esas cuentas. `pnpm build` es el único chequeo automático de
esta tarea; el resto es la lista de pasos manuales de `blueprint.md` §10 y §12, ejecutados una sola
vez por el usuario.

**Checkpoint**

```bash
git add -A && git commit -m "E2-T14: deploy a Vercel"
git tag step-14-deploy
```

---

## Epic acceptance

El épico está terminado cuando las 7 tareas están `done` **y**:

1. **WHEN** se registra una venta con `SHEETS_MODE=memory` y se toca "Compartir" **THE SYSTEM
   SHALL** producir un link o llamada a `navigator.share` con el artículo y el precio correctos,
   verificado por `e2e/compartir-venta.spec.ts`.
2. **WHEN** el proyecto se construye para producción **THE SYSTEM SHALL** generar un service worker
   instalable y responder 200 en `/api/health`, ambos sin depender de credenciales de Google.

```bash
pnpm typecheck && pnpm lint && pnpm test
pnpm exec playwright install --with-deps chromium && pnpm test:e2e
pnpm build
```

Correr desde la raíz del proyecto. El deploy real a Vercel (`E2-T14`) y la verificación contra el
Google Sheet real (`E2-T8`, criterios 3-4) quedan fuera de este gate automático por necesitar cuentas
externas — están en la checklist manual de `blueprint.md` §10/§12/§20.1, no bloquean el resto del
build.

## Pitfalls

- **Automatizar `GoogleSheetsRepo` contra la API real en CI.** Necesitaría una cuenta de servicio de
  prueba dedicada — decisión explícita de no hacerlo en v1, ver `blueprint.md` §13 *What is
  deliberately not tested* y Riesgo #3 en §20.2.
- **Duplicar la instalación de axe-core en `E2-T11`.** El chequeo automático vive en los specs de
  `E2-T12`, no antes.
- **Agregar Sentry u otro servicio de error tracking.** Non-Goal explícito a este volumen — ver
  `blueprint.md` §11 *Deliberately not used*.

## Before moving on

- [ ] Every task in this epic is `done` in `tasks.json` — no task left `in_progress`.
- [ ] Every `verify` command of every task in this epic passed, not just the first one.
- [ ] No `verify` command was edited, and none was skipped because a file it names did not exist.
- [ ] **Every task in this epic has its `checkpoint` tag in version control** — `git tag -l
      'step-{08,09,10,11,12,13,14}-*'` lista 7 tags.
- [ ] Gate command passes clean, run from the project root.
- [ ] No file outside the subtree was modified.
- [ ] `.env.example` sigue reflejando las 6 variables reales — no se agregó ninguna nueva en este
      épico.
- [ ] One commit per task, each prefixed with its task id, each followed by its checkpoint tag.
- [ ] El deploy real (`E2-T14`) y la verificación contra el Sheet real (`E2-T8`) están confirmados a
      mano por el usuario — ninguno de los dos lo puede cerrar un builder automático solo.
