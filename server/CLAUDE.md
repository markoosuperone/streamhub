# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this
repository. It is the primary instruction file for generating and reviewing code here — when in
doubt, follow what's described below over generic defaults.

---

## Project Overview

**Purpose:** SuperPlayer is a REST API for uploading, streaming, and organizing audio/video media
into playlists — registration/login, media upload and streaming, and playlist/playlist-item
management with ordered positions.

**Architecture:** Clean (hexagonal) architecture, applied per bounded-context module (`auth`,
`media`, `playlists`, `users`, `transaction`). Each module separates domain entities, application
use cases, port interfaces (`contracts/`), and infrastructure adapters (HTTP, database,
filesystem). Dependency injection is manual and explicit — wired by hand in `src/container.ts`,
no DI framework or decorators.

**Main technologies:** TypeScript (strict), Fastify 5, PostgreSQL via `postgres.js` (no ORM),
TypeBox schemas validated by Fastify's built-in AJV, Pino for logging, `jsonwebtoken` for JWT,
Node's `crypto.scrypt` for password/token hashing, Vitest for testing. See `README.md` for the
full tech stack and endpoint list.

---

## Project Structure

```
src/
├── app.ts              # Fastify instance: plugins, global error handler, route registration
├── container.ts         # Composition root — manual dependency injection
├── config/               # Environment schema (env-schema + TypeBox) and typed config object
├── auth/                 # Registration, login, refresh, logout, sessions, JWT, hashing
├── users/                # User entity, DTOs, repository (no application layer — CRUD only)
├── media/                # Upload, streaming, deletion, file storage, ffprobe integration
├── playlists/             # Playlists and playlist items (two closely-related sub-modules)
├── transaction/            # Transaction manager abstraction + PostgreSQL implementation
├── server/health/           # Health check route
├── shared/                   # Cross-cutting code — logger, base error class, DB connection,
│                              # global error handler, shared schemas, stream utilities
└── tests/
    ├── unit/            # Use case tests, all dependencies mocked
    └── integration/     # Full HTTP tests against a real database and filesystem
```

Each of `auth`, `media`, and `playlists` follows the same internal layout:

| Layer | Location | Responsibility |
|---|---|---|
| **Domain** | `domain/` | Plain entities/value types. No framework or DB dependencies. |
| **Application** | `application/*.usecase.ts` | Business logic and orchestration. Depends only on `contracts/` interfaces — never imports a concrete repository or service class. |
| **Contracts** | `contracts/repository/`, `contracts/services/` | Interfaces ("ports") that infrastructure implements. This is what makes use cases testable and framework-agnostic. |
| **Infrastructure — HTTP** | `infrastructure/http/*.controller.ts`, `*.router.ts`, `*.schema.ts` | Controllers translate HTTP → use case calls and shape responses; routers register routes and attach schemas; schemas are TypeBox definitions. |
| **Infrastructure — DB** | `infrastructure/db/*.repository.ts` | Implements a repository contract against PostgreSQL. |
| **Infrastructure — services** | `infrastructure/service/`, `infrastructure/file/` | Implements a service contract (hashing, JWT, file storage). |
| **Errors** | `errors/*.errors.ts` | Typed `CustomError` subclasses for that module. |

New code should be added to the matching layer of the matching module — don't create new
top-level folders or bypass a layer (e.g. a controller must not query the database directly).

---

## Development Principles

- **SOLID** — each use case has one reason to change (single responsibility); dependencies point
  inward toward `contracts/` interfaces, never toward concrete infrastructure (dependency
  inversion); repositories/services are swappable because controllers and use cases only know
  about interfaces.
- **DRY** — shared logic lives in `src/shared/`. But prefer duplication over a premature shared
  abstraction used by only one caller — this codebase has already had unused "just in case"
  abstractions (a dead `ValidationService`, an unused `exceptions.ts`) removed because nothing
  ever called them. Don't reintroduce that pattern.
- **KISS** — manual DI instead of a framework; `postgres.js` tagged-template queries instead of an
  ORM; plain SQL migration files instead of a migration framework. Follow this project's existing
  preference for the simplest tool that works over a more "proper" abstraction.
- **YAGNI** — don't add configuration options, interfaces, or extension points for requirements
  that don't exist yet. Build for the current use case.
- **Composition over inheritance** — the only inheritance in the codebase is the `CustomError` →
  per-module error subclass hierarchy (a deliberate, narrow exception for HTTP status modeling).
  Everything else — use cases, controllers, repositories — is composed via constructor injection.
  Don't introduce base classes for controllers/use cases/repositories to share behavior; extract a
  function or a small collaborator instead.
- **Dependency Injection** — always via constructor parameters, typed against `contracts/`
  interfaces. Wiring happens once, in `src/container.ts`. Never use a service locator, global
  singleton lookup, or `new ConcreteClass()` inside a use case/controller for something that has a
  contract.

---

## Coding Standards

### TypeScript

- `strict: true` plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
  `noImplicitOverride`, `noPropertyAccessFromIndexSignature`, `noUnusedLocals`,
  `noUnusedParameters` are all enabled — write code that satisfies these, don't relax them.
- Never use `any`. Use `unknown` and narrow it, or define a proper type/interface.
- Module system is `NodeNext` — relative and internal imports must include the `.ts` extension
  (`allowImportingTsExtensions: true`), e.g. `import { env } from "@/config/index.ts"`.
- Path aliases: `@/*` maps to `src/*`. **Use `@/*`.** A second alias, `#src/*`, exists in
  `tsconfig.json` and is used only in three bootstrap files (`shared/db/postgres.ts`,
  `migrate.ts`, `reset.ts`) — this is a pre-existing inconsistency, not a convention to follow;
  new code should use `@/*`.

### Naming conventions

- Interfaces: `I` prefix — `IPlaylistRepository`, `IAuthService`, `IMediaUsecase`.
- DTOs: `*DTO` suffix (e.g. `AuthResultDTO`, `MediaResponseDTO`). Note: a handful of existing types
  use `*Dto` (lowercase) instead — this is an inconsistency in the existing code, not a style
  choice; **use `DTO` (uppercase)** in new code.
- Errors: `*Error` suffix, always extending `CustomError`, always setting an explicit
  `statusCode`.
- Use case interfaces: prefer method-shorthand signatures (`methodName(args): ReturnType;`), which
  is what most usecase contracts in this repo use. `IAuthUsecase` uses arrow-property syntax
  instead — that's the exception, not the pattern to copy.
- Files: `kebab-case`, with a suffix identifying the layer — `playlist-item.usecase.ts`,
  `playlist.controller.ts`, `media.repository.ts`, `playlist.errors.ts`, `playlist.schema.ts`.
  Two existing files (`PGUserRepository.ts`, `PostgresTransactionManager.ts`) use PascalCase —
  legacy inconsistency; new repository/service files should use the kebab-case pattern.

### File organization

- One class or one closely-related group of functions per file.
- Keep a module's `domain/`, `application/`, `contracts/`, `infrastructure/`, `errors/` folders
  mirrored across modules — don't invent a new folder shape for a new module.

### Import ordering

No import-order lint rule is currently configured (TODO — see below). The de facto convention
observed throughout the codebase: external packages first, then `@/`-aliased internal imports,
then relative imports. Follow this even though it isn't enforced by tooling yet.

### Error handling

- Throw typed `CustomError` subclasses; don't return error objects or `null`-as-error.
- Repositories catch driver/filesystem exceptions, log them (see Logging), and re-throw a typed
  error from that module's `errors/` file — never let a raw driver exception escape a repository.
- Use cases throw domain errors for business-rule violations (e.g. `InvalidPlaylistTitleError`,
  `PlaylistItemPositionError`).
- Let errors propagate to the global handler (`src/shared/http/error-handler.ts`) — don't
  `try/catch` inside a controller just to format a response.

### Logging

- Use the shared `logger` from `src/shared/logger/logger.ts` outside the request lifecycle
  (repositories, file service, transaction manager); use `request.log` / `request.log.child({...})`
  inside controllers.
- `info`: business events only (registration, login, logout, playlist/media
  create/update/delete), logged from controllers after the use case succeeds.
- `warn`: suspicious-but-recoverable situations (e.g. a refresh token hash mismatch, an upload
  whose content doesn't match its declared type).
- `error`: infrastructure failures (database, filesystem, `ffprobe`, transactions) and unexpected
  exceptions. Log once, at the layer where the failure occurs, and call `markLogged(error)` before
  re-throwing so the global handler doesn't log it a second time.
- Never log passwords, password hashes, JWTs, refresh tokens, the `Authorization` header, or any
  other secret. The logger redacts `headers.authorization` automatically, but don't rely on that
  as the only safeguard — don't pass secret values into a log call's data object in the first
  place.
- Don't log on every request or every successful read — keep logs meaningful (see Features list
  in `README.md` for what counts as a loggable business event).

### Validation

- Request shape (body/params/querystring) is validated declaratively with TypeBox schemas
  attached to the route — add a schema for every new route, don't validate shape by hand in a
  controller.
- Business-rule validation (e.g. a value is syntactically valid but semantically wrong, like a
  position out of range) belongs in the use case layer and should raise a typed `CustomError`.
- Never trust `request.body`/`request.params`/`request.query` types without a schema backing them.

---

## Fastify Conventions

- **Routes**: one `*.router.ts` (or `*.route.ts`) per module, registered in `src/app.ts`. Each
  route declares its `schema` (body/params/querystring/response where relevant) and binds a
  controller method as its handler.
- **Controllers**: thin. A controller method authenticates the caller (`getAuthPayload`), calls
  exactly one use case method, logs a business event on success, and shapes the HTTP response
  (status code, body). No direct database or filesystem access, no business logic.
- **Use Cases**: all business logic and orchestration across repositories/services. Depend only on
  `contracts/` interfaces.
- **Repositories**: implement a `contracts/repository/` interface. Always use parameterized
  `postgres.js` tagged-template queries. Accept an optional trailing `tx?: IDbTransaction` and
  fall back to the shared connection (`getDb()`) when it isn't provided.
- **Plugins**: registered centrally in `src/app.ts` (`@fastify/rate-limit`, `@fastify/cors`,
  `@fastify/helmet`, `@fastify/multipart`). Don't register a plugin inside a module — plugin
  registration is app-level, not module-level.
- **Hooks**: the `onClose` hook closes the database connection. The global error handler is
  registered via `fastify.setErrorHandler(...)` in `src/shared/http/error-handler.ts` — there is
  exactly one, shared by every route.
- **Schemas**: TypeBox `Type.Object(...)` definitions in each module's `*.schema.ts`, imported by
  both the router (for validation) and, via `Static<typeof Schema>`, the controller (for request
  typing). Shared primitives (`Uuid`, `IdParams`) live in `src/shared/http/schemas.ts`; shared
  pagination types live in `src/shared/types/pagination.types.ts`.

---

## Database

- **No ORM or query builder.** `postgres.js` tagged-template SQL only. Never string-concatenate
  SQL — always use the tagged-template form so values are parameterized.
- **Migrations**: plain, sequentially numbered `.sql` files in `migrations/`, applied by a custom
  runner (`npm run migrate`) that tracks applied files in a `schema_migrations` table and only
  runs new ones. Write migrations forward-only (no down-migrations exist in this project); if a
  previous migration needs to be undone, write a new migration that reverts it (see
  `012_revert_ids_to_uuid.sql` for an example of this pattern).
- **Repository conventions**:
  - Constructor takes `sql = getDb()` as a default parameter.
  - Every public method accepts an optional trailing `tx?: IDbTransaction` for participation in a
    caller's transaction.
  - Wrap the query in `try { ... } catch (error) { log; throw typed CustomError; }` — see Error
    Handling and Logging above.
  - Filter by `owner_id` (or join through the owning resource) wherever a record must be scoped to
    the calling user — see the `playlists`/`playlist_items` repositories for the pattern.
- **Transactions**: use `ITransactionManager.withTransaction(async (tx) => { ... })` for any
  operation that writes to more than one table, or that must not partially apply (e.g. user +
  session creation, playlist item reordering). Thread `tx` through every repository call inside
  the callback.

---

## Testing Guidelines

- **Unit tests** (`src/tests/unit/`) test a use case in isolation. All repository/service
  dependencies are replaced with `vi.fn()`-based mocks from `src/tests/unit/mocks.ts`; test data is
  built with the factories in `src/tests/unit/factories.ts`. Never hit a real database or
  filesystem in a unit test.
- **Integration tests** (`src/tests/integration/`) exercise the full HTTP stack via Fastify's
  `inject()`, against a real PostgreSQL database and, for media, the real filesystem under
  `storage/`. Never mock anything in an integration test — if a dependency needs to be faked,
  that's a unit test's job. Integration tests run sequentially (`fileParallelism: false` in
  `vitest.config.ts`) because they share one database; don't write tests that assume isolation
  from other tests running concurrently.
- **Mocking rules**: mock at the contract boundary only (repositories, services) — never mock a
  use case, a DTO, or a plain function. A test file is either fully mocked (unit) or fully real
  (integration); don't mix the two styles in one file.
- **Test naming**:
  - Unit tests: `it("should <expected behavior>", ...)`.
  - Integration tests: plain, present-tense behavior descriptions without "should" — e.g.
    `it("returns 404 when the playlist does not exist", ...)`, `it("creates a playlist owned by
    the caller", ...)`.
  - Group related tests with `describe("<UsecaseName>" | "<METHOD> /route", ...)`.
- **Arrange–Act–Assert**: keep the three phases visually distinct within a test — set up
  mocks/fixtures, perform the one action under test, then assert. Don't interleave assertions with
  setup.

---

## Error Handling

- **Domain errors**: business-rule violations raised by use cases (e.g. `PlaylistNotFoundError`,
  `UserAlreadyExistsError`, `PlaylistItemPositionError`). Each extends `CustomError` with an
  explicit status code (mostly 4xx).
- **Validation errors**: schema violations are rejected by Fastify/AJV before the handler runs
  (400), with no application code involved.
- **Infrastructure/HTTP errors**: repository/file-service/transaction failures are wrapped in
  typed `CustomError`s (5xx) at their origin, logged there, then propagated. The single global
  error handler (`registerErrorHandler`) converts any `CustomError` — or any other exception — into
  `{ statusCode, error, message }`. It does not log 4xx errors, and it does not re-log a 5xx error
  that was already logged at its origin (see `markLogged`/`hasBeenLogged` in
  `src/shared/logger/logger.ts`).
- Status codes actually used in this codebase: `400`, `401`, `404`, `409`, `416`, `500`. Ownership
  mismatches return `404` (not `403`) — a resource that exists but isn't owned by the caller looks
  identical to a resource that doesn't exist, to avoid confirming its existence to non-owners.
  Follow this pattern for new ownership checks rather than introducing `403`.

---

## API Design

- **REST conventions**: resource-based plural nouns (`/playlists`, `/playlist-items`, `/media`),
  standard HTTP verbs, nested-looking-but-flat routes (e.g. `/playlist-items/:id/items` for a
  playlist's items, rather than true path nesting).
- **Status codes**: `200` reads, `201` creation, `204` deletion (empty body — never send a message
  body with `204`), `4xx` for expected/business errors, `500` for unexpected/infrastructure
  failures. See Error Handling above for the exact set in use.
- **Pagination**: `limit`/`offset` query params (default `20`/`0`, `limit` capped at `100`),
  returned as `{ items, total, limit, offset }`. Use the shared `PaginationQueryString` schema and
  `PaginatedResponse<T>` type (`src/shared/types/pagination.types.ts`) for any new paginated
  endpoint — don't invent a different pagination shape.
- **Filtering**: not implemented anywhere in the API. TODO if a future endpoint needs it — don't
  add ad hoc filtering to one endpoint without a documented, consistent convention.
- **Sorting**: not configurable by the client; ordering is fixed server-side (e.g. most recent
  first, or playlist position). TODO if configurable sorting is required.

---

## Performance

- **Avoid unnecessary allocations**: prefer streaming and direct pass-through over buffering full
  payloads in memory, matching the existing media pipeline (see Streaming below). No specific
  micro-optimization rules beyond this are documented for this project — don't optimize
  prematurely; correctness and the layering rules above take priority.
- **Efficient database queries**: filter in SQL (`WHERE owner_id = ...`), not in application code
  after fetching everything. Use the existing indexes as a guide for query shape (e.g.
  `idx_playlist_items_playlist_position (playlist_id, position)` — write queries that can use it).
  Avoid N+1 patterns; a repository method should generally be one query (or a small, fixed number
  of queries, as `getByOwnerId`/`getAllItems` already do for count + page).
- **Streaming**: media upload writes via a Node stream pipeline with a size-limiting transform
  (`SizeLimitStream`), never buffering the full upload in memory. Media reads use `fs.createReadStream`
  and support HTTP Range requests (206 partial content) instead of loading whole files. Follow this
  pattern for any new large-payload endpoint.

---

## Security

- **Authentication**: JWT access tokens (short-lived) + refresh tokens (longer-lived, rotated on
  every use), verified via `Authorization: Bearer <token>`. See `README.md` for the full flow.
- **Authorization**: ownership checks (`owner_id`) enforced in the repository query itself for
  playlists, playlist items, and media deletion. Media reads/listing are intentionally not
  ownership-scoped — the media library is shared across authenticated users by design; don't add
  owner filtering to `GET /media` or `GET /media/:mediaId` without an explicit product decision to
  change that.
- **Input validation**: TypeBox/AJV on every route (see Validation above).
- **SQL injection prevention**: exclusively via `postgres.js` tagged-template parameterization.
  Never build a query with string concatenation or template literals that aren't the `sql`
  tagged-template itself.
- **XSS**: not directly applicable — this is a JSON-only API with no server-rendered HTML.
  `@fastify/helmet` sets baseline security headers regardless. If any endpoint ever renders HTML or
  echoes user input into another HTML context, escape it explicitly at that point.
- **CSRF**: not implemented and not currently needed — authentication is a stateless `Authorization`
  header (Bearer token), not a cookie, so CSRF (which exploits ambient cookie auth) doesn't apply.
  TODO: if cookie-based auth is ever introduced, CSRF protection must be added at that time.
- **Secrets management**: configuration (including JWT secrets and DB credentials) comes from
  environment variables via `env-schema`/`.env`. Secrets are never logged (see Logging). There is
  no external secrets manager/vault integration — TODO if required for production deployment.
- **Password/token hashing**: scrypt with a random salt per value, for both passwords and refresh
  tokens. Never store or return a plaintext password or refresh token.

---

## Code Review Checklist

- [ ] Does the change respect module layering (controller → use case → contract → infrastructure),
      with no layer skipped or reversed?
- [ ] Do use cases depend only on `contracts/` interfaces, never on a concrete
      repository/service class?
- [ ] Are new routes validated with a TypeBox schema (body/params/querystring/response as
      applicable)?
- [ ] Does every new/changed repository query filter by `owner_id` where the resource should be
      scoped to a user?
- [ ] Are new repository methods wrapped in `try/catch`, logging the error and throwing a typed
      `CustomError`, with `tx?: IDbTransaction` support if used inside a transaction?
- [ ] Are multi-table or multi-step writes wrapped in `transactionManager.withTransaction(...)`?
- [ ] Does new business-event logging use `request.log.child({...ids})` with only non-sensitive
      identifiers?
- [ ] Is any new `error`-level log call paired with `markLogged(error)` before the error is
      re-thrown, to avoid a duplicate log at the global handler?
- [ ] Are passwords, hashes, JWTs, refresh tokens, and the `Authorization` header absent from
      every log call and every response body?
- [ ] Do unit tests mock all dependencies, and do integration tests avoid mocking anything?
- [ ] Does the change avoid introducing `any`, `@ts-ignore`, or a relaxed `tsconfig` flag?
- [ ] Does the change avoid new abstractions (interfaces, base classes, config flags) that only
      one caller uses?
- [ ] Do new identifiers follow existing naming conventions (`I`-prefixed interfaces, `*DTO`,
      `*Error`, kebab-case files)?
- [ ] Have `npm run lint`, `npm run build` (typecheck), and `npm test` all been run and passed?

---

## Things Claude Should Never Do

- Never use `any`.
- Never use `@ts-ignore` or `@ts-expect-error` to silence a real type error.
- Never disable an ESLint rule (inline or in config) to make code pass — fix the underlying issue.
- Never relax a `tsconfig.json` strictness flag to make code compile.
- Never let a use case import a concrete repository/service class — depend on its `contracts/`
  interface.
- Never write raw string-concatenated SQL, or bypass `postgres.js`'s tagged-template
  parameterization.
- Never log a password, password hash, JWT, refresh token, or the `Authorization` header.
- Never return a password hash or refresh token in an API response.
- Never bypass TypeBox schema validation for a route that accepts user input.
- Never duplicate business logic that already exists in a use case — call it, don't reimplement
  it.
- Never invent an endpoint, field, or behavior that isn't in the codebase or explicitly requested —
  check `README.md` and the actual router files before describing or building against the API.
- Never modify files unrelated to the requested change.
- Never change a public interface (controller response shape, exported type, repository contract)
  without an explicit reason tied to the task.
- Never introduce a new dependency-injection framework, ORM, or other heavy abstraction in place of
  the existing manual-DI / `postgres.js` approach without being asked.
- Never add a new top-level folder or restructure a module's layering as a side effect of an
  unrelated change.
- Never commit `.env`, credentials, or generated `storage/` content.

---

## Preferred Coding Style

- Formatting is enforced by Prettier (`npm run format`): double quotes, trailing commas
  everywhere, default semicolons and indentation. Don't hand-format against these settings.
- Linting is enforced by ESLint (`typescript-eslint` recommended rules +
  `eslint-config-prettier`). Fix lint errors rather than suppressing them.
- Prefer `async`/`await` over raw Promise chaining (used consistently throughout the codebase).
- Prefer explicit return types on exported functions/methods, matching the existing interfaces and
  use case signatures.
- Prefer small, focused functions/methods over large multi-responsibility ones — this mirrors the
  existing use case methods, which each do one thing (create, get, update, delete, list).
- Comment only to explain *why*, not *what* — this matches the existing codebase's sparse,
  high-signal commenting style (see the comments in `PostgresTransactionManager.ts` or
  `error-handler.ts` for the expected tone and density). Don't restate what the code already says.

---

## Common Commands

```bash
npm run dev         # development: file watching + pretty-printed logs
npm run build       # type-check the project (tsc, noEmit)
npm start           # run once, without watching — structured JSON logs to stdout
npm run migrate     # apply pending SQL migrations
npm run db:reset    # drop all tables/types/functions (local dev only)
npm test            # run the full test suite once (requires a migrated database)
npm run test:watch  # run tests in watch mode
npm run lint        # lint
npm run lint:fix    # lint and autofix
npm run format      # check formatting
npm run format:fix  # apply formatting
```

Run a single test file: `npx vitest run src/tests/unit/auth/auth.usecase.test.ts`
Run by test name: `npx vitest run -t "should register user successfully"`

---

## TODOs (project information currently unavailable or unconfigured)

- **CI/CD**: no `.github/workflows` or equivalent exists. TODO: define the pipeline (lint,
  typecheck, test, migration check) before relying on this file for CI guidance.
- **Docker**: no `Dockerfile`/`docker-compose.yml` exists. Local development assumes a manually
  provisioned PostgreSQL instance.
- **`.env.example`**: referenced by `.gitignore` (`!.env.example`) but does not exist in the repo.
- **Import-order enforcement**: no ESLint import-order/sort plugin is configured; the ordering
  convention described above is observed, not enforced.
- **OpenAPI/Swagger**: not implemented. TypeBox schemas exist and could generate one, but no
  generation step is wired up.
- **Test coverage thresholds**: `@vitest/coverage-v8` is a dependency, but no coverage script or
  threshold is configured in `package.json`/`vitest.config.ts`.
- **Commit message / PR conventions**: none documented in the repository.
- **Connection pool tuning**: `postgres.js` is used with default connection settings; no documented
  pool-size or timeout policy.
- **Secrets manager**: none integrated; secrets are environment variables only.
- **Filtering/sorting API conventions**: not implemented anywhere yet — if added, define a single
  convention and reuse it, rather than inventing one per endpoint.
