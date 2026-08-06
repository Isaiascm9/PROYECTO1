---
name: release
description: Use when the user asks to ship/deploy the current state of the app, or says "release", "deploy", "súbelo", "publícalo". Runs the full gate, then pushes to main so Vercel's GitHub integration deploys it.
---

# Release

## When to use
The user asks to deploy, ship, or publish the current state of the app to production.

## Steps
1. Run the full gate locally first — never push on a red gate.
2. Confirm the working tree is clean (`git status --porcelain` empty) except intended changes.
3. Push to `main`. Vercel's GitHub integration builds and deploys automatically — there is no
   separate deploy command.
4. Report the deployment URL from Vercel's dashboard/CLI output, and remind the user which env vars
   (if any new ones were added this session) still need to be set in the Vercel project settings.

## Verify
```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build   # expect: exit 0 on all four
git status --porcelain                                    # expect: empty (or only intended changes)
```

## Do not
- Do not force-push `main`.
- Do not push with a failing `pnpm build` — Vercel will fail the same way, just slower and in public.
- Do not commit `.env` or paste a real `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` into a commit message.
