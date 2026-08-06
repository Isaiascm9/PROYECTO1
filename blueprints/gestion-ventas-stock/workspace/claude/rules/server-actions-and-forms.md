---
description: Server Action, form, and route conventions for the app surface
paths:
  - "src/app/**/actions.ts"
  - "src/app/**/*.tsx"
---

- Every Server Action's first line parses `FormData` with the matching schema from
  `src/lib/data/schemas.ts`. On failure, return `{ ok: false, error }` — never throw across the
  server/client boundary, the client can't render a thrown error nicely.
- Forms use native `<form action={...}>` with Server Actions, not `onSubmit` + `fetch`. Progressive
  enhancement matters here — this is a PWA used on patchy mobile data.
- Every route outside `/login` and `/api/auth/login` is protected by `middleware.ts`. Do not add
  per-page auth checks — the middleware is the single choke point.
- Every list page (`/productos`, `/ventas`, `/gastos`) renders explicit loading, empty, and error
  states — never a bare blank screen while data loads.
- Money is entered and displayed as a decimal string (`"12.50"`) and converted to/from centavos at
  the very edge of the form handler, using `src/lib/money.ts`. Nothing in `src/app/**` does raw
  `Math.round(x * 100)` inline.
- Tap targets (buttons, list rows that navigate) are at least 44×44px — this app is used one-handed,
  standing at a table with fabric in the other hand.
