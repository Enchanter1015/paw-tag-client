---
applyTo: "src/**/*.ts"
---

# Unit testing requirement

- Whenever you create or modify a service, component, pipe, directive, guard, or interceptor, write or update a matching `*.spec.ts` file in the same folder.
- Use `TestBed` with `HttpClientTestingModule`/`provideHttpClientTesting()` and `HttpTestingController` for anything that calls `HttpClient`; assert the request method, URL, and body, then flush a mock response.
- Cover: success path, at least one failure/error path, and edge cases for optional inputs (e.g. omitted query params).
- Do not leave a task "done" if new/changed source code lacks corresponding tests — treat tests as part of the implementation, not an optional follow-up.
- Run the test suite (`npm test`) after adding tests to confirm they pass before considering the change complete.
