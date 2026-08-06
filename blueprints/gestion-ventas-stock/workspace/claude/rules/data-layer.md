---
description: Storage access, the DataRepo interface, and stock-mutation conventions
paths:
  - "src/lib/data/**"
---

- `DataRepo` (`repo.ts`) is an interface, not a class. `MemoryRepo` and `GoogleSheetsRepo` both
  implement it fully — no method is optional or throws "not implemented".
- `getRepo()` reads `process.env.SHEETS_MODE` exactly once, at module load, and memoizes the
  instance. Never call `new GoogleSheetsRepo()` or `new MemoryRepo()` outside `repo.ts`.
- Every entity has an `id` (generated with `crypto.randomUUID()` by the repo, never by the caller)
  and `creado_en` (ISO 8601 UTC string).
- Deletes are soft: set `activo: false` on `Producto`, never remove the Sheet row. `Venta` and
  `Gasto` rows are never deleted, only created — they are a ledger.
- Money fields are integers in cents (`precio_venta_centavos`, `costo_tela_centavos`, …). Convert to
  and from decimal display strings only in `src/app/**` form code, never inside `src/lib/data/**`.
- Stock is only ever changed through `stock.ts`'s `decrementStock()` / `incrementStock()`. Both read
  the current value, write the new one, then re-read to confirm the write landed — Google Sheets has
  no transactions, so this read-write-verify loop (3 attempts, 200ms backoff) is the whole
  concurrency story. Do not "simplify" it to a single write.
- `GoogleSheetsRepo` reads and writes whole sheet ranges (e.g. `Productos!A2:H`) and filters/maps in
  memory. Do not attempt per-cell queries — the API has no `WHERE` clause.
- A method on `GoogleSheetsRepo` that touches the Sheets API always has an equivalent, behaviorally
  identical method on `MemoryRepo`. If you add one, add both in the same commit.
