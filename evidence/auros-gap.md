# Auros gap: spec vs panel (2026-11-08)
Decisions I will respect: mode RECREATE style, PRESERVE behavior; tokens `src/styles/tokens.css`; DM Sans 400/500; easings/durations in tokens+`src/motion/presets.ts`; aurora gradient only on primary buttons, lavender only big stats; copy Spanish; do-not-touch api/mocks/routing/data/deps/backend/la-cocha/skills; test `pnpm build` + `pnpm lint` + detect + Playwright.

| # | Spec item | Current (file:line) | Status |
|---|---|---|---|
| 1 | Canvas abyss `#012624` | `tokens.css:18` niebla light | DONE |
| 2 | Recessed deep `#011d1c` | no token | DONE |
| 3 | Raised kelp `#003734` cards | `tokens.css:19` papel white cards, `Card.tsx:14` | DONE |
| 4 | Mist `#edfffe` emphasis text | no token | DONE |
| 5 | Platinum `#ffffff` headings/nav | `tokens.css:47` on-nav only; body ink dark `tokens.css:23` | DONE |
| 6 | Silver mist `#bbc7c6` body/secondary | `tokens.css:24-25` tinta-2/3 dark | DONE |
| 7 | Lavender `#fde9ff` big stats only | `Stat.tsx:17` text-ink; `KpiTile.tsx:74` white | DONE |
| 8 | Aurora gradient primary CTA only (`#cbfffc→#edfffe→#fffdfa→#fad1ff`, dark `#222` label) | `Button.tsx:37` flat `bg-cta #5ce1c6` | DONE |
| 9 | Bioluminescent teal→aqua accent | no token | DONE |
| 10 | DM Sans 400/500 (Matter substitute), headings 500 only | `tokens.css:77-81` Bricolage 800 + Plex; `index.html:10` | DONE |
| 11 | Uppercase tracked labels 10/12px 0.12-0.15em, 20px 0.08em | `DESIGN.md:91` no uppercase eyebrows | DONE |
| 12 | Display 61/96 lh 1.0 track -0.04em; body 16/1.4 | `tokens.css:84-92` v2 scale | DONE |
| 13 | Radii 16 cards / 6 small+buttons | `tokens.css:108-110` 10/8/pill | DONE |
| 14 | No shadows, depth via teal stack | `tokens.css:72-74` shadows; `shadow-*` in `Card.tsx:14` `Button.tsx:37-38` `ChartCard.tsx:43` `Layout.tsx:206` pages | DONE |
| 15 | Border `rgba(255,255,255,0.1)` / `#707777` | `tokens.css:21-22` orilla light | DONE |
| 16 | Surface card kelp 16px pad 36, no border | `Card.tsx:14` white+shadow | DONE |
| 17 | Recessed deep panel 16px | none | DONE |
| 18 | Ghost nav: uppercase 12px 0.12em, white active / silver inactive, transparent | `Layout.tsx:76-107` sentence-case, aqua pill fill | DONE |
| 19 | Gradient pill button 6px dark label | `Button.tsx:37` flat aqua | DONE |
| 20 | Arrow icon btn 32px 6px `rgba(3,81,75,.5)` white arrow | none (text links `DataTable.tsx:80`) | DONE |
| 21 | Eyebrow label above headings | none | DONE |
| 22 | Stat counter lavender number + 13px uppercase mist/silver label | `Stat.tsx:17` ink number, sentence label | DONE |
| 23 | Thin transparent header ~80px, logo left links center CTA right | `Topbar.tsx:30` sticky 56px light blur + `Layout.tsx:172` fixed sidebar | DONE |
| 24 | Status critico/advertencia/ok keep meaning, retuned solid, label contrast ≥4.5 | `tokens.css:54-56` light-tuned solids | DONE |
| 25 | Charts via tokens, solid fills, bright on dark | `tokens.css:60-64` light-tuned series; `axis.ts` grid colors | DONE |
| 26 | No color outside teal/silver/lavender (+status/chart meaning) | `tokens.css:17` trucha coral identity, `status-info` blue | DONE |
| 27 | CALM dashboard, presets kept, transform/opacity only, reduced motion | `presets.ts:1-45` ok; motion stays | MATCH |
| 28 | No purple/blue AI gradient, no Inter default, no glass except topbar | `Topbar.tsx:29` glass ok; fonts Plex/Bricolage to swap | DONE |
| 29 | Every page `src/pages/*` + `src/components/ui/*` + `src/app/*` restyled | v2 light styles everywhere | DONE |
| 30 | DESIGN.md top section "Visual v3: Auros" superseding v2 | `DESIGN.md:7` v2 on top | DONE |

Proof: tokens `src/styles/tokens.css:1-127`, Button `src/components/ui/Button.tsx:37`, Stat `src/components/ui/Stat.tsx:17-19`, KpiTile `src/components/ui/KpiTile.tsx:46-47`, Card `src/components/ui/Card.tsx:14`, Layout `src/app/Layout.tsx:76`, Topbar `src/app/Topbar.tsx:33`, index `src/index.css:80-130`. All rows DONE.
