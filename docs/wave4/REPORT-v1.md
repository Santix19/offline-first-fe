# REPORT v1: shell, topbar, entry, base controls

## What changed per file

- `src/app/Shell.tsx`: nav items now carry their Lucide icon (LayoutDashboard, BellRing, Smartphone,
  SlidersHorizontal, Users); passes `rol` and the live state (`connected` from `useLiveEvents`) to
  Layout; unauthorized and finding toasts pass a kind.
- `src/app/Layout.tsx`: ink sidebar rebuilt with the Waves mark in an aquamarine square, icon + label
  nav, aquamarine active pill via the existing `layoutId`, solid critico count pill, and a bottom
  user block (initials avatar on `bg-nav-raised`, name, rol, LogOut icon). Mobile sheet mirrors the
  same look with a blurring scrim and X close. Topbar mounted above `<main>`; route transition,
  stagger and reduced-motion paths untouched.
- `src/app/Topbar.tsx` (new): sticky 56 px `bg-field/80` + `backdrop-blur` bar with hairline bottom,
  mobile menu button, breadcrumb from the route (`La Cocha / Página`, dynamic Estanque/Lote), live
  indicator (pulsing aquamarine dot + "En vivo", gray + "Sin conexión"), and bell linking to
  `/alertas` with a solid critico pending count.
- `src/components/ui/Button.tsx`: primary = aquamarine fill + `text-on-cta` + `hover:bg-cta-hover` +
  `shadow-sm`; secondary = surface + hairline + `shadow-sm` + `hover:bg-surface-2`; quiet = text.
  New optional `icon` (LucideIcon, 16 px, strokeWidth 1.5) with a reserved slot so loading never
  shifts the label. Fixed a real bug found in verification: a caller `className` was overriding the
  variant classes through the prop spread.
- `src/components/ui/Card.tsx`: white `rounded-lg` + `shadow-sm`, optional `icon` in a tinted
  aquamarine square in the header, optional `className`.
- `src/components/ui/Field.tsx` and `Select.tsx`: `rounded-sm`, brand focus ring, critico border on
  error, error line with TriangleAlert.
- `src/components/ui/EmptyState.tsx`: icon in a tinted circle (optional `icon`, Inbox default) +
  sentence + action.
- `src/components/ui/ErrorState.tsx`: TriangleAlert in a critico-tint circle + detalle + Reintentar
  with RefreshCw.
- `src/components/ui/Toast.tsx`: optional `kind` (`info`/`ok`/`advertencia`/`critico`), icon by kind
  in a tinted circle, `rounded-lg` + `shadow-overlay`; existing 6 s / hover-pause / stack behavior
  kept.
- `src/components/ui/ConfirmDialog.tsx`: `rounded-lg` + `shadow-overlay`, TriangleAlert header in a
  critico-tint circle, native dialog behavior and exit timing kept.
- `src/components/ui/SlowServerNotice.tsx`: small spinning RefreshCw with the existing sentence.
- `src/pages/Entrar.tsx`: pond kept, Waves mark above the title, `shadow-overlay` card, aquamarine
  primary, critico-tint error with TriangleAlert. Behavior and login flow unchanged.
- `src/pages/Clave.tsx`: Waves mark header, `shadow-overlay` card, aquamarine primary, critico-tint
  error with TriangleAlert, ok-kind toast on save. Validation and flow unchanged.

## Evidence

Build tail:

```
✓ 2513 modules transformed.
dist/index.html                     0.77 kB │ gzip:   0.43 kB
dist/assets/index-DBV8PW-E.css     37.90 kB │ gzip:   8.21 kB
dist/assets/mock-drnK-JwJ.js      360.52 kB │ gzip:  50.64 kB
dist/assets/index-BhWgNtz3.js   1,021.72 kB │ gzip: 298.79 kB
✓ built in 440ms
```

(The >500 kB chunk notice is Vite's standard warning, not an error.)

Token grep:

```
grep -rnE '#[0-9a-fA-F]{3,6}\b|cubic-bezier|rgb\(' src --include='*.tsx' --include='*.ts'
sin coincidencias
```

Mock-mode check (`VITE_MOCK=1`, dev server on port 5199, stopped afterwards): login, Inicio, Parámetros,
Clave and Kit at 1440 px and 375 px, plus mobile nav sheet, toast, confirm dialog and a form error.
No console or page errors. At 375 px `scrollWidth === clientWidth` (no horizontal page scroll); the
bell goes to `/alertas` and the menu button is present. After the last copy of the files, the built
app was re-checked from `vite preview` (port 5188, stopped afterwards): login and Clave render with
the mark above the title and the primary button computed as `rgb(92, 225, 198)` (the aquamarine token).

## Not done / notes

- `Skeleton.tsx` needed no change: it already uses hairline blocks with the `.shimmer` sweep.
- In mock mode the live indicator correctly reads "Sin conexión" because SSE is disabled outside mock.
- Reduced motion is preserved through the existing presets and `motion-reduce` on the new spinning
  and pulsing bits; I did not run an OS-level reduced-motion browser pass.
- Other pages (Inicio, Alertas, Lote, Estanque, Dispositivos, Parametros, Usuarios, Kit, forms) are
  owned by other briefs; I only consumed them to verify the shared components. In particular, the
  mobile Inicio reading of lotes as 0,0 % comes from that page, not from these files.
