# PawTag Design System (extracted from Claude artifact)

Source: `https://claude.ai/artifact/Gizg3yqtdoD3XQxSxRqD6V` (PDF export). Tokens are implemented as CSS custom properties in [paw-tag-app/src/styles.scss](../paw-tag-app/src/styles.scss). Component/usage rules are enforced via [.github/instructions/pawtag-design-system.instructions.md](../.github/instructions/pawtag-design-system.instructions.md).

## Brand overview
PawTag is the collar-tag platform behind Sri Lanka's street dog vaccination, sterilisation and treatment programme, extended to home dogs via a paid collar. One Angular + Cordova codebase serves: the field app (welfare workers/vets), the desk web platform (clinics/admins), and the public scan page (anyone). **Light theme only.** Every screen designed mobile-first (375–430px) then grown to desktop — never a desktop-only flow, never a different information architecture per breakpoint.

Four roles: **animal welfare workers** (register street dogs, log field treatment), **veterinarians** (validate/record clinical care), **pet owners** (home-dog collar buyers), **community members** (occasionally log a treatment for a street dog).

Copy: direct and procedural (medical record-keeping, not consumer pet-social). "Animal" = general term; "owner" = home dog's registered owner only; "registered by" = the worker who onboarded a street dog. Dates absolute, never relative. Due/overdue vaccination stated as fact + date, never an alarm. Sentence case throughout. No emoji.

## Colour roles
| Token | Hex | Role |
|---|---|---|
| `surface-50` | #F5F9F7 | App/screen background |
| `surface-100` | #FFFFFF | Cards, top bar, bottom nav, input container |
| `surface-200` | #EAF1EE | Input fill, chip fill, hover/pressed, skeletons |
| `border` / `border-strong` | #DEE9E4 / #C4D5CD | Hairlines / focus-adjacent, active input border |
| `ink` / `ink-muted` / `ink-faint` | #132420 / #57685F / #93A69D | Primary / secondary / placeholder-disabled text |
| `brand` / `brand-tint` | #D9503C / #FFE3D9 | Identity only: cover, auth header, avatar initials — never body UI text |
| `sun` / `sun-tint` | #F2A33D / #FDEACB | Decorative only (cover, empty states) — never interactive |
| `accent` / `accent-strong` / `accent-tint` | #0B8073 / #08655B / #DFF3EE | The one interactive colour — buttons, active tab, links, focus ring |
| `success` / `-surface` | #0C7A4E / #DEF3E7 | Up to date, verified |
| `warning` / `-surface` | #A66300 / #FBECD2 | Due soon, pending verification |
| `danger` / `-surface` | #C4342A / #FAE3E0 | Overdue, urgent, destructive |
| `info` / `-surface` | #2E6FCC / #E1ECFB | Neutral status (e.g. sterilisation scheduled) |
| `focus-ring` | #0B8073 | 3px outline, 2px offset, every interactive element |

Status is always colour + word (a tag), never a bare dot.

## Type
System sans stack, no webfont. `display` 26/32 700 (auth titles only) · `h1` 20/26 700 (screen titles) · `h2` 17/23 600 (section headings) · `h3` 15/20 600 (card/list titles) · `body` 15/22 400 · `body-strong` 15/22 600 · `label` 13/18 600 · `caption` 12/16 400 · `micro` 11/14 600 uppercase (nav labels, badges) · `mono` 14/20 500 (animal ID/collar code only, `xxxx-xxxx`).

## Spacing / radius / shadow
4px scale: `space-1..8` = 4/8/12/16/20/24/32px. Screen margins & card padding = `space-4`. `radius-md` (10px) default for buttons/inputs/rows; `radius-lg` (16px) for cards/sheets; `radius-full` only for avatars/FAB/pill chips. `shadow-sm` for top bar/bottom nav; `shadow-md` reserved for floating elements (scan FAB, open sheets) — cards use a border hairline, never a shadow.

## Layout breakpoints
Mobile: single column, fixed top bar, fixed 5-item bottom nav. Desktop: content column widens to `max-width: 640px` for single-record screens (profile, add/edit, medical record) or `max-width: 960px` two/three-column grid for list/admin screens; bottom nav becomes a left rail.

## Components
Button (`pt-btn`: primary/secondary/danger/ghost/sm), Input (44px, label above, error state = danger border + plain-language help), Card (`pt-card`), Badge (`pt-tag` status word / `pt-chip` filter pill), Avatar (`pt-avatar`, brand-tint), ListItem (icon + title + meta + chevron, whole row tappable), TopBar (back / h1 title / one contextual action), BottomNav (Home, Animals, Scan, Records, Profile).

## Screens catalogued in the artifact
SignIn, SignUp, AnimalProfile, AddAnimal, EditAnimal, MedicalRecordsList, AddMedicalRecord, ViewMedicalRecord, ScanMobile (NFC-first), ScanWeb (ID lookup, no sign-in required), UserProfile ("My animals" list + role tag).

These map directly onto the tickets in [scrum-frontend-tickets.xml](./scrum-frontend-tickets.xml) and the PRs in [frontend-implementation-plan.md](./frontend-implementation-plan.md):
- SignIn/SignUp → PR 2
- AnimalProfile/EditAnimal → PR 5, PR 10 (health summary embed)
- AddAnimal → PR 4
- MedicalRecordsList/AddMedicalRecord/ViewMedicalRecord → PR 7, PR 8, PR 9
- ScanMobile/ScanWeb → PR 11 (note: artifact specifies NFC-first on mobile, camera QR as a distinct fallback — update PR 11 to build an NFC read path via Cordova plugin in addition to camera QR scanning)
- UserProfile → PR 12 pairs with this (admin user management) but UserProfile itself (self-service "my animals") is a new small addition — folded into PR 3/PR 5 scope
