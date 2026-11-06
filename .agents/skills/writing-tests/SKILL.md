---
name: writing-tests
description: Tests — writing, extending, or fixing Vitest tests for services and lib modules. Use when creating or editing a `*.test.ts` file, or when a test reads or writes the real `data.db`.
---

# Writing Tests

Tests sit beside the module they cover as `<module>.test.ts`. Vitest runs with `globals: true` and resolves `~/*`.

## Service tests

Services import the shared `db` singleton, so a service test swaps the `~/db` module for a fresh in-memory database built by `createTestDb` from `~/test/setup`. It applies the real migrations in `drizzle/`, so the schema always matches.

```ts
import { createTestDb, seedBaseData } from "~/test/setup";
import * as schema from "~/db/schema";

let testDb: ReturnType<typeof createTestDb>;
let base: ReturnType<typeof seedBaseData>;

vi.mock("~/db", () => ({
  get db() {
    return testDb;
  },
}));

import { getCourseById } from "./courseService";

beforeEach(() => {
  testDb = createTestDb();
  base = seedBaseData(testDb);
});
```

- **Keep the getter.** `testDb` is reassigned in every `beforeEach`; `{ db: testDb }` would capture its value once, at mock time, and point every test at `undefined`.
- **Import the module under test below the mock**, as above.
- **Build on `seedBaseData`**: it returns a student `user`, an `instructor`, a `category`, and a published `course`. Insert anything further through `testDb` using the enums from `~/db/schema` (`schema.UserRole.Student`, not `"student"`).

## Lib tests

Pure modules (`ppp.ts`, `comment-markdown.server.ts`) need no database. For modules that read the session or call the network, follow `app/lib/country.server.test.ts`: mock `~/lib/session` and stub `fetch` with `vi.stubGlobal`.

## Running

`npx vitest run <path>` for one file; add `-t "<name>"` for one test.

Done when the new file passes on its own and `npm test` passes.
