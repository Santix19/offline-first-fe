# REPORT m1: shell, overlays, entry screen

All work limited to the files in BRIEF-m1. No new dependencies, no behavior/data/copy changes
beyond the login title structure required by item 5 (see notes).

## Proof

- `npx -y pnpm@10 build` → passes (`tsc -b` + `vite build`, only the pre-existing chunk-size warning).
- `grep -rnE '#[0-9a-fA-F]{3,6}\b|cubic-bezier|rgb\(' src --include='*.tsx' --include='*.ts'` → empty
  (exit 1).
- Mock mode (`VITE_MOCK=1`) driven with Playwright: login → Inicio → Alertas → Dispositivos → mobile
  sheet; zero console/page errors.
- Measured: primary button width 342px before loading and 342px during loading (no jump).
- Reduced motion (`reducedMotion: 'reduce'`): two canvas screenshots 900 ms apart are byte-identical
  (one static pond frame); titles/cards render without transforms.

## DESIGN.md §7 items

1. **Route change** — `src/app/Layout.tsx:190-196`: `AnimatePresence mode="wait" initial={false}` around
   the outlet, keyed by `location.pathname`, with `viewTransition` (`presets.ts:20`). Uses `useOutlet()`
   so the leaving page keeps its own tree during the exit. Reduced: `reducedFade`.
2. **Sidebar / mobile nav** —
   - Active pill: `src/app/Layout.tsx:55-70` (`layoutId="nav-activo"`, `duration.state`, `ease.fluid`),
     inside separate `LayoutGroup`s for desktop (`:100`) and mobile (`:177`) so the two never share a pill.
   - Mobile sheet: `src/app/Layout.tsx:132-190` — scrim fade (`:134`) and sheet slide `x: -100% → 0`
     (`:152-166`, `duration.panel`, `ease.fluid`), both in `AnimatePresence`; closes on navigation via
     `onNavegar` (`:177`). Reduced: opacity-only 120 ms.
   - Alertas count pop: `src/app/Layout.tsx:19-32` (`NavCount`: keyed by count, scale 1.15 → 1 at
     `duration.state`); used in the nav list (`:74`) and the mobile top bar (`:118`). Reduced: no scale.
3. **Page titles** — MaskedText h1 on the two owned pages: `src/pages/Entrar.tsx:45`,
   `src/pages/Clave.tsx:61`. (All other h1s belong to BRIEF-m2/m3 pages.)
4. *(not assigned to m1)*
5. *(not assigned to m1)*
6. *(not assigned to m1)*
7. *(not assigned to m1)*
8. **Overlays** —
   - Toast: `src/components/ui/Toast.tsx:80-91` — `AnimatePresence` + `overlay` preset per toast,
     `layout={!reduce}` so the stack slides when one leaves; timing/hover-pause untouched.
   - ConfirmDialog: `src/components/ui/ConfirmDialog.tsx:22-46, 63-72` — exit is played before the native
     `dialog.close()` (250 ms), panel uses `overlay`, backdrop fades through `backdrop:opacity-0/100`
     (`duration.panel`). Native `<dialog>` + `showModal()` focus trap and Esc preserved (`onCancel`
     prevented, animated out, then closed). Reduced: `reducedFade` + 120 ms.
   - Also fixed the dialog centering (`m-auto`, `:63`): Tailwind preflight's `* { margin: 0 }` was
     beating the UA `dialog { margin: auto }`, so dialogs opened top-left.
9. **Skeleton** — `src/components/ui/Skeleton.tsx:9` uses `.shimmer` on the hairline blocks; the CSS
   already disables the sweep under `prefers-reduced-motion` (`src/index.css:82`).
10. **Entrar (signature)** —
    - `src/motion/Pond.tsx` ports `pond-ref.ts`: Bayer 4×4 dither, 240×140 buffer scaled up with
      `image-rendering: pixelated` (`:194`), time-driven slow roll (`:79`), colors read from
      `--agua-fria` / `--lago-hondo` / `--niebla` (`:65-67`), rAF stopped off-screen
      (`IntersectionObserver`, `:172`) and when the tab is hidden (`visibilitychange`, `:180`).
      Reduced motion paints ONE frame at t=18 s and never starts the loop (`:161-163`).
    - `src/pages/Entrar.tsx:42-51`: full-bleed pond, readable `bg-surface` card, h1 "La Cocha" in
      MaskedText, card in `FadeUp`.
    - `src/pages/Clave.tsx:61,67`: MaskedText h1 + FadeUp card.
11. **Links** — `.link-draw` already exists in `src/index.css:88-94`; there are no text links in the
    files m1 owns, so nothing to apply here. Pages with "Ver todas"/"Ver estanque" links are owned by
    BRIEF-m2/m3.

## Notes / decisions

- **Login title (item 5).** The brief asks for `h1 "La Cocha"` with MaskedText, so the wordmark became
  the h1 and the existing "Entrar" copy is now an `h2` at heading size (`Entrar.tsx:45-46`). Copy is
  unchanged.
- **Login colors.** With the pond behind it, the page field is now the lake (`bg-nav`) and the title /
  lead text use `text-on-nav` / `text-on-nav/80`; the card stays `bg-surface text-ink` so the form is
  fully readable. No raw colors, all tokens.
- **Button loading.** The label keeps its layout box (opacity 0 while loading) and the spinner is an
  absolutely-positioned 16 px ring over it, so the width is identical before/during loading. Press
  scale is `0.97` for 120 ms, skipped under reduced motion (the CSS `active:scale` token remains as the
  instant fallback). One off-token `duration-150` in Button was replaced with
  `duration-[var(--dur-micro)]`.
- **Toast exit while hovering** is unchanged: the 6 s timer still pauses on hover and resumes on leave.
- Temporary Playwright scripts/screenshots used for verification were deleted; no files outside the
  m1 ownership remain modified.

## Not done

- None of the assigned items are missing. Items 4-7 are other agents' pages; item 3 for the other
  pages and item 11 on link-bearing pages are outside these files.
