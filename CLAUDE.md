# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository. It is the
root instruction file for the whole monorepo. Two subtrees have their own, more detailed
instruction files that layer on top of this one when you're working inside them:

- **`server/CLAUDE.md`** — full backend conventions (Clean Architecture layering, DI, error
  handling, logging, testing, security checklist). Read it before touching anything under `server/`.
- **`front/CLAUDE.md`** → `front/AGENTS.md` — a short but critical warning: **this project runs a
  modified/canary Next.js build, not the Next.js you were trained on.** APIs, conventions, and
  file structure may differ from your training data. Check `node_modules/next/dist/docs/` before
  assuming how an API behaves, and heed deprecation notices.

This file covers the project as a whole, and — since that's where most of the undocumented
architecture lives — the frontend (`front/`) in depth. Backend-specific rules live in
`server/CLAUDE.md`; don't duplicate or second-guess them here.

---

## 1. Project Overview

**SuperPlayer** is an application for uploading, streaming, and organizing audio/video media into
playlists. A user registers, uploads media (audio or video files), browses a shared media library
(search, filter by type, paginate), plays it back with a persistent up-next/history queue, and
organizes items into personal playlists.

It's an npm-workspaces monorepo with three packages:

| Package | Role |
|---|---|
| `server/` | Fastify 5 REST API — auth, media, playlists, users. Clean/hexagonal architecture. See `server/CLAUDE.md`. |
| `front/` | Next.js 16 (canary) + React 19 app — Feature-Sliced Design. Covered in depth below. |
| `packages/contracts` (`@superplayer/contracts`) | Shared DTOs — the single source of truth for request/response shapes on both sides of the HTTP boundary. |

**Tech stack:**

- TypeScript (strict) everywhere.
- Backend: Fastify 5, PostgreSQL via `postgres.js` (no ORM), TypeBox/AJV validation, Pino logging,
  JWT auth, Vitest. Full detail in `server/CLAUDE.md` / `server/README.md`.
- Frontend: Next.js 16 canary, React 19, Zustand 5, CSS Modules, ESLint 9 flat config with
  `eslint-plugin-boundaries` enforcing Feature-Sliced Design. Tailwind is installed but is **not**
  the project's styling approach — see Code Style below.
- Frontend is tested with Vitest + React Testing Library (jsdom) — see Testing below.

---

## 2. Architecture (Frontend — Feature-Sliced Design)

`front/app/` is organized as FSD layers, low to high:

```
shared → entities → features → widgets → pages → app
```

A layer may only import from layers **below** it. Never from its own layer's sibling slices, and
never from above. This is enforced by ESLint (`eslint-plugin-boundaries`, configured via
`@feature-sliced/eslint-config/rules/layers-slices`) — a boundary violation is a lint error, not a
style suggestion.

| Layer | Location | Responsibility |
|---|---|---|
| **shared** | `app/shared/` | Generic, domain-agnostic UI (`ui/Button`, `Modal`, `Menu`, `Pagination`, `SearchInput`, `FilterTabs`, `Grid`, `Heading`, `Brand`, icons) and the API client (`api/api.ts`, `api.error.ts`, `endpoints.ts`, `*.api.ts` per resource) plus `routes.ts`. No knowledge of any domain concept. |
| **entities** | `app/entities/{media,player,playlist,user}/` | Domain objects and the state that represents them: a Zustand store per concern (`model/use*Store.ts`) plus pure presentational UI (`ui/MediaCard`, `ui/MediaArtwork`). Two exceptions use React Context instead of Zustand — `user/model/UserContext` and `media/model/UploadProvider` (an `UploadEvents` pub/sub the media list subscribes to). An entity component takes slot props (see below) instead of importing a feature. |
| **features** | `app/features/{auth,media,playlists,upload-media,users,player}/` | User-initiated actions on entities: forms, buttons, menus, and the hooks that drive them (`useMediaFilter`, `useMediaListQuery`, `useAuthSubmit`, `usePlaylists`). Composes an entity's slot props with feature-specific behavior. |
| **widgets** | `app/widgets/{TopBar,PlayerRail,PlaylistsRail,MediaBrowser,LibraryBrowser,PlaylistTracksRail}/` | Self-contained UI blocks composed from multiple features/entities — e.g. `MediaBrowser` wires the media grid, filter tabs, pagination, and per-card menus together. |
| **pages** | `app/pages/{HomePage,AuthPage,LibraryPage,NotFoundPage}/` | Route-level composition of widgets. Deliberately separate from the actual Next.js route files (`app/(main)/page.tsx` just renders `<HomePage />`) so the FSD layer and the Next.js routing convention don't fight each other. |
| **app** | `app/layout.tsx`, `app/(main)/`, `app/auth/`, `app/not-found.tsx`, `app/global-error.tsx`, `proxy.ts` | Next.js App Router: root layout, route groups, global providers (`UserProvider`), the 404 and error boundaries, and the auth-gating middleware (`proxy.ts`). |

**Same-layer cross-slice imports are also forbidden**, not just upward ones: `entities/player` may
not import `entities/media`; `features/auth` may not import `features/users`. When two slices at
the same layer need to share something, either the shared piece moves one layer down, or
composition happens one layer up. Concretely, in this codebase:

- `usePlayerStore.play(item, media)` takes `media` as a parameter instead of importing
  `useMediaStore` directly — the calling widget (`PlayerRail`), which can see both entity stores,
  supplies it.
- `usePlaylistsStore` originally lived at `features/playlists/model/` (nothing outside that slice
  needed it yet). It was promoted to `entities/playlist/model/` only once a second, unrelated
  feature (`features/users`' `AccountMenu`, which needs to reset playlist state on sign-out)
  needed it too — don't promote a store to `entities/` preemptively; do it when a second real
  cross-slice consumer actually shows up.

**Entities stay pure UI + domain shape.** `MediaCard` (an entity) doesn't import
`MediaCardMenu` or `AddToPlaylistButton` (features) directly — it exposes `cornerSlot` /
`actionSlot` props, and the composing widget/feature wires the feature-specific pieces in. Follow
this pattern for any new entity that needs feature-specific UI attached.

**FSD layers live under `front/app/`,** because Next.js reserves the literal folder name `app` at
the project root for the App Router. The ESLint config reflects this explicitly:
`boundaries/root-path: 'app'`.

**Same-origin rewrite, no BFF.** There are no Next.js route handlers: `next.config.ts` rewrites
`/api/:path*` straight to the Fastify backend, so the browser stays on one origin and the auth
cookies stay same-site. `shared/api/endpoints.ts` therefore holds `/api` + the backend's own route
— keep the two in step, since a path that doesn't mirror a real backend route 404s after the
rewrite. Authentication is entirely `httpOnly` cookies set by the backend; the single client in
`shared/api/api.ts` sends `credentials: 'include'` and attaches an `x-csrf-token` header on
mutating requests. No call site ever handles a token. In production the same `/api` mapping belongs
in the reverse proxy, so media bytes skip Node entirely.

**Reuse before rebuilding.** Check `shared/ui` before writing a new button, modal, menu, search
input, filter control, or paginator — this project already has generic versions of all of these.

---

## 3. Code Style

- **TypeScript strict mode.** Both `front/tsconfig.json` and `server/tsconfig.json` set
  `strict: true`; the server additionally enables `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`, `noImplicitOverride`, `noPropertyAccessFromIndexSignature`,
  `noUnusedLocals`, `noUnusedParameters` — match those in backend code (see `server/CLAUDE.md`).
- **`const` over `let`.** Used consistently; reach for `let` only when a value is genuinely
  reassigned (e.g. an accumulator in a loop), not as a default.
- **Union types instead of enums — via an `as const` object, not a raw union alias.** This is the
  established, load-bearing convention across the whole frontend:

  ```ts
  export const BUTTON_VARIANTS = {
    accent: 'accent',
    outline: 'outline',
    ghost: 'ghost',
    // ...
  } as const;

  export type ButtonVariant = (typeof BUTTON_VARIANTS)[keyof typeof BUTTON_VARIANTS];
  ```

  Follow this exact shape (object export + derived type export) for any new closed set of string
  values. Existing examples: `BUTTON_VARIANTS`, `AUTH_MODES`, `AUTH_COOKIES`, `MEDIA_QUERY_PARAMS`,
  `MEDIA_STATUS`, `PLAYLISTS_STATUS`. Never use TypeScript `enum` or `const enum`.
- **Avoid unnecessary abstractions.** Don't generalize a component (generic type params,
  configurable render props) until there's a second real consumer. Don't move a store to a higher
  FSD layer until a second real cross-slice consumer needs it (see the `usePlaylistsStore`
  example above).
- **Keep components small and focused.** Most components in this codebase are well under 100
  lines. When one grows multiple responsibilities, split the data-fetching into a hook and the
  composed UI into child components — see the `MediaBrowser` (composition) / `useMediaListQuery`
  (data) split as the model to follow.
- **Avoid duplicated logic — especially duplicated *state*.** The most consequential bug fixed in
  this codebase so far wasn't duplicated code, it was duplicated *state*: `usePlaylists()` used to
  own its own `useState` + fetch per component, so `PlaylistsRail` and `AddToPlaylistModal` each
  held an independent copy that could silently drift out of sync. The fix was a shared Zustand
  store, not a shared function. When you see two components independently fetching the same data,
  that's the signal.
- **Prefer composition over inheritance.** There is no class inheritance in `front/` outside of
  built-in DOM/React types — functional components, hooks, and composed Zustand stores only.
- **Keep functions pure whenever possible.** Zustand actions should compute new state from
  existing state and their arguments, without hidden side effects — e.g.
  `usePlayerStore.playFromQueue(item)` derives the new queue purely from the store's own current
  `upNext`/`upPrev`, rather than reaching into another store or doing an API call.

---

## 4. React

- **Functional components only.** No class components anywhere in `front/`.
- **Extract reusable logic into custom hooks**, not preemptively — when the same fetch/state
  pattern would otherwise be duplicated (see `useMediaFilter`, `useMediaSearchQuery`,
  `useMediaListQuery`, `useAuthSubmit`).
- **Avoid unnecessary `useMemo`/`useCallback`.** Every existing usage in this codebase has a
  concrete reason — referential stability required by an effect's dependency array (`Menu.tsx`'s
  `close`, wrapped in `useCallback` because it's read inside the outside-click effect) or by
  another hook's dependency array (`useMediaListQuery`'s `setPage`). Don't wrap a handler "for
  performance" without one of these reasons.
- **Don't optimize before profiling.** No speculative memoization or virtualization exists in this
  codebase — keep it that way unless a real, observed performance problem justifies it.
- **Keep server state separate from UI state.** Server-derived collections (the media list,
  playlists, the playback queue, the current user) live in a Zustand store or Context, never in
  component `useState`. Purely local UI state (a modal's open/closed flag, a form field's value, an
  in-flight submit boolean) stays in `useState` in the component that owns it — don't lift it into
  a store "just in case."
- **Keep rendering logic simple.** Components read state via narrow store selectors
  (`useXStore((state) => state.y)`) and render; fetch/orchestration logic lives in a hook, not
  inline in the component body.

---

## 5. State Management (Zustand vs. local state)

**Zustand** — state shared across components with no reasonable common ancestor, or state that
must survive navigation:

- `entities/media/model/useMediaStore.ts` — the loaded media list, `total`, fetch `status`
  (`'idle' | 'loading' | 'loaded' | 'error'`), `error`, and the `fetchMedia`/`addMedia`/
  `removeMedia`/`clearMedia` actions. Fetch orchestration (the actual `MEDIA_API.list` call, with
  `AbortController`-based cancellation of a superseded request) lives **in the store**, not in the
  consuming hook.
- `entities/player/model/usePlayerStore.ts` — `nowPlaying`/`upNext`/`upPrev` and the actions that
  mutate them (`play`, `playFromQueue`, `next`, `prev`, `clearIfPlaying`, `reset`).
- `entities/playlist/model/usePlaylistsStore.ts` — the user's playlists, with the same
  `status`/`error`/`reset()` shape as the media store.

Rules that apply to every store here, learned from real bugs found and fixed in this codebase:

- **One store, one domain concern.** Don't add unrelated state to an existing store — "now
  playing" doesn't belong in `useMediaStore`, which is exactly why `usePlayerStore` is separate.
- **No cross-entity store imports.** A store in one entity slice must never import another
  entity's store. Either the calling widget supplies the other entity's data as an action
  parameter, or (once a second real cross-slice consumer needs it) the store is promoted to the
  entities layer.
- **Status as a literal union, not booleans.** Use `status: 'idle' | 'loading' | 'loaded' |
  'error'` (an `as const` object, per Code Style) instead of separate `loading`/`loaded` booleans
  — two independent booleans can represent an invalid combination and have no slot for an error
  state. Pair `status` with an `error: string | null` populated from `ApiError` on failure.
- **Idempotent one-shot fetches need a `loaded`/`loading` guard and a `reset()`.** A store that
  fetches once and caches (like playlists) should skip re-fetching while already loading or
  loaded, and expose `reset()` to clear back to `'idle'` — call it on sign-out so a second user in
  the same tab actually gets a fresh fetch instead of stale cached state.
- **Select narrowly.** `useXStore((state) => state.y)`, never `useXStore((state) => state)` or a
  full destructure — the latter re-renders on every unrelated field change. (`MediaPlayer.tsx`
  currently does this for `next`/`prev`/`upPrev` — a known deviation, not a pattern to copy.)

**Local component state (`useState`)** — input values, hover/focus, open/closed toggles (modals,
menus), in-flight submit flags. If you find yourself passing the same `useState` value through
props to more than one component, that's the signal to promote it to a store, not to keep
threading it deeper.

`entities/user/model/UserContext.tsx` is the one exception to "shared state lives in Zustand" — the
current user is provided via React Context (`UserProvider` in the root layout), hydrated once via
`USERS_API.me()`. This is a pre-existing pattern difference from the other entities, not something
to "fix" by converting it to Zustand unless asked.

---

## 6. API

- **REST**, via the Fastify backend, reached same-origin through the `/api/:path*` rewrite in
  `next.config.ts` (see Architecture above). There is no BFF layer to add an endpoint to — a new
  route is added on the backend and mirrored in `shared/api/endpoints.ts`.
- **DTOs from `@superplayer/contracts` are the contract.** Never define an inline type that
  duplicates a shared DTO on either side of the HTTP boundary — if a shape doesn't exist in
  `packages/contracts/src/`, add it there first.
- **Never expose database models.** Enforced primarily on the backend (`domain/` entities never
  cross the HTTP boundary — see `server/CLAUDE.md`); the frontend only ever sees the `dto/` shapes.
- **Validate all external input.** Backend: TypeBox schemas on every route (see
  `server/CLAUDE.md`). The frontend does not re-validate what the backend already validates, but
  every request body is typed against the relevant DTO so a malformed payload fails to typecheck
  rather than being silently mishandled.
- **Prefer fully typed requests/responses.** Every function in `shared/api/*.api.ts` returns
  `Promise<SomeDTO>` or `Promise<PaginatedResponse<SomeDTO>>` — never `Promise<any>`.
- **Preserve real errors.** `ApiError` (frontend) / `CustomError` (backend) carry the original
  status and message. Catch `ApiError` at the point of use (a form, a delete confirmation) and
  show `.message` — don't flatten it to a generic string.

---

## 7. File Organization

- **Naming:** `PascalCase` folders for components (`MediaCard/MediaCard.tsx` with a co-located
  `MediaCard.module.css`), `camelCase` for hooks (`useMediaListQuery.ts`) and plain modules
  (`filter.ts`, `poster.ts`), `use*Store.ts` for Zustand stores, `*.api.ts` for API client modules,
  `*.dto.ts` for contract types.
- **Folder structure:** each FSD layer is organized by slice (domain concern: `media`, `player`,
  `playlist`, `user`, `auth`, `playlists`, `users`), and within a slice by sub-concern: `model/`
  for Zustand stores/Context, `ui/` or `components/` for React components, `hooks/`, `lib/` for
  pure helper functions.
- **File colocation:** a component's `.module.css` lives next to its `.tsx` in the same folder.
  There are no barrel/index files and no catch-all `components/` folder — every component gets its
  own folder, even a small one.
- **Avoid overly large files.** Split by responsibility, not by line count: a component doing data
  fetching *and* rendering *and* owning multiple unrelated pieces of state should have its fetch
  concern extracted into a hook and its unrelated UI split into child components.
- **Splitting large components:** prefer the slot-prop pattern (`cornerSlot`/`actionSlot` on
  `MediaCard`) when an entity-layer component needs feature-specific pieces composed in — never
  have the entity import the feature directly, which would violate the FSD layer boundary.

---

## 8. Testing

- **Backend (`server/`):** fully set up with Vitest — unit tests (`src/tests/unit/`, mocked
  dependencies) and integration tests (`src/tests/integration/`, real DB + filesystem via
  Fastify's `inject()`). Full conventions (naming, AAA structure, mocking rules) are in
  `server/CLAUDE.md` — follow those, don't reinvent them here.
- **Frontend (`front/`):** Vitest + React Testing Library on jsdom, configured in
  `front/vitest.config.ts` with `front/vitest.setup.ts`. Tests sit next to what they cover
  (`useMediaFilter.test.ts` beside `useMediaFilter.ts`). Run with `npm test` from `front/`.
- **Test behavior, not implementation** — assert on rendered output
  and user-observable effects (what's on screen, what an interaction produces), not on which
  internal selector a component used or a store's private shape. **Mock only external services**
  (the `fetch`/API boundary) — never mock a Zustand store's internals or a child component just to
  isolate a parent.

---

## 9. Performance

- **Lazy loading / code splitting:** not currently used anywhere in `front/` (no `next/dynamic`,
  no manual route-level splitting beyond what Next.js does by default). Add it for a genuinely
  heavy, rarely-used piece of UI (a large modal, a rarely-visited route) — not speculatively.
- **Avoid premature optimization.** The codebase currently has zero `useMemo`/`useCallback` used
  "just in case" — every instance has a concrete, checkable reason (see React above). Keep that
  discipline; don't add memoization without one.
- **Minimize unnecessary re-renders:** always select the narrowest slice of a Zustand store
  (`useXStore((state) => state.y)`). Selecting the whole store or destructuring it re-renders the
  component on every unrelated field change — see the State Management note about `MediaPlayer.tsx`
  above for a known example not to copy.
- **Cache server requests appropriately.** There is no HTTP caching library (SWR/React Query) in
  this project — the established pattern is a Zustand store owning its own fetch, with
  `AbortController`-based cancellation of a superseded request (see `useMediaStore.fetchMedia`).
  Follow that pattern for new paginated/filtered data rather than introducing a caching library.

---

## 10. Decision Making

Before writing code:

1. **Understand the existing architecture first.** Identify which FSD layer and slice new code
   belongs in before creating a file — check the Architecture section above and the neighboring
   files of whatever you're about to touch.
2. **Reuse existing solutions whenever possible.** Check `shared/ui` before writing a new
   button/modal/menu/search-input/filter-control/paginator. Check `entities/*/model` before adding
   new shared state.
3. **Don't introduce new patterns without a clear reason.** Don't add a data-fetching library
   (SWR/React Query) when the existing store-owns-its-fetch pattern already solves it. Don't add a
   new state-management library alongside Zustand. Don't add a class component.
4. **Follow the project's existing conventions** — `as const` unions (not enums), CSS Modules (not
   Tailwind classes in JSX, despite Tailwind being installed), the naming conventions above — even
   when a different approach is also valid in the abstract.
5. **Don't rewrite working code just because you prefer another approach.** Correctness and
   architecture fit matter more than personal style preference.
6. **Suggest refactoring only when it provides a meaningful, checkable improvement** — a real bug
   fixed, a real duplication removed, a real state desync closed.

---

## 11. General Rules

- **Don't invent APIs.** Check `shared/api/*.api.ts` and, for the backend itself, the actual
  router files or `server/README.md` before assuming an endpoint, field, or behavior exists.
- **Don't guess types.** Import from `@superplayer/contracts`. If a shape isn't defined there, it
  needs to be added there first — not duplicated locally on one side of the boundary.
- **Ask clarifying questions when requirements are ambiguous** — especially about FSD layer
  placement, or whether new shared data belongs in a Zustand store vs. local state, when it isn't
  obvious from an existing pattern.
- **Prefer readability over cleverness.**
- **Keep changes minimal.** Match the scope actually requested; don't refactor unrelated code as a
  side effect of an unrelated task.
- **Preserve existing project conventions — including ones that look like inconsistencies.** For
  example, `UserContext` and `UploadProvider` use React Context while every other shared entity
  uses Zustand; those are known, deliberate exceptions, not bugs to silently "fix" by converting
  them.

---

## Related Documents

- `server/CLAUDE.md` — full backend instruction file (architecture, coding standards, testing,
  security checklist). Authoritative for anything under `server/`.
- `server/README.md` — backend feature list, API endpoint reference, environment variables.
- `front/AGENTS.md` (via `front/CLAUDE.md`) — the canary-Next.js warning; read before writing any
  frontend code that touches a Next.js API you're not certain still behaves as documented upstream.

