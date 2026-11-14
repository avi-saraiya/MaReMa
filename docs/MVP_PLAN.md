# MaReMa — MVP Plan (University Reusable-Materials Exchange)

## Context
Universities produce reusable materials (lab supplies, lumber, furniture, packaging) that others on campus could use at a subsidized price. MaReMa is a marketplace limited to one university. Suppliers post materials they can offer, requesters post materials they need, and another user accepts an exchange. `/root/MaReMa` is empty, so this is a greenfield build. Decisions already made with the user:
- **Stack:** Next.js + SQLite
- **Title:** the user types it in
- **Accepting:** only users other than the creator can accept, and the app records who accepted
- **Login:** an existing name reuses that user's UUID

## MVP Scope
**In scope**
1. **Name-only login.** The user enters a name. If the name exists, the app reuses that user; otherwise it creates a new one with a UUID. The user ID is kept in an httpOnly cookie. There is a logout.
2. **Home page with two tiles:** "View Listings" (`/listings`) and "Create Listing" (`/listings/new`).
3. **Listings view.** Only `Pending` listings appear, split into two sections or tabs: **Supply** and **Request**. Each row shows the title, and clicking it opens the detail page.
4. **Listing detail page** (`/listings/[id]`). It shows the title, type, materials, exchange location, price, creator name and status. Users other than the creator see an **Accept** button, which sets the status to `Active`, stores `acceptedById` and `acceptedAt`, and redirects back to the listings. Creators see "Your listing" instead of the button.
5. **Create listing form** with these fields:
   - Type (Supply or Request)
   - Title
   - Materials, as a dynamic list of text inputs with at least one
   - Exchange location
   - Price, a number ≥ 0 in dollars (0 means free)

   It is validated on both the client and the server. On success it redirects to the listings page.

**Out of scope for the MVP:** real authentication or SSO, editing or deleting listings, messaging, images, search and filters, notifications, completing or cancelling exchanges, and multi-university support.

## Architecture
- A **Next.js 15 (App Router) monolith** in TypeScript. Pages are React Server Components, and mutations go through **Server Actions** (login, logout, createListing, acceptListing), so no separate REST layer is needed.
- **Data layer:** Prisma ORM over a SQLite file (`prisma/dev.db`). Moving to Postgres later only requires changing the datasource.
- **Session:** a `userId` cookie set at login. `middleware.ts` sends unauthenticated requests to `/login`.
- **Validation:** shared Zod schemas used by both the forms and the server actions.
- **Race safety on Accept:** `updateMany({ where: { id, status: 'PENDING', creatorId: { not: userId } } })`. If the count is 0, the listing was already taken or is the user's own.

### Data model (`prisma/schema.prisma`)
```prisma
model User {
  id        String    @id @default(uuid())
  name      String    @unique
  createdAt DateTime  @default(now())
  listings  Listing[] @relation("created")
  accepted  Listing[] @relation("accepted")
}

model Listing {
  id              String    @id @default(uuid())
  type            String    // "SUPPLY" | "REQUEST"
  title           String
  materials       String    // JSON array of strings (SQLite has no arrays)
  exchangeLocation String
  priceCents      Int
  status          String    @default("PENDING") // "PENDING" | "ACTIVE"
  creatorId       String
  creator         User      @relation("created", fields: [creatorId], references: [id])
  acceptedById    String?
  acceptedBy      User?     @relation("accepted", fields: [acceptedById], references: [id])
  acceptedAt      DateTime?
  createdAt       DateTime  @default(now())
}
```
- The creator's name is joined through `creator`, so it is never copied onto the listing.
- Price is stored as an integer number of cents.

### Project layout
```
MaReMa/
  CLAUDE.md
  prisma/schema.prisma, seed.ts
  src/app/
    layout.tsx, page.tsx            # home: two tiles
    login/page.tsx
    listings/page.tsx               # Supply | Request sections
    listings/new/page.tsx           # create form
    listings/[id]/page.tsx          # detail + Accept
  src/actions/{auth,listings}.ts    # server actions
  src/lib/{db,session,validation}.ts
  src/components/{Tile,ListingCard,MaterialsInput}.tsx
  middleware.ts
  tests/ (Vitest unit + Playwright e2e)
```
**Styling:** Tailwind CSS.

## Implementation Steps
1. Scaffold the app with `create-next-app` (TypeScript, Tailwind, App Router, `src/`). Add Prisma, Zod, Vitest and Playwright.
2. Write the Prisma schema, run the first migration, and add a seed script with sample users and listings.
3. Build `lib/db.ts` (Prisma singleton), `lib/session.ts` (cookie get/set) and `middleware.ts`.
4. Build the login page and the `login`/`logout` actions, using an upsert on the user's name.
5. Build the home page with the two tiles.
6. Build the create form, the `createListing` action and the Zod schema.
7. Build the listings page (Pending only, grouped by type), the detail page and the `acceptListing` action.
8. Write `CLAUDE.md` (content below) and add tests.

## CLAUDE.md (to be created at `/root/MaReMa/CLAUDE.md`)
It will contain:
- A project summary
- The decisions listed in Context
- The domain rules:
  - The status lifecycle `PENDING → ACTIVE`
  - Only Pending listings are shown
  - Supply and Request listings are kept separate
  - Creators can't accept their own listing
  - Price is stored in cents
  - Materials are stored as a JSON string
- The tech stack and architecture conventions: Server Actions for mutations, Zod validation shared between client and server, Prisma as the only database access
- Commands: `npm run dev`, `npx prisma migrate dev`, `npx prisma db seed`, `npm test`, `npx playwright test`
- MVP scope and the out-of-scope list
- Future ideas: SSO with the university email, completing exchanges, Postgres

## Verification
- **Unit tests (Vitest):**
  - The Zod schemas reject an empty title, an empty materials list and a negative price.
  - `acceptListing` refuses the creator's own listing and listings that are already Active.
- **E2E test (Playwright):**
  1. Log in as "Alice" and create a Supply listing; it appears under Supply.
  2. Log out, then log in as "Bob" and open the listing. The Accept button is visible.
  3. Bob accepts the listing. It disappears from the listings, and the database row has `status=ACTIVE` with `acceptedById` set to Bob's ID.
  4. Log in as "Alice" again and confirm she gets the same UUID.
- **Manual check:** `npm run dev`, then click through both tiles and check the Supply and Request sections.
