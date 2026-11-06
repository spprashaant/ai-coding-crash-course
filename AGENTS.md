# Navigation

- `app/lib/comment-markdown.server.ts` — the renderer for student-authored (untrusted) markdown. `renderMarkdown` in `markdown.server.ts` is for instructor content only; route every new student-written field through `renderComment`.
- `scripts/seed.ts` — the definition of the database's starting data (users, courses, enrolments), rebuilt from scratch on every `npm run db:seed`.
- `npm run typecheck` — the type check. It runs `react-router typegen` first; bare `tsc` reports missing `./+types/*` imports.
