---
name: agregar-recurso-sheets
description: Use when adding a new entity/tab backed by Google Sheets (e.g. a new "Clientes" sheet) or a new field on an existing one (Producto, Venta, Gasto). Covers updating both DataRepo implementations, the Zod schema, and the manual Sheet setup step.
---

# Agregar un recurso respaldado por Google Sheets

## When to use
Adding a new entity that needs its own Sheet tab, or a new field on `Producto`, `Venta`, or `Gasto`.

## Steps
1. Add/extend the Zod schema in `src/lib/data/schemas.ts`. Infer the TypeScript type from it —
   never hand-write a duplicate interface.
2. Add the method to the `DataRepo` interface in `repo.ts`.
3. Implement it in `MemoryRepo` first (`memory-repo.ts`) — it's the fast feedback loop and what the
   unit tests run against.
4. Implement it in `GoogleSheetsRepo` (`google-sheets-repo.ts`): add the column(s) to the range
   constant at the top of the file, keep the column order identical to the sheet's header row.
5. If it's a new entity: document the new tab name and its header row in this project's
   `CLAUDE.md` Environment section and tell the user to add the tab to their live Sheet with that
   exact header row, in that exact order.
6. Write a unit test in `*.test.ts` against `MemoryRepo` that exercises the new method.

## Verify
```bash
pnpm typecheck && pnpm test src/lib/data   # expect: exit 0, new test passing
```

## Do not
- Do not add a field to `GoogleSheetsRepo`'s range without updating `MemoryRepo` identically — a
  behavior that only exists in one implementation is a bug the other mode won't catch.
- Do not invent a column order for the live Sheet — state it explicitly and tell the user to match
  it, or every existing row misreads.
