# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`crow-cms` is a small multi-project CMS backend: a Next.js app that stores asset metadata in Upstash Redis and asset files in S3, and exposes a bearer-token-authenticated HTTP API at `/api/projects/[project]/...`. Project configs live in `shared/projects.ts` — currently there is one project, `alikro`, consumed by the sibling `alikro` repo (see `../alikro/CLAUDE.md`). Each project has its own auth secret, user list, and optional `revalidateTagHook` that pokes the consumer when content changes.

The project is small, so the workflow here is lighter than in the more structured repos: dedicated `docs/` and `tasks/` folders aren't required, but they (or ad-hoc top-level `.md` files) are fine when they actually help.

## Collaboration Workflow

### Documentation Organization
- `CLAUDE.md` — conventions and guidance for Claude Code (this file).
- `TASKS.md` — a lightweight checklist of known work items. Persistent, committed. Items marked **Maybe:** are speculative and should not be acted on without confirmation.
- No `docs/` folder is set up by default — most work is driven directly from prompts and doesn't need a persistent artifact. If a design doc or additional task list becomes genuinely useful, it's fine to add one: prefer a top-level `.md` (e.g. `design-<topic>.md`, `tasks-<topic>.md`) until there are enough to justify a folder.

### Task Management
- Work is usually driven through direct prompts.
- `TASKS.md` captures items the user wants tracked across sessions. Treat unchecked, non-**Maybe:** items as pre-approved once the user asks to work on them; confirm before tackling **Maybe:** items.

### Planning & Scope
- For small, well-scoped changes, just do it — no upfront planning needed unless requested.
- For larger or more complex features, design first: sketch the approach, lay out options with tradeoffs, and agree on direction before implementing. When the feature is substantial enough to benefit from a written record, a short top-level design `.md` is a good place for it.
- Ask about ambiguity rather than guessing.
- For non-trivial design decisions (type restructuring, naming, API shape, auth/authz changes), engage in discussion before implementing. Present concrete options with tradeoffs and a recommendation, but let the user choose.

### Code Changes
- Small incremental commits.
- The user makes all commits — do NOT commit unless explicitly asked.
- Propose a commit message after each change.
- Only add tests when explicitly asked.
- Always run `npm run build` after completing a change. Fix any errors before presenting the summary. Don't present work as done without a passing build.
- When changing the public API shape (under `app/api/projects/[project]/...`) or the CORS allow-list, remember that consumer projects depend on it. For the `alikro` project, that means checking `../alikro/shared/cms.ts` and coordinating the change.

### Communication Style
- Explanatory — include reasoning behind choices.
- Proactively suggest improvements noticed along the way, and mention them in conversation.

### Review & Iteration
- Present approach before executing (for direct prompts), unless told otherwise.
- Iterate on feedback immediately.

### Conventions & Documentation
- When a new convention emerges from discussion (naming rules, architectural patterns), add it to `CLAUDE.md` immediately.
- `CLAUDE.md` should be the authoritative source of truth for conventions — future conversations should be able to derive them from this file alone.

## Development Commands

- `npm run dev` — Start development server (with Turbopack)
- `npm run build` — Build for production
- `npm run start` — Start production server
- `npm run lint` — Run ESLint

## Coding preferences

### General
- Prefer `function name(...) { ... }` style to `const name = (...) => { ... }` style.
- Always put private (non-exported) functions at the bottom of the file, after all exports.

### Types
- Inline prop/parameter types unless the type is referenced from other places. Extract a named type only when it's used in multiple locations.

### Nullability
- Prefer `undefined` over `null` for absent values. Convert at boundaries (Redis reads, S3 responses) where external sources return `null`.

### Naming
- Use `isLoading` (not `loading`) for boolean loading state.

## CSS and Styling

- Tailwind v4 with PostCSS. Only use colors defined in `app/globals.css`. They work as Tailwind classes. If a new color is needed, define it in `globals.css` and then use it.

## Architecture Overview

- **Framework**: Next.js 16 App Router, React 19, Tailwind v4.
- **Storage**:
  - Asset **metadata** in Upstash Redis (`shared/metadataStore.ts`), keyed per project under `crow-cms:assets:<project>`.
  - Asset **files** in S3 via `@aws-sdk/client-s3`, with presigned URLs for uploads (`shared/blobStore.ts`, `shared/fileStore.ts`). Public reads go through a CloudFront distribution whose domain is set via `NEXT_PUBLIC_ASSETS_DOMAIN` (also allow-listed in `next.config.js`).
- **Projects**: Every route and storage key is scoped by `project`. Configs are defined in `shared/projects.ts` — each has `title`, `users`, `secret` (bearer token), an optional `makeExternalLink`, and an optional `revalidateTagHook` that calls the consumer's revalidation endpoint.
- **Auth** (`shared/auth.ts`): API requests use `Authorization: Bearer <project.secret>`. Console UI uses cookie-based auth. Internal variant requests may use an `X-Internal-Token` header matching `VARIANTS_SECRET`.
- **CORS proxy** (`proxy.ts`): Allows `/api/*` from `localhost:3000/3001` and from the URL derived from `ALIKRO_URL`. Update the allow-list when adding new consumer projects.
- **Caching**: `'use cache'` + `cacheLife('days')` in `shared/metadataStore.ts` with explicit `cacheTagForAssetId` / `cacheTagForAssetsIndex` tags. Mutations call `revalidateTags*` helpers in `app/projects/[project]/cache.ts`, which in turn trigger the project's `revalidateTagHook` to propagate invalidation to the consumer (e.g. `alikro`'s `/api/revalidate/[tag]`).
- **Routes**:
  - `app/api/projects/[project]/...` — the public HTTP API consumed by external projects (e.g. `alikro`).
  - `app/projects/[project]/...` — the authenticated admin console: uploading, editing metadata, inspecting orphans, managing workers.

## Environment

Key env vars:
- `NEXT_PUBLIC_ASSETS_DOMAIN` — CloudFront (or equivalent) domain serving public asset reads. Referenced by `next/image` remote patterns.
- `NEXT_PUBLIC_ALIKRO_URL` — base URL for the `alikro` consumer (used by `revalidateTagHook`).
- `ALIKRO_URL` — used by the CORS proxy to derive the allowed origin.
- `ALIKRO_SECRET_KEY` — bearer token sent to `alikro`'s revalidation endpoint.
- `VARIANTS_SECRET` — optional; if set, variant requests must send a matching `X-Internal-Token`.
- Per-project API secrets are defined in `shared/projects.ts` (via env in the project config).
- Standard Upstash Redis and AWS S3 credentials expected by `@upstash/redis` and `@aws-sdk/client-s3`.

## Related projects

- `../alikro` — the public-facing portfolio consumer of this CMS. Its `shared/cms.ts` calls `GET /api/projects/alikro/metadata[/<id>]` here, and its `/api/revalidate/[tag]` is invoked by this repo's `revalidateTagHook`. See `../alikro/CLAUDE.md`.
