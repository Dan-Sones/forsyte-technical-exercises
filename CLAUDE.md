# CLAUDE.md

pnpm + Turborepo monorepo: `apps/web` (Next.js) and `apps/api` (NestJS). Run an app's scripts from the root with `pnpm --filter <web|api> <script>`.

## Pre-commit hook

Only `apps/web` is gated. The hook is `apps/web/.husky/pre-commit`, and it exits early unless the commit stages something under `apps/web/`. Commits that only touch `apps/api` or root files run no checks.

When it does run, it goes in this order and stops at the first failure:

1. **lint-staged** (`apps/web/.lintstagedrc.json`): `eslint --fix` then `prettier --write` on staged JS/TS files, and `prettier` on all other staged files. Fixes are re-staged automatically.
2. **Typecheck**: `tsc --noEmit` over the whole web project, not just staged files.
3. **Tests**: `vitest run` over the whole web suite.

If a commit is rejected, fix the cause, re-stage, and commit again. The hook is the quality gate, so keep it on (no `--no-verify`).

### How the hook gets installed

Husky lives in `apps/web`, not the root. The web `prepare` script (`cd ../.. && husky apps/web/.husky`) sets git's `core.hooksPath` to `apps/web/.husky/_`, and it runs on `pnpm install`. If commits are skipping the hook, run `pnpm install` and check `git config core.hooksPath`.

## Tooling in `apps/web`

- **Formatting belongs to Prettier** (`.prettierrc`: single quotes, semicolons, ES5 trailing commas, 80 cols). ESLint includes `eslint-config-prettier`, which turns off its style rules, so a formatting complaint means run Prettier, not change ESLint.
- **ESLint** is flat config (`eslint.config.mjs`): Next core-web-vitals and TypeScript presets.
- **Tests** are Vitest with jsdom and React Testing Library, kept in `apps/web/__tests__/`. `pnpm --filter web test` starts **watch mode** and never exits. For a single run, use `pnpm --filter web exec vitest run`, which is what the hook runs.
- To run the full gate by hand before committing:

  ```sh
  pnpm --filter web lint && pnpm --filter web typecheck && pnpm --filter web exec vitest run
  ```

## Design System (apps/web uses @forsyteco/product-ui - source available at: vendor/product-ui)

**Source of truth is the code, not the README.** A read-only clone lives at `vendor/product-ui/`. It is git-excluded, so it exists only in the main checkout, not in worktrees. For each component, read `vendor/product-ui/packages/react/src/<component>/<component>.tsx` for props and `*.stories.tsx` for usage. Exports are listed in `vendor/product-ui/packages/react/src/index.ts`. Keep the version in `apps/web/package.json` equal to the one in `vendor/product-ui/packages/react/package.json`, because the API changed a lot before 0.0.18.

### Wiring the CSS

Already wired in `apps/web/src/app/globals.css`; do not add it again. For reference:

```css
/* product-ui's styles.css already does @import 'tailwindcss', so skip a separate one */
@import "@forsyteco/product-ui/styles.css"; /* tokens, fonts, @theme */
@import "@forsyteco/product-ui/components.css"; /* compiled CSS modules; Button, Input, Card, Listbox... are unstyled without it */
@source '<relative path>/node_modules/@forsyteco/product-ui/dist'; /* from src/app/globals.css: '../../node_modules/...' */
```

Do these imports in CSS. Importing `styles.css` from a `.tsx` file loads only the tokens and fonts.

- **`@source` is required.** Tailwind 4 does not scan `node_modules`. Without it, the components styled with Tailwind classes (Avatar, Select, Switch, Checkbox, Dialog, Tabs, DataTable, PageLayout...) render unstyled.
- The built `dist` has no `'use client'` directives. Import components only from files marked `'use client'`.
- `ThemeProvider` sets `data-colour-mode="light|dark"` and `data-colour-scheme="yellow|blue"` on `<html>`, and writes both to localStorage (`forsyteco-theme-mode`, `forsyteco-theme-colour-scheme`). `defaultMode` is `'system'` unless set, which resolves light/dark from `prefers-color-scheme` on the client. On mount it resets both to its `defaultMode` / `colourScheme` props, so a stored choice does not survive a reload.
- The root layout has no `ThemeProvider`, so `data-colour-mode` is never set and `dark:` classes and the blue scheme have no effect. Wrap the tree in a `ThemeProvider` to enable them.

### Tokens and conventions

- Colour tokens are RGB triplets. In Tailwind, use the semantic utilities (`bg-background`, `text-foreground`, `bg-muted`, `text-muted-foreground`, `border-border`, `bg-accent`, `text-accent-foreground`, `bg-primary`, `bg-card`, `text-destructive`). In raw CSS, write `rgb(var(--accent))`. Form-field tokens (`--field-*`, `--success`) are raw CSS variables only, and `--field-input-border` is a hex value, not a triplet.
- **Dark mode:** `dark:` keys off `[data-colour-mode="dark"]`. The CSS never reads `prefers-color-scheme` or a `.dark` class; only `ThemeProvider` in `system` mode does, by setting the attribute. In dark mode `primary` flips to white and `accent` stays yellow (blue in the blue scheme).
- **The type scale is shifted down one step:** `text-base` is 14px (the body default), `text-sm` 13px, `text-lg` 16px, `text-2xl` 20px, `text-4xl` 31px. Font: Plus Jakarta Sans, via `font-sans`.
- Shape: buttons and inputs use a 10px radius, cards 12px, labels/pills are fully rounded.
- **Overriding CSS-module components needs `!`.** Component CSS is unlayered, so it beats Tailwind's layered utilities. When a component's module already sets a property, `className="bg-muted"` silently does nothing; write `bg-muted!`. This affects the Card padding/background/gap, CardHeader's grid display, and the Textarea/Input/`Combobox.Control` radius, padding, font-size and shadow. `Listbox` puts `className` on an unstyled wrapper, so its trigger cannot be restyled through `className` at all. Tailwind-class components (Avatar, Skeleton, Tabs...) merge `className` normally.
- Watch these names:
  - `Button variant="primary"` (the default) is the **yellow accent** fill (`accent` is identical); `secondary` is the `primary`-token fill, black in light mode and white in dark.
  - `Label` is a pill/badge (`default | primary | secondary | ghost | success | severe | danger`). It is not a form label; for that, use `FormField.Label`.
  - Icon-only buttons take a component: `<Button icon={SendIcon} aria-label="Send" />`.
  - `FormField` is compound: `FormField.Label`, `.Control` (wires `id`/`aria-describedby` onto its child), `.Description`, `.Error`, plus `.LabelRow` / `.LabelActions`.
  - `Combobox` and `Autocomplete` are compound too (`.Root`, `.Label`, `.Control`, `.Input`, `.Options`...).
  - `DatePicker` reports changes through `onValueChange`, not `onChange`.
- **Icons:** the package exports none. Write inline SVG components that take `{ className }` and use `stroke="currentColor"`; that is the shape `Button icon={...}` expects.
- Known rough edges:
  - `DataTable` neither pages, sorts nor filters; feed it the current page and handle `onPageChange` / `onSortChange` / `onFilterChange`. `getRowId` is required.
  - `DataTable` colours come from `DEFAULT_COLOR_CONFIG` (hard-coded hex); pass `colorConfig` for dark mode.
  - The built-in cells need a cast to fit `DataTableColumn<T>['cell']` under `strict`.
  - `CountryCell` and `CountryCombobox` show flags only inside `CountryFlagProvider`.
  - Do not use `Sonner`: the dist bundles its own copy of `sonner` and exports no `toast`, so `toast()` from the `sonner` package never reaches it. Render `Toaster` from `sonner` (a direct dependency of `apps/web`) instead.
  - `DialogPanel`, `DialogTitle` and `DialogDescription` hard-code `bg-white` / `text-gray-*`, and `Tabs` hard-code grays/white; pass token classes for dark mode. `Tab` applies its selected colours conditionally, so override them with `data-selected:bg-background data-selected:text-foreground`.
  - `AvatarFallback variant="boring"` uses a fixed red/blue palette.
  - `Checkbox`'s `size` prop collides with the native `size` attribute in TS.
  - `RelativeTime`'s fallback text uses `toLocaleDateString` and `DateCell` compares against `dayjs()`, so both can differ between server and client; render them after mount.
