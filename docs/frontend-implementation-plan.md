# Frontend Implementation Plan — SCRUM Frontend Backlog

Source tickets: [scrum-frontend-tickets.xml](./scrum-frontend-tickets.xml)
API contract: `http://localhost:3000/api/docs` (already modeled in `paw-tag-app/src/app/core`)
UI design system: [docs/design-system.md](./design-system.md) (extracted from the Claude artifact) — tokens live in `paw-tag-app/src/styles.scss`, component/usage rules are enforced via `.github/instructions/pawtag-design-system.instructions.md`. All PRs below must build shared `pt-*` components (Button, Input, Card, Badge, Avatar, ListItem, TopBar, BottomNav) per that spec rather than one-off styling.

Service layer already in place and reused throughout (no re-implementation needed):
`AuthService`, `UsersService`, `AnimalsService`, `VetHospitalsService`, `MedicalRecordsService`, `LookupsService`, `HealthService`, `TokenStorageService`, `authInterceptor`.

Every PR below must add/extend `*.spec.ts` per `.claude/rules/claude.instructions.md` before merge.

---

## PR 1 — Auth state, guards, and shared layout shell
**Tickets:** SCRUM-18 (hardening, already Done — this PR closes the remaining gaps: auth state + guarded routing), SCRUM-24 (logout + protected routes)

Commits:
1. `feat(core): add AuthStateService exposing current user + role via BehaviorSubject, derived from stored tokens`
2. `feat(core): add authGuard (CanActivateFn) redirecting unauthenticated users to /login`
3. `feat(core): add roleGuard factory (CanMatchFn) for role-restricted routes`
4. `feat(shell): add AppShell component with responsive nav (mobile drawer + desktop sidebar), logout button wired to AuthService.logout()`
5. `feat(routing): wrap feature routes with authGuard; add default redirect to /login when logged out`
6. `test: AuthStateService, authGuard, roleGuard, AppShell nav rendering`

---

## PR 2 — Registration & login screens
**Ticket:** SCRUM-23

Commits:
1. `feat(auth): add RegisterComponent reactive form (name, email, password) using UsersService.register + AuthService.register, field-level validators + inline error mapping from ApiError`
2. `feat(auth): add LoginComponent reactive form using AuthService.login, redirect by role on success`
3. `feat(auth): add auth.routes.ts (register/login) and wire into app.routes.ts`
4. `style(auth): mobile-first card layout matching dashboard card pattern`
5. `test: RegisterComponent (valid/invalid/duplicate-email 409), LoginComponent (valid/401)`

---

## PR 3 — Role-based navigation & view guards
**Ticket:** SCRUM-25

Commits:
1. `feat(shell): extend AuthStateService with hasRole()/isGuest() helpers`
2. `feat(shell): filter AppShell nav items by role (Guest/Registered/Administrator) via *ngIf`
3. `feat(admin): stub AdminNav section (user management, record verification links) visible only to Administrator`
4. `test: nav item visibility per role via AuthStateService mock`

---

## PR 4 — Dog registration form
**Ticket:** SCRUM-31

Commits:
1. `feat(animals): add AnimalRegisterComponent reactive form (name, dob, animalTypeId via LookupsService.getAnimalTypes, breed, isStreet)`
2. `feat(animals): add photo capture/upload input with local preview (FileReader) prior to submit`
3. `feat(animals): wire submit to AnimalsService.register, field-specific validation errors from 400 responses`
4. `style(animals): mobile-first form layout, large touch targets`
5. `test: AnimalRegisterComponent (valid submit, missing required fields, photo preview)`

---

## PR 5 — Dog profile view/edit + search
**Tickets:** SCRUM-32, SCRUM-33, SCRUM-34

Commits:
1. `feat(animals): add AnimalProfileComponent (AnimalsService.getById), read-only for Guest, edit form for authorised roles using AnimalsService.update`
2. `feat(animals): add AnimalSearchComponent using AnimalsService.search(query/animalTypeId/isStreet) with result cards (photo, id, status)`
3. `feat(animals): add animals.routes.ts (search, profile/:id, register) under authGuard where required; profile view route public for Guest`
4. `style(animals): responsive grid/list for search results, 360–420px breakpoint pass across register/profile/search`
5. `test: AnimalProfileComponent (guest read-only vs authorised edit), AnimalSearchComponent (query params, empty results)`

---

## PR 6 — Administrator dog records management
**Ticket:** SCRUM-35

Commits:
1. `feat(admin): add AnimalRecordsAdminComponent listing animals with filter, using AnimalsService.search`
2. `feat(admin): add edit/merge/remove row actions using AnimalsService.update/merge/remove`
3. `feat(admin): add ConfirmDialogComponent shared control, required before merge/remove`
4. `test: AnimalRecordsAdminComponent (filter, confirm-then-remove, confirm-then-merge, cancel path)`

---

## PR 7 — Medical record entry & history
**Ticket:** SCRUM-37

Commits:
1. `feat(medical): add MedicalHistoryComponent (MedicalRecordsService.listForAnimal), overdue entries flagged from nextDueDate`
2. `feat(medical): add MedicalFormComponent (MedicalRecordsService.addForAnimal), prepend to history on success`
3. `feat(medical): use LookupsService.getMedicalRecordTypes for type select`
4. `test: MedicalHistoryComponent (overdue flag logic), MedicalFormComponent (submit success/validation error)`

---

## PR 8 — Sterilisation record entry & status
**Ticket:** SCRUM-39

Commits:
1. `feat(medical): add SterilisationStatusBadge component reading latest sterilisation-type MedicalRecord`
2. `feat(medical): add SterilisationFormComponent reusing MedicalRecordsService.addForAnimal with sterilisation medicalRecordTypeId`
3. `test: SterilisationStatusBadge (set/unset states), SterilisationFormComponent submit`

---

## PR 9 — Medical treatment entry, history & verification action
**Tickets:** SCRUM-42, SCRUM-50 (verification screen shares the verify action)

Commits:
1. `feat(medical): add TreatmentHistoryComponent (MedicalRecordsService.listForAnimal filtered by treatment type), shows submitter + date`
2. `feat(medical): add TreatmentFormComponent (MedicalRecordsService.addForAnimal)`
3. `feat(medical): add "verify" action on unverified records using MedicalRecordsService.verify(id, { verifiedBy })`
4. `feat(admin): add RecordVerificationComponent listing all unverified records across animals (aggregated query) with verify/reject actions`
5. `test: verify action permissions, RecordVerificationComponent list + verify flow`

---

## PR 10 — Dog health summary view
**Ticket:** SCRUM-43

Commits:
1. `feat(animals): add HealthSummaryComponent combining vaccination/sterilisation/treatment status into up-to-date/overdue indicators`
2. `feat(animals): embed HealthSummaryComponent into AnimalProfileComponent`
3. `test: HealthSummaryComponent status computation (up-to-date, overdue, unresolved treatment)`

---

## PR 11 — QR display, download & scanning workflow (NFC-first per design system)
**Tickets:** SCRUM-46, SCRUM-47

Commits:
1. `feat(qr): add QrCodeService generating/rendering QR for an animal id (client-side qrcode lib) + download-as-image`
2. `feat(animals): add "View QR code" action on AnimalProfileComponent`
3. `feat(scan): add ScanMobileComponent — NFC-first (Cordova NFC plugin) with "Enter animal ID manually instead" fallback; on tap, navigate straight to AnimalProfileComponent, no intermediate result screen`
4. `feat(scan): add ScanWebComponent — manual animal-ID lookup form (mono input, no camera/NFC), public/no sign-in required, resolves via AnimalsService.getById`
5. `feat(scan): add QrScannerComponent (camera fallback for devices without NFC) resolving scanned id via AnimalsService.getById`
6. `feat(scan): add invalid/not-found handling with retry action on all three entry points`
7. `test: QrCodeService generation/download, ScanMobileComponent (NFC success/fallback), ScanWebComponent (valid/invalid id), QrScannerComponent (valid/invalid)`

---

## PR 12 — User management screen (administrator)
**Ticket:** SCRUM-51

Commits:
1. `feat(admin): add UserManagementComponent listing users (UsersService.findByEmail/getById per row, or backing search once backend adds list-all)`
2. `feat(admin): add role change action using LookupsService.getRoles + UsersService.update`
3. `feat(admin): add deactivate confirmation using shared ConfirmDialogComponent`
4. `test: UserManagementComponent role change + deactivate confirm/cancel`

> Note: current OpenAPI spec has no "list all users" endpoint — flag to backend before starting this PR; UI can be built against `GET /users?email=` in the interim with a manual lookup box.

**Status: partially implemented (2026-09-19).** `UserManagementComponent` (`admin/user-management/`) ships at `/admin/users`, admin-gated, with email lookup and edit (name/email/phone/address via `UsersService.update`, including 400 field-error mapping). Commits 2 and 3 above were cut, not stubbed:

- **Role change** — `User`/`UpdateUserInput` in `paw-tag-api` (`users.schema.ts`) expose no `role`/`roleId` field at all. Role only exists as a JWT claim (`AuthUser.role`) and on `VetHospitalMember` (hospital-scoped, not a global user role). There is nothing for `LookupsService.getRoles` + `UsersService.update` to write to.
- **Deactivate** — there is no deactivate/delete endpoint on `/users` in the current API.

Needs a backend change (expose `roleId` on `User`/`UpdateUserInput`, add a deactivate endpoint) before these two commits can be built for real; until then the UI intentionally omits them rather than wiring controls to non-existent endpoints or faking the behavior client-side.

---

## PR 13 — Reporting dashboard (KPIs + charts)
**Ticket:** SCRUM-53

Commits:
1. `feat(dashboard): replace placeholder stat cards with real data (total dogs from AnimalsService.search, vaccination/sterilisation coverage derived from MedicalRecordsService aggregates)`
2. `feat(dashboard): add chart library (e.g. ngx-charts) and coverage trend chart`
3. `feat(dashboard): add manual refresh action re-fetching KPI data`
4. `test: dashboard KPI computation, refresh behavior`

> Note: coverage aggregates likely need a dedicated backend endpoint (not in current spec); flag before implementation to avoid N+1 client-side aggregation.

---

## PR 14 — Offline access support
**Ticket:** SCRUM-55

Commits:
1. `feat(pwa): add Angular Service Worker (ng add @angular/pwa), cache animal profile GET responses`
2. `feat(core): add OfflineIndicatorService (online/offline via window events) + banner component`
3. `feat(animals): serve cached AnimalProfileComponent data when offline, block write actions with explicit offline messaging`
4. `test: OfflineIndicatorService state transitions, AnimalProfileComponent offline fallback`

---

## PR 15 — GPS location capture
**Ticket:** SCRUM-56

Commits:
1. `feat(geo): add GeolocationService wrapping navigator.geolocation with permission handling`
2. `feat(animals): capture coordinates in AnimalRegisterComponent with manual override fields`
3. `feat(animals): add location filter/sort-by-distance in AnimalSearchComponent`
4. `test: GeolocationService (granted/denied), register form manual override`

> Note: `Animal`/`CreateAnimalInput` models have no lat/lng fields yet — requires a backend schema addition before PR 15 and part of PR 4/5 rework.

---

## PR 16 — Dark/light theme support
**Ticket:** SCRUM-57

Commits:
1. `feat(theme): add ThemeService (light/dark) persisted to localStorage, applied via [class] on <body>`
2. `feat(theme): convert hardcoded colors in dashboard.scss/app.scss to CSS custom properties`
3. `feat(shell): add theme toggle control in AppShell`
4. `test: ThemeService persistence + toggle`

---

## PR 17 — Offline changes queue & sync status UI
**Ticket:** SCRUM-60

Commits:
1. `feat(sync): add OfflineQueueService (IndexedDB-backed) queuing failed mutating requests`
2. `feat(sync): add sync processor retrying queued requests on reconnect via OfflineIndicatorService`
3. `feat(sync): add SyncStatusComponent showing pending/synced/conflicted per change`
4. `feat(sync): add conflict resolution prompt (last-write-wins vs manual merge choice)`
5. `test: OfflineQueueService enqueue/retry/conflict, SyncStatusComponent rendering`

> Depends on PR 14 (offline foundation) and PR 4/5 (mutation entry points to hook into).

---

## Sequencing summary (matches ticket sprint labels)

| Sprint | PRs |
|---|---|
| sprint-1 | PR 1, PR 2, PR 3 |
| sprint-2 | PR 4, PR 5, PR 6 |
| sprint-3 | PR 7, PR 8, PR 9, PR 10 |
| sprint-4 | PR 11, PR 12 |
| sprint-5 | PR 13, PR 14, PR 15, PR 16 |
| sprint-6 | PR 17 |

## Open blockers to confirm with backend before starting
- No "list all users" endpoint (needed by PR 12).
- No coverage-aggregate endpoint for dashboard KPIs (PR 13) — otherwise requires expensive client-side aggregation over `/animals` + `/medical-records`.
