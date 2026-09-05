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
