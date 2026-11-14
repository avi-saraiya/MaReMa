# MaReMa — University Reusable-Materials Exchange

A marketplace for one university where members trade reusable materials at subsidized prices. Users post **Supply** listings (materials they can give) or **Request** listings (materials they need). Another user can **accept** a listing to agree to the exchange.

The full MVP plan is in `docs/MVP_PLAN.md`.

## Workflow
- Build **one feature at a time**. After each feature, commit and push to `origin/main` (github.com/avi-saraiya/MaReMa), then check in with the user before starting the next one.

## Status
Update this section as each feature lands.
- [x] Foundation: Next.js scaffold, Prisma schema, initial migration, seed data, `src/lib/db.ts`, `src/lib/listing.ts` (types, materials JSON helpers, price formatting)
- [x] Name-only login and session cookie and middleware: `src/lib/session.ts` (`getCurrentUser`, `requireUser`), `src/actions/auth.ts` (`login`, `logout`), `src/middleware.ts`, and a `Header` with logout in the root layout
- [x] Home page with two tiles (`src/components/Tile.tsx`), linking to `/listings` and `/listings/new`
- [ ] Create listing form
- [ ] Listings view (Supply and Request shown separately)
- [ ] Listing detail page and Accept
- [ ] Tests (Vitest and Playwright)

## Tech Stack
- **Next.js 15 (App Router) + TypeScript.** It is a single monolith: pages are React Server Components, and mutations are **Server Actions**. There is no separate REST API.
- **Prisma ORM + SQLite** (`prisma/dev.db`). Moving to Postgres later should only require changing the datasource.
- **Zod** schemas in `src/lib/validation.ts`, shared by the client forms and the server actions.
- **Tailwind CSS** for styling.
- **Vitest** for unit tests and **Playwright** for e2e tests.

## Product Decisions (confirmed with the user)
- **Login is name only.** The name is unique. Logging in with an existing name reuses that user's UUID (upsert by name). The user ID is kept in an httpOnly `userId` cookie, and `src/middleware.ts` only checks that the cookie exists, and redirects to `/login` if it doesn't. Pages must call `requireUser()` to confirm the user actually exists, because a cookie can point to a deleted user.
- The **home page** has two tiles: View Listings (`/listings`) and Create Listing (`/listings/new`).
- A **listing** has these fields:
  - `type` (`SUPPLY` | `REQUEST`)
  - `title`, which the user enters
  - `materials`, a list of strings
  - `exchangeLocation`
  - `priceCents`
  - `creator`
  - `status`
  - `acceptedBy` / `acceptedAt`
- The **status lifecycle** is `PENDING` (the default) → `ACTIVE` when accepted.
- The **listings view** shows only `PENDING` listings. **Supply and Request listings must always be shown separately.** Active listings stay in the database.
- **Accept** is only allowed for users other than the creator. The app records `acceptedById` and `acceptedAt`. It runs as an atomic `updateMany` where `status = 'PENDING' AND creatorId != userId`. If the count is 0, the action fails (the listing was already taken or belongs to the user).

## Conventions
- Prisma (`src/lib/db.ts` singleton) is the only way to access the database.
- Every mutation lives in `src/actions/*.ts`, and each one validates its input with Zod before it touches the database.
- Prices are stored as **integer cents**. The UI accepts dollars ≥ 0, and 0 means free.
- `materials` is stored as a **JSON string** because SQLite has no arrays. Always parse and serialize it through a helper, never inline.
- The creator's name comes from the `creator` relation. Don't copy it onto the listing.
- Enum-like fields are strings in SQLite. Keep their allowed values in TypeScript union types and the Zod enums.

## Layout
```
prisma/schema.prisma, seed.ts
src/app/            page.tsx (tiles), login/, listings/, listings/new/, listings/[id]/
src/actions/        auth.ts, listings.ts
src/lib/            db.ts, session.ts, validation.ts
src/components/     Header, Tile, ListingCard, MaterialsInput
src/middleware.ts   (it must live in src/ because the project uses a src dir)
tests/              Vitest unit + Playwright e2e
```

## Commands
- First-time setup: `cp .env.example .env && npm install && npm run db:migrate` (the migration also runs the seed).
- `npm run dev` starts the dev server.
- `npm run db:migrate` (`prisma migrate dev`) applies and creates migrations.
- `npm run db:seed` resets the listings and loads sample users (Alice, Bob) and listings.
- `npm run lint`, `npx tsc --noEmit` and `npm run build` are the checks to run before every commit.
- `npm test` runs the Vitest unit tests.
- `npx playwright test` runs the e2e tests.

## MVP Scope
**Out of scope for now:**
- Real authentication or SSO
- Editing or deleting listings
- Messaging
- Images
- Search and filters
- Notifications
- Completing or cancelling exchanges
- Multi-university support

**Future ideas:**
- SSO with the university email
- A `COMPLETED` status and cancellation
- Moving to Postgres
- Filtering by material or location
