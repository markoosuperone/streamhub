# SuperPlayer

SuperPlayer is a REST API for uploading, streaming, and organizing audio/video media into
playlists. It's built with Fastify and TypeScript on PostgreSQL, following a clean, layered
architecture with JWT authentication, server-side session storage, and structured logging
throughout.

## Features

- JWT authentication with refresh token rotation
- Server-side session storage and single-session logout
- Password hashing (scrypt)
- Media upload with MIME/type sniffing and file size limits
- Media streaming with HTTP Range support (partial content)
- Media duration extraction via `ffprobe`
- Playlist management (create, read, update, delete, list)
- Playlist items with ordered positions (insert, reorder, remove)
- Pagination on list endpoints
- Request validation via TypeBox JSON Schema
- PostgreSQL persistence via parameterized queries
- Database transactions for multi-step writes
- Clean Architecture (domain / application / infrastructure layers per module)
- Structured logging with Pino
- Rate limiting on authentication and upload endpoints
- Security headers (Helmet) and CORS
- Health check endpoint
- Unit and integration tests (Vitest)

## Tech Stack

- **TypeScript** (strict mode)
- **Fastify 5** — HTTP server framework
- **PostgreSQL** — primary datastore
- **postgres.js** — SQL client (tagged-template queries, no ORM)
- **TypeBox** — schemas compiled to JSON Schema, validated by Fastify's built-in AJV
- **Pino** — structured JSON logging
- **jsonwebtoken** — JWT signing/verification
- **Node.js `crypto` (scrypt)** — password and refresh-token hashing
- **uuid (v7)** — time-ordered identifiers for new records
- **ffprobe** (external binary) — media duration extraction
- **@fastify/multipart** — file upload handling
- **@fastify/rate-limit** — per-route rate limiting
- **@fastify/helmet** — security headers
- **@fastify/cors** — CORS handling
- **Vitest** — unit and integration testing
- **ESLint + Prettier** — linting and formatting

## Architecture

The codebase follows **Clean Architecture**, applied per bounded-context module (`auth`, `media`,
`playlists`, `users`, `transaction`). Each module is organized into layers:

- **Domain** — plain entities and value types
- **Application (Use Cases)** — business logic and orchestration; depends only on interfaces in
  `contracts/`, never on concrete infrastructure
- **Contracts** — interfaces ("ports") for repositories and services, implemented by infrastructure
- **Infrastructure** — concrete adapters:
  - **Controllers** — translate HTTP requests into use case calls and shape responses
  - **Routers** — register routes and attach TypeBox validation schemas
  - **Repositories** — data access against PostgreSQL
  - **Services** — cross-cutting concerns (hashing, JWT issuance, file storage)

**Dependency injection** is manual and explicit, wired in `src/container.ts` — there's no DI
framework or decorators. `index.ts` builds the container, then builds the Fastify app around it.

A **transaction manager** (`ITransactionManager` / `PostgresTransactionManager`) wraps
`postgres.js`'s `db.begin(...)` so use cases can run multiple repository calls atomically (e.g.
registering a user and creating their first session, or reordering playlist items). Every
repository method accepts an optional trailing transaction handle and falls back to the shared
connection when one isn't provided.

Errors are typed classes extending a common `CustomError` that carries an HTTP status code,
grouped per module under each module's `errors/` folder. A single global error handler maps these
— and any unexpected exception — to a consistent JSON error response.

## Project Structure

```
.
├── index.ts              # Entrypoint: builds the container, builds the app, starts listening
├── migrations/           # Versioned, hand-written SQL migrations
├── storage/              # Uploaded media files (local disk storage)
└── src/
    ├── app.ts            # Fastify setup: plugins, error handler, route registration
    ├── container.ts      # Manual dependency injection / composition root
    ├── config/           # Environment variable schema and typed config object
    ├── auth/             # Registration, login, refresh, logout, sessions, JWT, hashing
    ├── users/            # User entity, DTOs, and repository
    ├── media/            # Upload, streaming, deletion, file storage, ffprobe integration
    ├── playlists/        # Playlists and playlist items (ordered media collections)
    ├── transaction/      # Transaction manager abstraction and PostgreSQL implementation
    ├── server/health/    # Health check route
    ├── shared/           # Cross-cutting utilities
    │   ├── db/           # PostgreSQL connection, migration runner, reset script
    │   ├── error/        # Base CustomError class
    │   ├── http/         # Global error handler, shared TypeBox schemas
    │   ├── logger/       # Shared Pino logger instance and error-dedup helper
    │   ├── stream/       # Upload size-limiting transform stream
    │   ├── types/        # Shared pagination types
    │   └── utility/      # UUID generation, title normalization, auth helper
    └── tests/
        ├── unit/         # Use case tests with mocked dependencies
        └── integration/  # End-to-end tests against a real database and filesystem
```

Each of `auth`, `media`, and `playlists` mirrors the same `domain/` → `application/` →
`contracts/` → `infrastructure/` → `errors/` layout described in Architecture above.

## Installation

1. **Clone and install**

   ```bash
   git clone <repository-url>
   cd SuperPlayer
   npm install
   ```

2. **Provide PostgreSQL and `ffprobe`** — a reachable PostgreSQL instance, and the `ffprobe`
   binary (part of FFmpeg) available on `PATH` for media duration extraction.

3. **Configure environment variables** — create a `.env` file in the project root (see
   [Environment Variables](#environment-variables) below).

4. **Run migrations**

   ```bash
   npm run migrate
   ```

5. **Start the server** — see [Running](#running) below.

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `POSTGRES_URL` | Yes | — | PostgreSQL host used to build the connection config |
| `POSTGRES_PORT` | No | `5432` | PostgreSQL port |
| `POSTGRES_USER` | Yes | — | PostgreSQL username |
| `POSTGRES_PASSWORD` | Yes | — | PostgreSQL password |
| `POSTGRES_DB` | Yes | — | PostgreSQL database name |
| `DATABASE_URL` | Yes | — | Full connection string used by the `postgres.js` client and migration runner |
| `LOG_LEVEL` | Yes | — | Pino log level: `debug`, `info`, `warn`, or `error` |
| `HOST` | No | `localhost` | Host/interface the HTTP server binds to |
| `PORT` | No | `8000` | Port the HTTP server listens on |
| `JWT_ACCESS_SECRET` | Yes | — | Secret used to sign access tokens |
| `JWT_REFRESH_SECRET` | Yes | — | Secret used to sign refresh tokens |
| `JWT_ACCESS_EXPIRES_IN` | No | `3600` | Access token lifetime, in seconds |
| `JWT_REFRESH_EXPIRES_IN` | No | `86400` | Refresh token lifetime, in seconds |
| `MAX_FILE_SIZE_BYTES` | No | `524288000` (500 MB) | Maximum accepted upload size |

## Running

```bash
npm run dev          # development: file watching + pretty-printed logs
npm run build        # type-check the project
npm start            # run once, without watching — structured JSON logs to stdout
npm test             # run the test suite once
npm run test:watch   # run tests in watch mode
npm run lint         # lint
npm run format       # check formatting
```

Integration tests exercise the real HTTP layer (via Fastify's `inject`), a real PostgreSQL
database, and, for media, the real filesystem under `storage/` — a configured and migrated
database is required to run the full suite. They run sequentially, since they share one database.

## Database

- **Engine:** PostgreSQL, accessed through `postgres.js` with tagged-template SQL — no query
  builder.
- **Migrations:** plain, sequentially numbered SQL files in `migrations/`, applied by a custom
  runner (`npm run migrate`) that tracks and skips already-applied migrations. `npm run db:reset`
  drops all tables, types, and functions for a clean local slate.
- **Schema:** `users`, `sessions`, `media_items`, `playlists`, and `playlist_items`. Deleting a
  user cascades to their `playlists` and `media_items` (and, transitively, `playlist_items`); the
  `sessions.user_id` foreign key does not cascade.
- **Transactions:** multi-step writes that must be atomic — user registration (create user +
  session), and playlist item creation/update/deletion (which also shift sibling positions) — run
  inside a transaction via the shared transaction manager.

## API

### Authentication

- `POST /register` — create a user account, returns tokens and a session
- `POST /login` — authenticate with email/password, returns tokens and a session
- `POST /refresh-token` — exchange a valid refresh token for a new, rotated token pair
- `POST /logout` — revoke the current session

### Playlists

- `POST /playlists` — create a playlist
- `GET /playlists` — list the caller's playlists (paginated)
- `GET /playlists/:id` — get a playlist by id
- `PATCH /playlists/:id` — update a playlist's title
- `DELETE /playlists/:id` — delete a playlist

### Playlist Items

- `POST /playlist-items` — add a media item to a playlist at a given (or next available) position
- `GET /playlist-items/:id` — get a single playlist item
- `GET /playlist-items/:id/items` — list a playlist's items, ordered by position (paginated)
- `PATCH /playlist-items/:id` — move an item to a new position, shifting siblings accordingly
- `DELETE /playlist-items/:id` — remove an item from a playlist

### Media

- `POST /media/upload` — upload an audio/video file (multipart)
- `GET /media` — list media (paginated)
- `GET /media/:mediaId` — stream a media file, with HTTP Range support
- `DELETE /media/:mediaId` — delete a media item (file and record)

Media is a shared library: any authenticated user can list and stream any item. Ownership is
enforced only for deletion — a media item can only be deleted by the user who uploaded it.

### Health Check

- `GET /health` — reports application and database connectivity status

## Validation

Request bodies, path parameters, and query strings are defined as **TypeBox** schemas attached to
their routes. Fastify compiles these to JSON Schema and validates every request through its
built-in AJV validator before the handler runs, rejecting invalid input with `400` — covering
required fields, types, string formats (UUIDs, emails), and numeric ranges (pagination limits).

Rules that go beyond request shape — rejecting a blank playlist title after trimming, or checking
that a playlist position is within bounds — are enforced in the use case layer and raise typed
errors.

## Authentication

- **Access tokens** are short-lived JWTs (default 1 hour), sent as `Authorization: Bearer <token>`
  and verified on every protected route.
- **Refresh tokens** are longer-lived JWTs (default 24 hours) used only to obtain a new token pair.
  Each refresh rotates the token — the previous one can't be reused.
- **Sessions:** refresh tokens are never stored in plaintext. Each login/registration creates a
  session row in PostgreSQL, keyed by a session id embedded in the JWT payload and storing a
  scrypt hash of the refresh token. Refreshing requires both a valid JWT signature and a matching
  hash on that session. Logging out deletes the session, invalidating its refresh token
  immediately.
- **Passwords** are hashed with scrypt (random salt per password); plaintext passwords and hashes
  are never included in API responses.

## Error Handling

Business and infrastructure errors are typed classes extending a shared `CustomError`, each
carrying an explicit HTTP status code (e.g. `PlaylistNotFoundError` → 404, `UserAlreadyExistsError`
→ 409). A global Fastify error handler converts any `CustomError` — or unexpected exception — into
a consistent JSON response:

```json
{ "statusCode": 404, "error": "PlaylistNotFoundError", "message": "Playlist not found" }
```

Expected business errors (4xx) aren't logged as failures. Unexpected exceptions and infrastructure
failures are logged before a generic response is sent, so internal details never leak to the
client.

## Logging

Logging runs on Fastify's integrated **Pino** logger, with one shared instance used both for
per-request logging and for logging outside the request lifecycle:

- **Business events** (registration, login, logout, playlist/media create/update/delete) are
  logged at `info` via `request.log.child(...)`, attaching identifiers such as request id, user
  id, playlist id, media id, and session id.
- **Infrastructure failures** (database errors, filesystem errors, `ffprobe` failures, failed
  transactions) are logged at `error` with technical context at the layer where they occur —
  repositories, the file service, the transaction manager — before being re-thrown as typed
  errors. A small deduplication mechanism stops the same failure from also being logged by the
  global error handler.
- **Suspicious-but-recoverable situations** (a refresh token that doesn't match its stored hash, an
  upload whose content doesn't match its declared type) are logged at `warn`.
- Passwords, hashes, JWTs, refresh tokens, and the `Authorization` header are never logged; the
  `Authorization` header is explicitly redacted at the logger level.

## Testing

Built on **Vitest**:

- **Unit tests** (`src/tests/unit/`) exercise use cases in isolation, with repositories and
  services replaced by mocks — covering business rules like playlist item position shifting,
  ownership-based lookups, and error propagation.
- **Integration tests** (`src/tests/integration/`) exercise full HTTP request/response cycles via
  Fastify's `inject`, against a real database and, for media, the real filesystem — covering auth
  flows, CRUD behavior, pagination, validation errors, and Range-based streaming.

## Security

- Salted scrypt hashing for passwords and refresh tokens
- Short-lived JWT access tokens with rotating, server-verifiable refresh tokens
- Request validation on every route (TypeBox/AJV), rejecting malformed input before it reaches
  application code
- Rate limiting on authentication endpoints and media upload
- Security headers (`@fastify/helmet`) and CORS (`@fastify/cors`)
- Path traversal protection on all filesystem access
- Upload type verification by inspecting file content, not just declared MIME type
- Ownership checks on playlist, playlist item, and media deletion

## Future Improvements

- OpenAPI/Swagger documentation generated from the existing TypeBox schemas
- CI/CD pipeline (lint, typecheck, test, migration check on every pull request)
- Dockerfile and Docker Compose setup for local development and deployment
- Object storage backend (e.g. S3-compatible) as an alternative to local disk storage
- Redis-backed caching for frequently accessed data (e.g. playlist listings)
- Background job processing for media post-processing (e.g. transcoding)
- Metrics and monitoring (e.g. Prometheus/OpenTelemetry) on top of the existing structured logs
- Session expiration enforcement on refresh (currently stored but not validated)
- `.env.example` file for faster onboarding

## License

MIT
