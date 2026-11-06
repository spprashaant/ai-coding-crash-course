---
name: route-modules
description: Route modules — adding a page or API endpoint, and writing a loader or action. Use when creating a file in `app/routes/`, editing `app/routes.ts`, or adding or changing a `loader` or `action`.
---

# Route Modules

Routing is config-based. A file in `app/routes/` is inert until `app/routes.ts` registers it, and every loader and action is authorised on its own.

## Adding a route

1. **Create the module** in `app/routes/`, named with dots for path segments and `$` for params: `courses/:slug/lessons/:lessonId` → `courses.$slug.lessons.$lessonId.tsx`. API endpoints are `api.<name>.ts`.
2. **Register it** in `app/routes.ts`. App pages go inside the `layout("routes/layout.app.tsx", [...])` block; `api/*` endpoints and standalone pages (`signup`, `login`) go after it.
3. **Import its types** with `import type { Route } from "./+types/<file-name-without-extension>";`. They exist only after typegen, which `npm run typecheck` runs.
4. Write the loader and action as below.

## Writing a loader or action

- **Data** comes from `app/services/`, never from `db` directly.
- **Input** goes through `~/lib/validation`: `parseFormData` for forms (returns field errors to render), `parseJsonBody` for JSON, `parseParams` for URL params (throws 400).
- **Authorisation** comes from `app/lib/access.server.ts`. Pick the `require*` guard matching who may act; use `getAccess` only where the page renders something for viewers who lack access (the lesson paywall preview). The loader's guard does not protect the action: **every action calls its own guard**, even on a route whose loader already does.

Done when the route is registered, every loader and action on it has a guard, and `npm run typecheck` passes.
