# design-sync notes — VZN

Repo-specific gotchas for future syncs. Read this before re-running.

## This is an app repo, not a design-system package

VZN is `private: true` with no `main`/`module`/`exports`, and `npm run build`
emits a bundled SPA rather than a component library. Two consequences:

- **`node_modules/vzn` does not exist**, so the converter's default
  `PKG_DIR = node_modules/<pkg>` crashes with `ENOENT … node_modules/vzn/package.json`
  before it does anything. **Always pass `--entry`** — the converter then walks
  up from the entry to the nearest named `package.json`, which lands on the repo
  root, which is correct.
- **`src/components/ui/index.ts` is the entry** and therefore IS the published
  component surface. It was added for this purpose. Adding a primitive to that
  barrel publishes it to the design system; leaving one out keeps it internal.

The full build command:

```sh
npm run build                                   # refresh the compiled CSS first (see below)
cp dist/assets/index-*.css .design-sync/.cache/vzn-compiled.css
node .ds-sync/package-build.mjs --config .design-sync/config.json \
  --node-modules ./node_modules --entry ./src/components/ui/index.ts --out ./ds-bundle
```

## The converter's tsconfig parser corrupts `tsconfig.app.json` — do not point at it

`cfg.tsconfig` must stay `.design-sync/tsconfig.paths.json`. Do not "simplify"
it back to `tsconfig.app.json`.

`lib/bundle.mjs`'s `tsconfigPathsPlugin` strips comments with a regex that does
not understand strings. In `tsconfig.app.json` the `/*` inside the `"@/*"` path
alias opens a phantom block comment, which then closes on the `*/` inside the
`"src/**/*.test.ts"` exclude glob. `JSON.parse` throws, the `catch` returns
`null`, and **the plugin silently does not load** — every `@/…` import then
fails to resolve with `[UNRESOLVED_IMPORT] @/lib/utils` and no mention of
tsconfig anywhere in the log. `.design-sync/tsconfig.paths.json` exists solely
to carry `baseUrl` + `paths` with no `*/` sequence anywhere in the file.

## The stylesheet only contains utilities the app already uses

`src/styles/index.css` uses `@import 'tailwindcss' source(none)` plus two
explicit `@source` lines, so the compiled CSS carries **only** the utilities
VZN itself uses. Authored previews are bounded by that same vocabulary: a class
like `ml-1.5` or `text-[28px]` looks valid, does not exist, and silently does
nothing. Three such classes shipped blank spacing on the first authoring pass.

Before rebuilding after preview edits, check every class against the built CSS.
This catches it in seconds:

```sh
# for each className token in .design-sync/previews/*.tsx, assert the escaped
# selector (".text-\[13px\]") appears in ds-bundle/_ds_bundle.css
```

Known-present layout utilities: `flex` `flex-1` `flex-row` `flex-wrap`
`items-center` `items-baseline` `justify-between` `gap-1` `gap-1.5` `gap-2`
`gap-2.5` `gap-3` `gap-4` `space-y-1.5` … `space-y-5`. Base text sizes are
`text-[11px]`–`text-[17px]`, then `22/26/30/34/56`. Note `text-[18px]` exists
ONLY as an `lg:` variant, not as a base utility.

Also: several tokens have no matching utility because the app never uses them
(`--r-xs`, `--r-xl`, `--ease-in-out`, `--ease-spring`). Use the raw token in an
inline style; there is no `rounded-xl` or `ease-pop` class.

## cssEntry is a build artifact copy

`cfg.cssEntry` points at `.design-sync/.cache/vzn-compiled.css`, which is a copy
of `dist/assets/index-<hash>.css`. The hash changes every build, hence the copy.
`.cache/` is gitignored, so **a fresh clone must run `npm run build` and re-copy
before the converter will find a stylesheet** — otherwise `cfg.cssEntry` skips
with `! cssEntry: … not found` and every preview renders unstyled.

## Environment

- Playwright + chromium were installed into `.ds-sync/node_modules` for the
  render check. `.ds-sync/` is gitignored, so a fresh clone re-installs.
- macOS, no ImageMagick/ffmpeg. Not needed by design-sync.

## Known render warns

None. The final run was `8/8 previews render cleanly` with zero warn lines —
so on a re-sync, **any** warn line is new and should be looked at.

## Re-sync risks

- **The compiled CSS is regenerated, not committed.** If a re-sync runs without
  `npm run build` + the copy step, previews lose all styling. This is the most
  likely way a future sync silently degrades.
- **The Tailwind vocabulary can shrink.** If the app stops using a utility that
  a preview depends on, that preview loses the style with no error — the class
  just stops existing. Re-run the class check after any significant app CSS
  churn, not only after preview edits.
- **`src/components/ui/index.ts` is load-bearing** for the sync, but nothing in
  the app imports through it. A cleanup that deletes it as "unused" breaks the
  sync entirely.
- **Preview content is hand-written, not derived.** The numbers in the previews
  (1,840 / 2,000 kcal, 148 / 180 g protein) are plausible fixtures, not real
  data — they will not drift, but they also will not follow goal changes.
- **`conventions.md` enumerates real class and token names.** If the palette or
  the `@theme` mapping changes, re-validate every name in it against the fresh
  build before uploading; a header naming things that no longer exist is worse
  than no header.
