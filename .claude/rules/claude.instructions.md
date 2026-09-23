---
description: "Use when creating or editing Angular TypeScript source in this project — covers standalone HTTP service-layer conventions and the required unit tests."
paths:
  - "src/**/*.ts"
---

# Angular Service Layer & Testing Guidelines

## UI Design pattern
- Use this UI design pattern from my docs  docs\PawTag-Design-System-Style-Guide.pdf
- Always follow the design pattern consistently throughout the application.
- Ensure that any deviations from the design pattern are well-justified and documented.

## Service layer conventions
- One `@Injectable({ providedIn: 'root' })` service per REST resource, under `src/app/core/services/`, named `<resource>.service.ts`.
- Inject the API base URL via an `InjectionToken` (see `core/services/api-config.ts`), never hardcode URLs in a service.
- Request/response shapes belong in `core/models/models.ts` as plain interfaces generated from the OpenAPI spec — keep them in sync when the API changes.
- Use the standalone HTTP APIs (`provideHttpClient`, `withInterceptors`) wired in `app.config.ts` — do not introduce `HttpClientModule`.
- Auth tokens are attached automatically by `auth.interceptor.ts`; do not set the `Authorization` header manually in a service.

## Testing requirement
- Every new or modified service, component, pipe, directive, guard, or interceptor must have a matching `*.spec.ts` in the same folder.
- For anything calling `HttpClient`, use `provideHttpClient()` + `provideHttpClientTesting()` with `HttpTestingController`; assert request method, URL, params, and body, then `flush()` a mock response.
- Cover the success path, at least one error path (e.g. 404/409/503), and edge cases for optional inputs.
- Vitest is the test runner (via `ng test`) — it has no Jasmine-style `fail()` global; throw inside `next()` instead when an error is expected.
- Run `npx ng test --watch=false` after adding tests and before considering a change complete.
