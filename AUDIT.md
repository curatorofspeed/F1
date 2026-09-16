# F1 Card Index (f1cardindex.com) — Impeccable Audit & Polish Pass

**Scope:** all 156 site pages — `index.html` (the hub, 3 themes), 59 checklist pages + 2 generator templates, 92 dark info/driver/set pages, 4 light commerce pages (shop/consign/seller/order), giveaway.
**Method:** the quality floor — pattern scan, measured WCAG contrast, keyboard/dialog contract, live verification in a served browser. Polish pass, not a redesign: every skin's identity (dark/tron/light hub, team-color checklists, gold commerce, cream giveaway) is preserved.

## Findings by severity

### 🔴 Critical
**No visible keyboard focus on 96 of 156 pages.** Only the checklist family had a `:focus-visible` rule; the hub, all driver/set/info pages, commerce, and giveaway had none (and 8 `outline:none` sites on the hub, 4 more on commerce inputs) — WCAG 2.4.7 failure. → **Fixed:** brand-colored keyboard-only focus ring on every page (gold on dark — 10.3:1; gold `#90661a` on light — 4.5:1+; accent on cream), `!important` so it survives the existing `outline:none` rules, with a `forced-colors: active` variant switching to `CanvasText` so it survives Windows High Contrast.

**The hub's generated cards were keyboard-dead.** `index.html` renders driver cards, sale rows, race rows, hub cards etc. as `<div onclick>` — 204 elements at first render, none reachable or firable by keyboard. → **Fixed** with the observer pattern: a MutationObserver tags every `[onclick]` element as it renders (`tabindex="0"`, `role="button"`, skipping anything already semantic), one delegated handler fires them on Enter/Space. Verified live: 204 tagged, 0 missed, Enter on a driver card routes to `#verstappen`.

### 🟠 High
**The shared hub modal had no dialog contract.** `#overlay`/`#modal` (card editor, delete-confirm, promo/affiliate/result editors) opened with no `role`, no Escape, no focus management, no Tab trap — click-outside was the only escape. → **Fixed:** `role="dialog" aria-modal="true"`, label derived from the modal's heading at open, focus moves to the first focusable, Escape closes the layer, Tab wraps last→first and Shift+Tab first→last, and focus restores to the trigger on close. Implemented via a class-observer on the overlay so all five existing openers get the contract without touching their code. Every behavior verified live.

**Measured contrast failures (fixed with minimal bumps, hierarchy preserved):**
- Checklist `--dim` `#5a646b` — 2.76–3.21:1 on its surfaces, used as text 14×/page across 59 pages → **`#7e868b`** (4.52–5.25, still clearly below `--mut` at 4.88–5.67). Fixed in all 59 pages *and both generator templates* so future pages inherit it.
- Light-skin `--gold` `#a9781f` — 3.43–3.89 as text (25× on shop alone), and white-on-gold buttons also 3.89 → **`#90661a`** (4.50–5.12 both ways; one bump fixes text *and* buttons). Applied to shop/consign/seller/order and the hub's light theme (74 gold-text uses).
- Light-skin `--green` `#15a34a` → **`#107d39`** (3.30 → 4.60+); `--teal` `#0d9488` → **`#0b7b71`** (3.74 → 4.52+, also fixes white-on-teal accent buttons). Hub light theme + commerce.
- Giveaway `--faint` `#9a8f79` — 2.64–3.14 as text → **`#6e6657`** (4.69–5.58).
- Verified passing and left alone: dark `--muted` (4.88–5.67), light `--muted` (5.28–6.00), giveaway `--dim` (5.03+), all tron tokens (4.97–13.9), `--down` reds. Dark `--teal-dim` `#4a5258` measures 2.26 but is used almost exclusively as hover/divider borders — decorative, WCAG-exempt, and part of the look; preserved (see Recommended for its two chevron uses).

### 🟡 Medium
- **No `prefers-reduced-motion` on 96 pages** despite hover transforms/animations → global reduced-motion kill-switch added (checklists already had one — matched their convention).
- **iOS focus-zoom:** inputs under 16px on mobile → 16px floor under 760px on every page. Verified live at 375px: shop input computes 16px.
- **No `forced-colors` handling anywhere** → added with the focus-ring block on all 156 pages.

### 🟢 Low
- **No `::selection` styling** — default blue broke every skin → brand selection per skin (gold on dark/checklists, gold+white on light, accent+cream on giveaway).

## Already at the floor (verified, unchanged)
- Checklist pages use native `<dialog>`/`showModal()` (Escape + focus handled by the platform), have a `:focus-visible` rule and reduced-motion.
- The hub's newsletter + giveaway signups: busy state (`disabled` + "Subscribing…"), honeypot, `role="status"` live messages.
- Consign form: disabled+busy submit with "Submitting…" state.

## Verified live (served at localhost, real key events)
- Real-Tab focus ring screenshots: hub (light), checklist (team-color ring `#3671C6`, `:focus-visible` matched), shop (`#90661a` ring on footer link).
- Hub: 204/204 `[onclick]` elements tagged; Enter fires a card's handler (hash routes).
- Modal: focus-in ✓, `aria-labelledby` from heading ✓, Tab wrap both directions ✓, Escape ✓, focus-restore to trigger ✓.
- Theme sweep: dark/tron/light each resolve the corrected tokens.
- Mobile 375px: 16px input floor active.
- All inline scripts parse (`new Function` check) on all 156 pages — the only "errors" are the two templates' pre-existing `{{PLACEHOLDER}}` tokens, untouched.

## Recommended (not done)
- **Checklist focus ring uses each page's team color** — most pass the 3:1 indicator floor, but a few dark team colors (navy blues) may sit near it. A one-line change to a fixed high-contrast ring color would guarantee it at the cost of the per-team accent.
- **Hub chevron glyphs** (`.mff-go`, `.auct-item .go`) use `--teal-dim` (2.4:1) as text — redundant iconography on labeled rows, so exempt-adjacent, but bumping to `--muted` is a two-line change.
- **`admin_1.html`** looks like a stale copy of `admin.html` (it got the floor CSS anyway) — consider deleting it from the repo.
- **`giveaway-section.html`** is a paste-in fragment, not a page — skipped by design.

---

# Design Review Pass (2026-08-30)

**Scope:** cross-page coherence — navigation, typography, loading states, theme, copy.

- **Shared site nav** (`Market · Shop · Sets · Sell`, mono uppercase, brand-colored hover) added to every surface: hub header (Shop · Checklists · Sell a Card), the 38 dark site-header pages, all set pages + sets index, driver stub pages, shop/seller/consign. Checklist pages' existing nav gained a Shop link (template too). Giveaway intentionally stays chromeless (conversion landing page); order.html left minimal (transactional).
- **Brand typography unified:** Sora body + Saira Condensed headlines rolled to the 57 pages that were on system fonts (all set pages, shop/consign/seller/order, offer, driver stubs). Giveaway keeps Inter (campaign identity); admin pages left as-is.
- **Set-page voice:** emoji section headers (⭐🔥🌈📋✍️🎴) and the 🛒 in eBay CTAs removed to match the site's typographic voice.
- **Theme cleanup (hub):** the unreachable legacy dark `:root` replaced with the shipped light tokens and `data-theme="light"` set statically on `<html>` — kills the dark-flash before JS applied the light theme, and removes the dead third theme. Tron untouched. NOTE: `2025-topps-lights-out-f1.html` already implements theme-following (reads `f1CardIndex:v1` from localStorage) — that's the established pattern for making subpages follow the hub theme; rolling dual palettes to the other ~90 dark pages remains future work.
- **Shop loading state:** 6-card shimmer skeleton (reduced-motion-safe) shown during the Supabase fetch, hidden on success and on the existing error message.
- **Copy:** giveaway countdown now pluralizes ("1 day").

**Verified live:** nav rendered on hub/about/set/driver-stub/shop; computed fonts (`Sora` body, `Saira Condensed` h1) on shop + set pages; skeleton hides after data loads; countdown reads "1 day" at d=1; no duplicate nav insertions across 157 pages; all inline scripts still parse.

---

# Critique Pass (2026-09-04) — findings only, nothing changed

**Scope:** the whole product as deployed, judged fresh — including the two earlier passes' own choices. **Method:** live production checks, DOM reads, measured contrast, repo analysis.

## 🟠 High
- **Admin surfaces are public and indexable.** `admin.html`, the stale `admin_1.html`, and `approval-console.html` are served on the live site with no `noindex` and no robots exclusion (robots.txt allows everything). The auth model itself is sound — keys/secret are typed in at runtime, nothing embedded — but the console is discoverable by crawlers, and `admin_1.html` is a dead old copy that only widens the surface. (`order/offer/seller` already carry `noindex` — the admin trio should match, and `admin_1.html` should go.)
- **The hub has no footer.** The site's most-visited page just ends: no Privacy / Disclaimer / Contact / About links anywhere on it (those live only in subpage footers). Legal links reachable from the page carrying the newsletter signup and affiliate content is table stakes.

## 🟡 Medium
- **The emoji inconsistency is now ours.** The design pass stripped emoji headers from set pages for "typographic voice" — but the hub's own section headers are full of them (🛒🛍️🏁📋🔴🏆🔬🃏🔨). Either the emoji are the brand's voice (then the set-page strip was wrong) or they aren't (then the hub needs the same cleanup). Pick one; currently the flagship page and its children disagree.
- **Light hub → permanently dark subpages** remains the biggest coherence break (unchanged from the design review). The theme-following pattern exists on `2025-topps-lights-out-f1.html` (`f1CardIndex:v1`); it hasn't been rolled anywhere else.
- **The duplicated set pages are already drifting.** Every set page exists twice (top-level + `sets/`), hand-synced. All four sampled pairs differ (13–30 lines). Canonicals are correct, so SEO is safe — this is a maintenance trap, not a ranking problem. Long-term: one copy + a redirect.

## 🟢 Low
- Hub chevron glyphs still use `--teal-dim` at 2.4:1 (carried from pass 1's Recommended).
- `.hub-nav` has no `flex-wrap`; its three links fit at 375px but it's one long driver-name badge away from overflow.
- `order.html` remains nav-less by design — fine for email-linked flows, worth revisiting if it ever gets organic traffic.

## Verified healthy (measured, no action needed)
- **Retired from pass 1's Recommended:** all 59 checklist team-color focus rings measured — every one clears the 3:1 indicator floor on both its surfaces (lowest ≈3.2, Red Bull `#3671C6`).
- Both quality-floor passes are intact in production (nav, fonts, tokens, `data-theme="light"` all serving).
- Canonicals: duplicated set pages both point at the `/sets/` URL — correct.
- Affiliate hygiene: Amazon Associates disclosure present, eBay links `rel="sponsored"`, disclaimer page covers it.
- The ended giveaway (Aug 31) degrades gracefully: hub banner auto-hides, page shows "Entries closed", inputs disabled.
- Alt text present on sampled image templates; image weights sane (worst 143KB); hub transfers ~93KB gzipped despite the 358KB source.

## Critique pass — actions taken (2026-09-04)
- **Admin:** `admin.html` now carries `noindex,nofollow`; stale `admin_1.html` deleted from the repo. Correction to the finding: `approval-console.html` is untracked/undeployed (404s live) — it was never exposed.
- **Hub footer added:** site links (About/Methodology/Contact/Privacy/Disclaimer/Shop/Checklists/Sell) + the standard independence/affiliate fine print with auto-year, styled on hub tokens.
- **Voice unified:** hub `<h2>` emoji removed (matches set pages and the info/driver family). Status glyphs in data chips retained.
- **Chevrons** (`.mff-go`, `.auct-item .go`) bumped `--teal-dim` → `--muted`.
- **`.hub-nav`** got `flex-wrap:wrap`.
- **Verified live:** footer renders with all 8 links + year script, zero emoji `<h2>`s, chevron computes to `--muted`, nav wraps, inline scripts parse.
- **Deferred (dedicated work):** theme-following rollout to dark subpages (pattern on lights-out page); consolidating the duplicated set pages behind redirects.

---

# v2 Preview — Layout Pass (2026-09-15)

**Scope:** `v2/index.html` (the /v2 hub preview) · **Method:** measured layout at 1920 / 1440 / 1280 / 1120 / 1000 / 940 / 900 / 820 / 768 / 600 / 540 / 414 / 360 px — grid column counts, header-to-content alignment, tap-target sizes, overflow and control wrapping — then fixed and re-measured live.

## Findings by severity

### 🟠 High
**The sticky header didn't line up with the page column on wide screens.** `main` and the footer cap at 1280px and centre, but the top bar was full-bleed: at 1920 the breadcrumb started at x=280 while content started at x=476 (196px out), and the bar's right edge ran 82px past the content edge. → **Fixed:** header children wrapped in a `.top-in` container capped to the same 1216px content box. Measured after: header 476 = content 476 = footer 476, right edge 1692 = 1692.

**Filter controls stranded themselves on phones.** A flex spacer (`span.grow`) sat between the chips and the sort `<select>`, so at 360px the select wrapped onto its own line with a 172px empty gap beside it (sales and auctions both). → **Fixed:** the spacer is hidden below 540px and selects/fields go full width. Toolbar height 114px → 79px, select spans the full 328px column.

### 🟡 Medium
**Tap targets under the 24px minimum (WCAG 2.5.8).** Section "→" links measured 15px tall, footer nav links 15px, driver-card sub-links 13px. → **Fixed** with `inline-flex` + `min-height:24px`; all now measure exactly 24px. Chips (29px), buttons (41px) and tab-bar items (49px) already passed.

**Long chip rows stacked six deep on a phone.** The auctions driver filter (15 chips) wrapped to 6 rows at 360px, pushing the results far below the fold. → **Fixed:** below 540px chip groups become a single horizontally scrollable row (scrollbar hidden, 31px tall; scroll width 1496px in a 328px viewport).

### 🟢 Low
**Honeypot field sat at `left:-9999px`** — the only element in the document extending outside the viewport bounds. → **Fixed** with the standard clip pattern (`clip-path:inset(50%)`); zero out-of-bounds elements now.

## Verified live (measured, not eyeballed)
- Header/content/footer alignment at 1920 and 1280; no horizontal overflow at any of the 13 widths tested.
- Tap targets: `.more`, `.foot-nav a`, `.side-link`, `.dlinks a` all 24px.
- 360px: sales + auctions toolbars single-row chips, full-width select, no stranded gap.
- Breakpoint behaviour: KPIs 4→2 columns at 1120, cards 5→4→3→2 columns down the range, sidebar→tab bar swap at 900, spotlight 2→1 column at 540, tab-bar items 49px.
- No console errors.

## Recommended (not done)
- **Mobile sticky header is 101px tall** (brand row + full-width search row) on top of a 49px tab bar — about 19% of a 780px phone viewport is permanently chrome. Making the search row scroll away (sticky brand row only) would return most of it; that's a design call, not a defect.
- **KPI labels wrap to two lines at 360px** ("MARKET VOLUME TRACKED"), giving slightly ragged tile heights. Shorter labels would fix it, but the wording is the hub's.
- **The hero collapses to one column at 1120px** while the sidebar is still present, so the spotlight runs full width on narrow laptops. Intentional, and it reads fine — noted for the record.

---

# Homepage — Typography Pass (2026-09-15)

**Scope:** `index.html` (the v2 hub, now the homepage) · **Method:** measured the type system — scale, tracking, measure (characters per line), line-height, figures, truncation, font loading and punctuation — at 1440 and 375, then fixed and re-measured live.

## Findings by severity

### 🟠 High
**The "records" strip contradicted the page.** It rendered `recent_records` rows as "Hamilton record $750,000" directly under a KPI reading "Highest recorded sale $900,000". Reading the function: `recent_records` returns each driver's top sale **inside `f1_sales`, ingested in the last 45 days** — not the site record, which merges curated data. The `pct_over` figure compares against that driver's second-best row in the same table, which means nothing without the explanation. → **Fixed:** the strip is now labelled "Recently logged", chips read `driver · price · sale date`, the meaningless percentage is gone, and a "Best on file" tag appears only when the sale really is that driver's best in merged data (1 of 6 currently — Hadjar). Verified against the live feed.

### 🟡 Medium
**Prose ran to 127 characters per line.** The grading-calculator note measured 127ch at 1440 (comfortable is 45–75); the footer legal paragraph was uncapped. → **Fixed** with `max-width` caps: grading note 72ch measured, footer 78ch, race meta 70ch. The lede was already correct at 62ch.

**One label role, five different trackings.** Uppercase mono micro-labels rendered at `1.2px / 1.4px / 1.32px / 1.76px / 1.6px / 1.1px` across `.eyebrow`, `.label`, `.more`, `.side-h`, `.tag`, `.count`, `.back`, `.team-pill`, `.dlinks`, `.foot-nav` and the theme toggle — the same role, inconsistently spaced. → **Fixed:** a single `.14em` for every uppercase mono label (measured live: only `1.4px @ 10px` and `1.54px @ 11px` remain, i.e. one value scaled by size), and one `.5px` for every display heading (h1/h2/.race-name/.wm/.m-brand).

**The scale had 21 steps for a 14-step job.** Near-duplicates (11.5/12, 15/16/17, 19/18, 21/22/23, 26/28, 44/46) → consolidated to 10, 11, 12, 13, 14, 16, 18, 22, 28, 31, 34, 44, 50, 64. Visible effects: section headings 23→22px, sale prices 17→16px, partner heading 26→28px.

### 🟢 Low
- **Straight apostrophes in copy** ("what's", "driver's", "You're" ×2) → typographic `’`.
- **Figures didn't lock to a column** → `font-variant-numeric: tabular-nums` on prices, KPI values and record-holder figures, so digits align if the mono face ever falls back.
- **Display fallback was `system-ui`** — a wide face standing in for a condensed one, so headings reflowed noticeably when Saira Condensed swapped in → fallback stack now `'Arial Narrow', 'Helvetica Neue Condensed', system-ui`.
- **No wrap control** → `text-wrap: balance` on headings and `pretty` on prose, killing widows and orphans (supported in this browser; harmless elsewhere).

## Verified live (measured)
- Grading note 127ch → 72ch; footer fine 78ch; lede 62ch.
- Uppercase mono tracking collapsed from 6 combinations to 1 value.
- h2 22px at `.5px`; sale price 16px; KPI 28px desktop / 22px at 375.
- `tabular-nums` and `text-wrap: balance` active in computed styles.
- Records strip: no "record" wording, dates present, 1 legitimate "Best on file" tag, no contradiction with the $900,000 KPI.
- No horizontal overflow and no console errors at 1440 or 375.

## Recommended (not done)
- **`hub.html` still carries the same misleading "record" wording** in its ticker — it is the legacy surface now (noindexed at `/hub`), so I left it alone; it is a one-line change if you want it matched.
- **10px is the floor for mono micro-labels** — legible at `.14em` but at the small end; moving the floor to 11px would cost a little density.
- **The wordmark sits off-scale at 31px** — deliberate, it is sized to the sidebar lockup rather than the type scale.

---

# Homepage — Motion Pass (2026-09-16)

**Scope:** `index.html` (homepage) · **Method:** inventoried every transition, keyframe and hover/press rule, then read `document.getAnimations()` live to see exactly which animations run and which CSS properties they touch — before and after the fix.

## Findings by severity

### 🟡 Medium
**The only animation was paint-heavy.** The loading skeleton shimmer animated `background-position` on 9 elements, repainting every frame for up to ~8s while Supabase loads. → **Fixed:** the shimmer is now a pseudo-element sliding on `transform`. Measured live: every looping animation on the page animates only `transform` and `opacity`.

**No press feedback anywhere.** Zero `:active` states across buttons, chips, the theme toggle, tab bar and cards — a tap gave no tactile response. → **Fixed:** buttons/chips/pills/theme toggle scale to .97 on press, tab-bar icons to .9, cards to .99.

**Views and content snapped.** Switching views, switching drivers, and changing filters replaced content with no transition, which is disorienting in a dense data UI. → **Fixed:** views rise in (6px + fade, 220ms); filtered grids, the KPI row when data lands, and the driver board on driver switch fade in; the search dropdown pops open. "Show more" deliberately does **not** re-fade the grid (verified: animation state identical before and after), and a live-data re-render of the *same* driver board doesn't flash.

### 🟢 Low
**17 hover states snapped instantly** (buttons, chips, cards, nav, links); the one existing transition used an ad-hoc `.25s ease`. → **Fixed:** shared tokens (`--ease: cubic-bezier(.2,.7,.2,1)`, `--dur-1: 120ms`, `--dur-2: 220ms`) on color/background/border/filter/transform for every interactive element.

**No ambient signal that the data is live.** → Added a slow pulse on the "Live data" status dot — the single ambient animation on the page, transform/opacity only.

## Caught during the pass
The first version of the view entrance also ran on initial page load, starting the whole overview at opacity 0 and delaying the largest paint by ~220ms. → Entrances now arm only on the first navigation (`.motion-ready`). Verified: on first load the overview has no animation and computes `opacity: 1`.

## Verified live
- Load: skeleton animations animate `transform`/`opacity` only (was `background-position`).
- After data: `pulse` running on the live dot; KPI row `fade`.
- Interactive transitions: `color, background-color, border-color, filter, transform @ 120ms cubic-bezier(.2,.7,.2,1)`.
- Three `:active` rule groups present; reduced-motion kill-switch covers `*, ::before, ::after`, so shimmer, pulse, entrances and transitions all stop under `prefers-reduced-motion`.
- View switch → `rise`; filter change → `fade` (re-triggers, `running@0`); driver switch → `fade` on header/tiles/top sales; search open → `pop`; "Show more" → no re-trigger.
- No console errors.

## Recommended (not done)
- **Sticky header uses `backdrop-filter: blur(10px)`** — cheap on desktop but a known scroll cost on low-end phones; swapping it for a solid background below 900px would remove it, at the cost of the frosted look.
- **Theme switch is instant by design** — cross-fading every element's colours on toggle is expensive and rarely worth it.
- **Reduced motion could not be emulated in the preview browser**; verified via the stylesheet rule instead. Worth one manual check with the OS setting on.
- **`hub.html` (the legacy `/hub`) was not touched.**

---

# Homepage — Colour Pass (2026-09-16)

**Scope:** `index.html` (homepage) · **Method:** measured every text token against every surface it sits on in both shipped themes (light, tron), measured all 63 team colours where they render as text, checked for colour-only signalling and hard-coded colours — then fixed and re-measured on the rendered page.

## Findings by severity

### 🟠 High
**Team colours failed contrast as text in the light theme — 38 of 63 drivers.** Team colours double as large text: the driver number on each board (44–64px) and the fallback initials on sale/auction cards without a photo (44px). Against the light `--bg`/`--panel2` they fell below even the 3:1 large-text floor: worst #FFB800 (Leon, Tsolov, Naël) 1.53:1, #e6b65c (legends) 1.65, #00D2BE (Mercedes) 1.69, #64C4FF 1.70, #B6BABD 1.72. Tron passed all 63. → **Fixed:** a `tct()` helper mixes each colour toward the ink **only as far as that colour needs** to clear 3.1:1 on both light surfaces; exposed as `--tct` and used by `.dnum`/`.tile` in light only, while tron keeps the raw team colour. A uniform darkening would have needed 36% and muddied the 8 colours that already passed (Ferrari red, Williams blue…); per-colour, those get 0%. Measured after: Leon 3.14, Antonelli 3.11, Ocon 3.13, Norris 3.13, Leclerc unchanged at 3.86, all 8 visible fallback tiles ≥ 3.28.

### 🟢 Low
- **"Next race" was signalled by border colour alone** (WCAG 1.4.1) → the row now carries a "Next" label.
- **The brand stripe was hard-coded to light-theme colours**, so in tron it dimmed to a dark teal/brown on black → stripe uses `--teal`/`--gold`/`--red`, brightening in tron and identical in light.

## Verified passing (measured, unchanged)
| Token | Light | Tron |
|---|---|---|
| `--txt` on bg/panel/panel2 | 14.64 / 16.64 / 15.44 | 18.58 / 17.14 / 16.05 |
| `--muted` on bg/panel/panel2 | 5.28 / 6.00 / 5.57 | 5.75 / 5.31 / 4.97 |
| `--gold` text on bg/panel/panel2 | **4.50** / 5.12 / 4.75 | 14.24 / 13.13 / 12.30 |
| `--up` on panel (next-race countdown) | 5.23 | 11.02 |
| `--down` on panel ("Ends in", Live badge) | 4.83 | 6.30 |
| Button ink on gold | 5.12 | 13.36 |
| Red wordmark (large text, 3:1) | 3.86–4.38 | 4.33–4.69 |
| Focus ring gold (non-text, 3:1) | 4.50–5.12 | 13.13–14.24 |

**No colour-only signalling left:** live status says "Live data", auction lots say "Live" and "Ends in N days", grading profit/loss carries a +/− sign, pressed chips invert *and* set `aria-pressed`, "Best on file" and "Next" are text. Team-colour dots and bars sit beside driver names, so they are decorative.

## Recommended (not done)
- **Light `--gold` on `--bg` sits exactly on the floor (4.50:1)** — it passes, but with zero headroom: any future tweak to `--bg` or `--gold` drops gold text below AA. `#8c6319` would give ~4.7:1 with no visible change.
- **`tct()` hard-codes the light `--bg` and `--panel2` values** it tests against. If those tokens change, update the two surface values in the helper.
- **`hub.html` (legacy `/hub`) was not touched.**

## Colour pass — follow-ups applied (2026-09-16)
- **Light gold `#90661a` → `#8c6319` on all seven light-theme pages** (homepage, hub, shop, consign, seller, order, 2025 Lights Out) so the brand keeps one gold. Gold text on `--bg` 4.50 → **4.72:1**, on panels 5.12 → **5.37:1**; white button text on gold 5.12 → **5.37:1**. Verified on the rendered homepage and shop (Buy button and prices 5.37:1).
- **`tct()` no longer hard-codes surface colours** — it reads `--bg`, `--panel2` and `--txt` from the `:root` rule, so it tracks the tokens and gives the same result even when the page loads in tron (tron overrides computed values, not the rule). Verified: Noel León's number renders `rgb(171,129,11)` whether the page first loads in light or loads in tron and is switched to light.

---

# Homepage — Delight Pass (2026-09-16)

**Scope:** `index.html` (homepage) · **Method:** inventoried every empty, loading, success and error state plus the ranking, race and calculator moments; added personality only where it also carries meaning or utility; verified each moment in the browser (race-weekend state via a throwaway local copy with the next race shifted to tomorrow — deleted, never committed).

## Findings

### 🟡 Medium
**Empty states were dead ends.** Filtering the sales archive or the driver index to nothing said so ("Try another source or clear the filter.", "No drivers match.") but offered no way back — you had to find and undo each filter yourself. → **Fixed:** "Nothing on the grid for that combination." with a **Reset filters** button (sales) and "No driver on the grid by that name." with **Clear filters** (drivers). Reset restores the full list, empties the text filter and moves focus to the first filter chip so keyboard users land somewhere sensible. Verified: 400 sales restored, input cleared, focus on "All sources".

### 🟢 Low — personality with a purpose
- **Record holders were numbered 01–05** — a ranking with no sense of place. → Now **P1–P5**, with gold, silver and bronze tints on the podium. Text stays `--txt`, so contrast is unchanged in both themes.
- **"This weekend" was the most exciting race moment.** → On race weekends only (race ≤ 2 days away) the next-race card shows **F1 start lights**: five reds light one by one, then lights out, with the label "Lights out this weekend". The lights are `aria-hidden`; the label carries the meaning. Off-weekend the card reads "In N days" as before (verified: "In 10 days" on the real page).
- **The grading calculator gave numbers without a verdict.** → A verdict tag leads the result: **Podium** (ROI ≥ 100%), **Points** (profitable), **DNF** (loss). The word carries the meaning; the tint echoes it. Still announced via the existing `role="status"`.
- **Newsletter confirmation was a plain line.** → "🏁 You're on the grid" with a brief chequered-flag wave (three swings, then still; flag is `aria-hidden`).
- **Search with no match** now reads "No driver on the grid matches “…”".

All new motion (start lights, flag wave) stops under the existing `prefers-reduced-motion` kill-switch.

## Bug found and fixed along the way
**The grading calculator formatted losses as "$-25 (-20%)".** Pre-existing in the calculator ported from the hub. → Now "−$25 (−20%)" with a proper minus sign. Verified all three verdict paths.

## Verified live
- Record holders render P1(p1) P2(p2) P3(p3) P4 P5.
- Sales empty state → Reset filters → 400 sales, input cleared, focus on first chip; drivers empty state → Clear filters → 63 drivers.
- Calculator: Podium +$175 (+140%), Points +$35 (+28%), DNF −$25 (−20%).
- Race weekend (test copy): label "Lights out this weekend", 5 lamps running `lamp1`–`lamp5`, `aria-hidden="true"`.
- Newsletter subscribed state: flag `wave` animation, `aria-hidden`, copy correct.
- No console errors.

## Recommended (not done)
- **Loading copy stays plain** ("Loading market data") — clarity beats whimsy while someone is waiting.
- **A "new record" moment** (when a live sale beats a driver's best on file) would be the most on-brand delight left, but it needs a reliable data signal first — the current `recent_records` feed isn't one.
