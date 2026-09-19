---
description: "Use when building or styling any Angular component/screen in paw-tag-app — enforces the PawTag design system (colours, type, spacing, components, mobile-first layout)."
applyTo: "src/app/**/*.{ts,html,scss}"
---

# PawTag Design System

Full source: `docs/design-system.md` (extracted from the Claude design-system artifact, all 25 pages).

## Non-negotiables
- Light theme only — never implement a dark theme.
- Mobile-first: design every screen at 375–430px first, then grow via CSS custom properties `--pt-content-narrow` (640px, single-record screens) or `--pt-content-wide` (960px, list/admin screens). Never redesign IA between breakpoints — only column count.
- Sentence case everywhere, including titles and buttons ("Add medical record", not "Add Medical Record"). No emoji. Dates are absolute ("12 Mar 2026"), never relative.
- `accent` (teal, `--pt-accent`) is the only interactive colour — buttons, links, active tab, focus ring. `brand` (coral, `--pt-brand`) is identity-only: cover + sign-in/sign-up header, icons only, never body text. `sun` (amber) is decorative only — never a button/tag/link.
- Status (`success`/`warning`/`danger`/`info`) is always colour + word together (a `pt-tag`), never a bare coloured dot.
- Every interactive element needs a visible hover/active state and a 3px `--pt-focus-ring` outline (2px offset) on keyboard focus.

## Tokens (CSS custom properties defined in `src/styles.scss`)
Use `var(--pt-*)` tokens — never hardcode hex colours or px spacing/radius values that already have a token. Key ones: `--pt-surface-50/100/200`, `--pt-ink(-muted|-faint)`, `--pt-accent(-strong|-tint)`, `--pt-brand(-tint)`, `--pt-success/warning/danger/info(-surface)`, `--pt-space-1..8` (4px scale), `--pt-radius-sm/md/lg/full`, `--pt-shadow-sm/md`.

Radius: `radius-md` (10px) default for buttons/inputs/list rows. `radius-lg` (16px) for cards/sheets. `radius-full` only for avatars/FAB/pill chips.

Spacing: screen side margins and card padding are `space-4` (16px), not more. Gap between related fields `space-2`–`space-3`. Only unrelated sections get `space-5`–`space-6`.

## Core components (build as shared standalone components under `src/app/shared/`)
- **Button** (`pt-btn`): `primary` (accent fill) — exactly one per screen; `secondary` (outline); `danger` (destructive, always paired with a secondary Cancel); `ghost` (text-only, lowest emphasis); `sm` (inline toolbar only). Disabled = `surface-200`/`ink-faint`, no border. 44px touch target minimum.
- **Input**: 44px tall, `surface-200` fill at rest → `surface-100` on focus, label always above (never placeholder-only). Error state turns border `danger` + one line of plain-language help text below.
- **Card** (`pt-card`): `surface-100` on `surface-50`, border hairline (never shadow), `radius-lg`, `space-4` padding, `space-3` gap between stacked cards.
- **Badge**: `pt-tag` = status word on tinted surface (success/warning/danger/info/neutral). `pt-chip` = filter/selector, pill-shaped, filled accent when active; wrap a single-line filter row in `pt-chip-row` (horizontal scroll, hidden scrollbar).
- **Avatar** (`pt-avatar`): initials on `brand-tint`/`brand` text — the only place `brand` is a text colour. `lg` (72px) for profile headers, `md` (44px) for list rows.
- **ListItem**: 40px icon tinted by record type, title + date/who meta line, trailing chevron, no separate "view" button — the row itself is tappable.
- **TopBar**: fixed, `surface-100`, `shadow-sm`, back chevron left / `h1` title centre / at most one contextual action right (extra actions go to overflow).
- **BottomNav**: 5 fixed root tabs (Home, Animals, Scan, Records, Profile), active = `accent`, inactive = `ink-faint` (never `ink-muted`). Becomes a left rail at desktop width — never drop a destination.

## Type scale
`display` (26px/700, auth screens only) · `h1` (20px/700, screen titles) · `h2` (17px/600, section headings) · `h3` (15px/600, card/list titles) · `body` (15px/400) · `body-strong` (15px/600) · `label` (13px/600) · `caption` (12px/400) · `micro` (11px/600 uppercase, nav labels/badges) · `mono` (14px/500, animal ID/collar code only, formatted `xxxx-xxxx`).

## Icons
Single-weight line icon set (Material Symbols Outlined or Lucide, pick one project-wide), 20px in body, 24px in top bar/bottom nav. Always `currentColor` — never hard-coded fill.

## Copy rules
"Animal" = general term (street + home dogs). "Owner" only for a home dog's registered owner. "Registered by" for the worker who onboarded a street dog. A due/overdue vaccination is a fact + date ("Rabies booster due 2 Oct 2026"), never an alarm ("Overdue!!").
