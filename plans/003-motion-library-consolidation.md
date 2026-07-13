# 003 — Consolidate on `motion/react`, drop the redundant `framer-motion` dependency

- **Status**: TODO
- **Commit**: 6699c06
- **Severity**: LOW
- **Category**: Cohesion · Dependency hygiene
- **Estimated scope**: 6-7 source files (import lines only) + `package.json` + lockfile

## ⚠️ Read first: this is NOT a performance fix

The original audit finding claimed `framer-motion` and `motion` were two copies of the same library, both bundled, costing **~45 KB gz shipped twice**.

**That claim is false and has been retracted.** Verified against the lockfile and `node_modules`:

- `motion@12.42.2` **declares `framer-motion@^12.42.2` as its own dependency** (`package-lock.json`, `node_modules/motion` entry). It is a thin re-export wrapper.
- `node_modules` contains **exactly one** `framer-motion` directory — hoisted, version `12.42.2`. There are no nested copies.
- Both import styles therefore resolve to **the same module instance**. npm has already deduped them.

**Expected bundle delta from this plan: approximately zero.** Do not claim, promise, or report a size win. If a build measurement shows one, it is tree-shaking variance or noise — investigate it, do not celebrate it. Any performance claim must be backed by a measurement (see §7); none is asserted here.

### What is still genuinely worth fixing

1. **Two import styles for one library is a cohesion defect.** Seven files import from `framer-motion`, six from `motion/react`. A future contributor will reasonably assume these are different libraries and may reach for — or install — the wrong one.
2. **`framer-motion` is a redundant *direct* dependency.** It is already supplied transitively by `motion`. Worse, `package.json` pins it at `^12.38.0` — a **lower floor** than `motion` itself requires (`^12.42.2`), so the manifest describes a state that can never actually occur.
3. **`framer-motion` is the deprecated name.** Upstream renamed the package to `motion`; new APIs land under `motion/react`. Standardising now avoids a forced migration later.

This is hygiene. Schedule it **last**, after the two plans with real user-visible impact.

## 1. Goal

Every source file imports motion primitives from `motion/react`. `framer-motion` no longer appears in `package.json`. **Runtime behaviour is byte-for-byte identical.**

## 2. Current behavior

The app works correctly. There is no bug, no dropped frame, and no user-facing symptom. Seven files import from `framer-motion` and six from `motion/react`; both paths reach the same code. This plan changes nothing a user can perceive.

## 3. Verified evidence from code

**Single copy on disk** — a recursive search of `node_modules` for directories named `framer-motion` returns exactly one result:

```
node_modules\framer-motion          → framer-motion@12.42.2
node_modules\motion                 → motion@12.42.2
```

**`motion` depends on `framer-motion`** — from `package-lock.json`, the `node_modules/motion` entry:

```json
"node_modules/motion": {
  "version": "12.42.2",
  "dependencies": {
    "framer-motion": "^12.42.2",
    "tslib": "^2.4.0"
  }
}
```

**The manifest declares both** — `package.json`:

```json
"framer-motion": "^12.38.0",     ← line 30, to be deleted
"motion": "^12.42.2",            ← line 33, stays
```

## 4. Files affected

### The 7 files currently importing `framer-motion`

| # | File | Line | Current import |
|---|------|------|----------------|
| 1 | `components/whatsapp-widget.tsx` | 3 | `import { motion } from "framer-motion"` |
| 2 | `components/ui/dock-two.tsx` | 3 | `import { motion, useReducedMotion, type Easing } from "framer-motion"` |
| 3 | `components/ui/floating-dock.tsx` | 12 | `} from "framer-motion"` *(multi-line import — see Step 2)* |
| 4 | `components/ui/glow-horizon.tsx` | 3 | `import { motion } from "framer-motion";` |
| 5 | `components/ui/glow-horizon-utils/animated-title-fm.tsx` | 3 | `import { motion } from "framer-motion";` |
| 6 | `components/ui/hero-interactive-demo.tsx` | 4 | `import { motion, AnimatePresence } from "framer-motion";` |
| 7 | `components/ui/hero-product-reveal.tsx` | 4 | `import { motion, useInView } from "framer-motion";` |

> **⚠️ Dependency on plan 001.** `plans/001-whatsapp-widget-transform-animation.md` rewrites `components/whatsapp-widget.tsx` to pure CSS, **removing its motion import entirely**. If 001 has already run — and it should have, it is first in the recommended order — **file #1 above will not exist as a `framer-motion` importer.** Verify with grep; do not assume. Skip it if the import is gone. This is why 001 runs first: it shrinks this plan's surface from 7 files to 6.

### The manifest

- `package.json:30` — the line to delete.

### The 6 files already on `motion/react` — DO NOT TOUCH

Listed only so you don't "fix" what is already correct:

`components/ui/animated-list.tsx:9` · `components/ui/border-beam.tsx:3` · `components/ui/dock.tsx:11-12` · `components/ui/elastic-slider.tsx:9` · `components/ui/number-ticker.tsx:4` · `components/ui/pricing-cards.tsx:5`

### Explicitly NOT in scope

- `component-raw.txt` (lines 145, 309, 335) — a stray scratch file at the repo root, **not compiled**. Leave it. (It probably should be deleted; that is not this plan's job.)
- `CLAUDE.md.bak:113` and `CLAUDE.md.pre-ruflo:156` — backup files. Do not edit.
- `app/globals.css:2133` — a code comment mentioning framer-motion. Leave it.

## 5. Exact implementation steps

The named imports **do not change**. `motion`, `AnimatePresence`, `useInView`, `useReducedMotion` and the `Easing` type are all exported from `motion/react` under identical names with identical signatures. Only the module specifier changes.

### Step 1 — Rewrite the 6 single-line imports

Change only the string after `from`. **Preserve each file's existing quote style and its presence or absence of a trailing semicolon** — this repo is inconsistent and you must match what is already there, not normalise it.

| File | New line |
|---|---|
| `components/whatsapp-widget.tsx:3` *(skip if 001 already removed it)* | `import { motion } from "motion/react"` |
| `components/ui/dock-two.tsx:3` | `import { motion, useReducedMotion, type Easing } from "motion/react"` |
| `components/ui/glow-horizon.tsx:3` | `import { motion } from "motion/react";` |
| `components/ui/glow-horizon-utils/animated-title-fm.tsx:3` | `import { motion } from "motion/react";` |
| `components/ui/hero-interactive-demo.tsx:4` | `import { motion, AnimatePresence } from "motion/react";` |
| `components/ui/hero-product-reveal.tsx:4` | `import { motion, useInView } from "motion/react";` |

### Step 2 — Rewrite the multi-line import in `components/ui/floating-dock.tsx`

This import spans several lines and closes at **line 12** with `} from "framer-motion"`. Change **only that closing line**:

```tsx
} from "motion/react"
```

Do not touch the named bindings on the lines above it.

### Step 3 — Delete `package.json:30`

Remove the entire line:

```json
"framer-motion": "^12.38.0",
```

Leave `"motion": "^12.42.2",` (line 33) in place. Ensure the JSON stays valid — no dangling trailing comma, no missing comma introduced.

### Step 4 — Regenerate the lockfile

```bash
npm install
```

**`framer-motion` will remain in `node_modules` and in `package-lock.json`. That is correct and expected** — `motion` still depends on it transitively. What must disappear is only the **top-level entry under `"dependencies"`** in the lockfile (around line 29). Do not try to force `framer-motion` out of the tree; it belongs there.

### Repo conventions

- Exemplar of the correct form, already in the repo — `components/ui/pricing-cards.tsx:5`:
  ```tsx
  import { motion, AnimatePresence } from "motion/react";
  ```

## 6. Risks

- **The specifier must be exactly `motion/react`.** `"motion"` (without `/react`) also resolves and may even typecheck in some configurations, but it pulls the **vanilla-JS API instead of the React one**. This is the single most likely way to break this plan, and it can fail silently at build time and loudly at runtime. Double-check every one of the six lines.
- **API surface.** If any file uses something exported by `framer-motion` but not re-exported by `motion/react`, the build fails at typecheck. Unlikely — all seven files use only `motion`, `AnimatePresence`, `useInView`, `useReducedMotion`, `Easing` — and a typecheck failure is a loud, safe failure mode. **If it happens: STOP and report. Do not improvise a shim or a re-export.**
- **Build caching can mask a bad import.** Run the build clean (`rm -rf .next`) before trusting a green result.
- **No runtime risk beyond the above.** Same module, same code, same behaviour.

## 7. Validation checklist

### Mechanical

```bash
cd "C:\Users\DELL\Downloads\design_handoff_ledger\ledger"
npx tsc --noEmit     # expect: exit 0
npx next build       # expect: exit 0
```

Must return **no matches** outside `node_modules/`, `component-raw.txt`, and the `CLAUDE.md.*` backups:

```bash
grep -rn "from \"framer-motion\"\|from 'framer-motion'" --include=*.tsx --include=*.ts .
```

Must return **no match**:

```bash
grep -n "\"framer-motion\"" package.json
```

Must **still** return a match (it is a legitimate transitive dep):

```bash
grep -n "framer-motion" package-lock.json
```

### Bundle measurement — to confirm nothing regressed, not to show a win

**Before** (clean tree at commit 6699c06):

```bash
rm -rf .next
npx next build 2>&1 | tee /tmp/build-before.txt
```

Record the **First Load JS** figure for: `/` (landing), `/dashboard`, `/pricing`, and one tool page (e.g. `/tools/flashcards`).

**After** (steps 1-4 complete):

```bash
rm -rf .next
npx next build 2>&1 | tee /tmp/build-after.txt
```

Record the same four numbers.

**Acceptance: each route within ±2 KB of its before value.**

- A meaningful **increase** means something went wrong — stop and investigate.
- A meaningful **decrease** contradicts the lockfile evidence in §3. **Report it as an anomaly; do not claim it as a win** until you can explain it.

### Runtime — exercise every changed component by hand

A broken import surfaces as a blank region or a hard crash, not a subtle wobble. Check each:

- [ ] **Landing `/`** — the glow-horizon hero renders and animates; the animated title renders; `hero-interactive-demo` plays through its steps; `hero-product-reveal` fires on scroll into view.
- [ ] **WhatsApp widget** — visible bottom-right on every page (it is mounted in the root layout, `app/layout.tsx:238`); hover reveals the label; press gives feedback. *(If 001 ran first, this component no longer uses the library — just confirm it still works.)*
- [ ] **`dock-two` / `floating-dock`** — nav dock renders; hover magnification works; press feedback works; the "more" toggle rotates.
- [ ] **`/pricing`** — the monthly/yearly toggle animates the price. *(Control: this file was already on `motion/react`. If it breaks, something global went wrong.)*
- [ ] **`/dashboard`** — live activity card and number tickers still animate. *(Second control, same reasoning.)*
- [ ] No new errors in the browser console on any of the above.

### Accessibility

- [ ] `components/ui/dock-two.tsx` still calls `useReducedMotion()` and still branches on it. This is the **only** component in the codebase that respects reduced motion via JS — do not let the import swap break it.
- [ ] DevTools → Rendering → **Emulate `prefers-reduced-motion: reduce`** and confirm the dock's behaviour is unchanged from before this plan.

### Feel check

- [ ] Motion is **indistinguishable** from before. This plan changes no curve, no duration, no spring, no delay. **If anything looks or feels different, an import was changed incorrectly — revert and investigate.** "It feels slightly different" is a failure, not a success.

## 8. Rollback strategy

```bash
git checkout -- package.json package-lock.json components/
npm install
```

Because `framer-motion` remains in the dependency tree via `motion` regardless of this plan, rollback cannot leave the tree in a broken intermediate state. No data, schema, or deploy risk. Entirely reversible.

**Cross-plan note:** if plan 001 has already run, `components/whatsapp-widget.tsx` no longer imports any motion library. A blanket `git checkout -- components/` would revert **001 as well**. Roll back selectively:

```bash
git checkout -- package.json package-lock.json \
  components/ui/dock-two.tsx components/ui/floating-dock.tsx \
  components/ui/glow-horizon.tsx components/ui/glow-horizon-utils/animated-title-fm.tsx \
  components/ui/hero-interactive-demo.tsx components/ui/hero-product-reveal.tsx
npm install
```

## 9. Definition of Done

- All source files import from `motion/react`; **zero** source files import from `"framer-motion"` (excluding `component-raw.txt` and the `CLAUDE.md.*` backups, which are out of scope).
- Every changed specifier is exactly `motion/react` — **not** `motion`.
- `"framer-motion"` no longer appears under `dependencies` in `package.json`.
- `framer-motion` **does** still appear in `package-lock.json` as a transitive dependency of `motion`. This is correct — do not remove it.
- `npx tsc --noEmit` and `npx next build` both exit 0.
- Measured First Load JS on `/`, `/dashboard`, `/pricing` and one tool page is **within ±2 KB** of the pre-change build, with both builds' figures recorded.
- **No performance win is claimed or reported.**
- All changed components render and animate identically to before.
- `dock-two`'s `useReducedMotion()` branch still works.
- No visual or behavioural change is perceptible anywhere in the app.
