# Decisions

One short entry per technical decision: what, why, alternatives considered.

## 2026-11-21 — ESLint flat config needs a compatibility bridge

**What:** added `@eslint/eslintrc` as a dev dependency and used its `FlatCompat`
helper in `eslint.config.mjs` to load `eslint-config-next`.

**Why:** ESLint 9 (what we installed) uses the new "flat config" format
(`eslint.config.mjs`, an array of config objects). `eslint-config-next@15.5.29`
is still published in the old "eslintrc" format (`module.exports = { extends: [...] }`).
They don't talk to each other without a bridge. `FlatCompat` is ESLint's own
official adapter for exactly this situation.

**Alternatives considered:**
- Downgrade to ESLint 8 — rejected: ESLint 8 is end-of-life, not something to
  build a new project on.
- Hand-write a flat config directly with `typescript-eslint`, skip
  `eslint-config-next` entirely — rejected for the skeleton: more dependencies
  and config to own ourselves, and we'd lose Next-specific rules (e.g. around
  `<img>` usage, the `next/navigation` APIs) that `eslint-config-next`
  maintains for us. Worth reconsidering only if `eslint-config-next` is still
  stuck on the old format long after the rest of the ecosystem has moved.

**Where:** `eslint.config.mjs`, `package.json` (`@eslint/eslintrc`).

## 2026-11-21 — `pnpm lint` calls `eslint` directly, not `next lint`

**What:** the `lint` script in `package.json` runs `eslint .` instead of `next lint`.

**Why:** running `next lint` printed its own deprecation notice ("next lint is
deprecated and will be removed in Next.js 16") and then crashed outright
because no `app/` or `pages/` directory existed yet. Since our
`eslint.config.mjs` already loads the real Next.js rules (via the
`FlatCompat` bridge above), `next lint` was just an extra, soon-to-be-removed
wrapper around the same config. Calling `eslint .` directly is simpler (one
fewer layer) and doesn't crash on a missing `app/` directory — it only prints
a one-line notice from the `no-html-link-for-pages` rule, and exits 0.

**Alternatives considered:**
- Keep `next lint` for now — rejected: it's actively deprecated in the
  version we installed, and the replacement is strictly simpler, not a
  workaround.
- Run the suggested codemod (`next-lint-to-eslint-cli`) — rejected: it edits
  files automatically ("magic," per CLAUDE.md section 2); the manual change
  was one line and easy to understand without it.

**Where:** `package.json` (`lint` script).

## 2026-11-22 — ESLint flat config needs its own `ignores`, separate from `.gitignore`

**What:** added an `ignores` entry to `eslint.config.mjs` for `.next/`,
`node_modules/`, `out/`, `coverage/`, `next-env.d.ts`.

**Why:** after running `pnpm dev` for the first time, `.next/` existed on
disk, and `pnpm lint` started reporting dozens of errors inside
`.next/server/**.js` — compiled webpack output, not our code. ESLint 9's
flat config format does not read `.gitignore` automatically (the old
eslintrc format effectively did, via `.eslintignore` conventions); each
flat config needs its own `ignores` array, or it lints whatever `eslint .`
finds, build artifacts included.

**Alternatives considered:**
- Rely on `.gitignore` alone — rejected: proven wrong by the actual error
  output above; flat config simply doesn't look at it.
- `node_modules` is ignored by ESLint's own built-in defaults even in flat
  config, so that entry is technically redundant — kept anyway for
  clarity, since it costs nothing and matches `.gitignore`.

A second pass turned up `next-env.d.ts` too: Next.js auto-generates this file
on every `dev`/`build`, and it always contains a triple-slash reference that
trips `@typescript-eslint/triple-slash-reference`. It's already in
`.gitignore` for the same reason (we didn't write it); added to the ESLint
`ignores` list as well.

**Where:** `eslint.config.mjs`.
