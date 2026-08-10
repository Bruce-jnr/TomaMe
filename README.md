# TomaMe

TomaMe is a multi-tenant paid public voting platform for awards, pageants, campus competitions, talent programs, and other public events.

The application uses a React frontend and a Node.js/Express API written in TypeScript. PostgreSQL stores tenant, event, candidate, payment, and vote-ledger records through Prisma.

## Current Features

### Public website

- Responsive homepage backed by PostgreSQL
- Live event discovery
- Event search and live/upcoming/ended filters
- Featured candidate listing
- Public organizer overview
- Mobile and desktop navigation

### Organizer workspace

- HTTP-only signed sessions
- Argon2id password verification
- Organization membership and role authorization
- Category creation and protected archiving
- Candidate creation, unique codes, category assignment, and archiving
- Searchable and status-filterable payment ledger
- Responsive organizer navigation
- Multi-step event creation draft with validation and local persistence

### Voting foundation

- Server-side event and voting-window validation
- Integer minor-unit price calculations
- Server-side vote quantity constraints
- Payment-provider interface
- Transactional verified-payment processing
- Idempotent vote crediting
- Append-oriented vote ledger and adjustments
- Candidate cached totals
- Audit and webhook log models

## Technology

| Area | Technology |
| --- | --- |
| Frontend | React 19, React Router, Vite, Lucide |
| API | Node.js, Express 5, TypeScript |
| Validation | Zod |
| Database | PostgreSQL, Prisma |
| Authentication | Argon2id, JOSE-signed HTTP-only cookies |
| Logging | Pino |
| Testing | Vitest, Supertest |

## Requirements

- Node.js 22 or later
- npm
- PostgreSQL 15 or later
- Redis for future USSD sessions, background jobs, and caching

On Windows PowerShell systems that block `npm.ps1`, use `npm.cmd` in place of `npm`.

## Installation

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env` from `.env.example` and configure it.

3. Create the PostgreSQL database named by `DATABASE_URL`.

4. Generate the Prisma client:

   ```bash
   npm run db:generate
   ```

5. Apply development migrations:

   ```bash
   npm run db:migrate
   ```

6. Load development data:

   ```bash
   npm run db:seed
   ```

The API temporarily supports the legacy `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` variables. Prisma CLI commands should use `DATABASE_URL`.

## Environment Variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection URL used by Prisma |
| `SESSION_SECRET` | Yes | At least 32 characters for signing organizer sessions |
| `APP_URL` | Yes | Allowed frontend origin, normally `http://localhost:5173` |
| `API_URL` | Yes | Public API URL, normally `http://localhost:4000` |
| `API_PORT` | No | API port; defaults to `4000` |
| `NODE_ENV` | No | `development`, `test`, or `production` |
| `LOG_LEVEL` | No | Pino log level |
| `VITE_API_URL` | Deployment only | API origin when frontend and API use different origins |
| `SEED_ADMIN_EMAIL` | No | Development organizer account email |
| `SEED_ADMIN_PASSWORD` | No | Development organizer account password |
| `REDIS_URL` | Future | Redis connection URL |
| `PAYSTACK_PUBLIC_KEY` | Integration | Paystack public key |
| `PAYSTACK_SECRET_KEY` | Integration | Paystack secret key |
| `PAYSTACK_WEBHOOK_SECRET` | Integration | Paystack webhook verification secret |
| `ARKESEL_API_KEY` | Integration | Arkesel API key |
| `ARKESEL_SENDER_ID` | Integration | Arkesel SMS sender ID |
| `ARKESEL_USSD_CONFIG` | Integration | Arkesel USSD configuration |
| `STORAGE_ACCESS_KEY` | Uploads | Object-storage access key |
| `STORAGE_SECRET_KEY` | Uploads | Object-storage secret key |
| `STORAGE_BUCKET` | Uploads | Object-storage bucket |
| `STORAGE_ENDPOINT` | Uploads | S3-compatible endpoint |

Do not commit `.env` or use live payment credentials during local development or automated tests.

## Running Locally

Start the frontend and API together:

```bash
npm run dev:all
```

The command labels output as `web` and `api` and stops both processes if either fails.

To run them separately:

```bash
npm run dev
npm run dev:api
```

Local addresses:

- Frontend: `http://localhost:5173`
- API: `http://localhost:4000`

Vite proxies `/api` to port `4000` during development.

## Development Organizer Login

Unless overridden with seed environment variables, `npm run db:seed` creates:

```text
Email: organizer@tomame.test
Password: TomaMeDev2026!
```

These credentials are only for local development. Set unique `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` values and never use the defaults in production.

## Frontend Routes

### Public

- `/` - homepage, live events, and featured candidates
- `/events` - searchable event discovery
- `/organizers` - organizer product overview

### Organizer

- `/dashboard` - organizer workspace entry
- `/dashboard/events/new` - event creation wizard
- `/dashboard/categories` - category management
- `/dashboard/candidates` - candidate management
- `/dashboard/payments` - payment ledger

Unauthenticated access to secured organizer pages displays the organizer login form.

## API Routes

### Health

- `GET /api/health/live`
- `GET /api/health/ready`

### Public data

- `GET /api/v1/public/events`
- `GET /api/v1/public/candidates/featured`
- `POST /api/v1/vote-orders`

The vote-order endpoint accepts candidate ID, quantity, phone number, optional email, and `WEB` or `USSD` channel. The server retrieves the event and category price and calculates the authoritative total.

### Authentication

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`

### Organizer data

- `GET /api/v1/organizer/context`
- `GET|POST /api/v1/organizer/categories`
- `PATCH|DELETE /api/v1/organizer/categories/:id`
- `GET|POST /api/v1/organizer/candidates`
- `PATCH|DELETE /api/v1/organizer/candidates/:id`
- `GET /api/v1/organizer/payments`

All organizer queries are scoped by the organization membership in the signed session. Category and candidate mutations require an organization owner or event administrator. Payment access requires an organization owner or finance administrator.

## Database

The Prisma schema is in `prisma/schema.prisma` and includes:

- Users, organizations, and memberships
- Events, categories, and candidates
- Vote orders and payments
- Vote transactions and adjustments
- Audit and webhook logs

Useful commands:

```bash
npm run db:generate
npm run db:migrate
npm run db:deploy
npm run db:seed
npm run db:studio
```

Use `db:migrate` while developing schema changes. Use `db:deploy` to apply committed migrations in deployment environments.

## Financial Integrity

`VoteTransaction` is the authoritative vote ledger. `Candidate.cachedVoteCount` is a performance cache and must be reconstructable from ledger transactions and adjustments.

Verified-payment crediting runs in a serializable database transaction and checks:

1. Payment success
2. Payment provider
3. Expected amount
4. Expected currency
5. Existing order processing state

Unique database constraints enforce one payment and one vote transaction per order. Duplicate provider callbacks return the existing transaction and add no extra votes.

## Security

- Organizer passwords use Argon2id
- Session tokens are signed and stored in HTTP-only cookies
- Membership status and role are checked against PostgreSQL on every secured request
- Administrative resources are scoped by organization on the server
- Login and vote-order endpoints are rate limited
- Helmet security headers and restricted CORS are enabled
- Sensitive logger paths are redacted
- Category and candidate deletion is implemented as archival
- Financial and vote history is not deleted

## Testing and Builds

Run verification before merging changes:

```bash
npm run lint
npm run build:api
npm test
npm run build
```

Other commands:

```bash
npm run test:watch
npm run preview
npm run start:api
```

Compiled outputs:

- Frontend: `dist/`
- API: `dist-api/`

## Project Structure

```text
prisma/                  Prisma schema, migrations, and seed
public/                  Public browser assets
server/
  auth/                  Session creation and verification
  config/                Environment and logger configuration
  db/                    Prisma client
  domain/                Voting rules and calculations
  middleware/            Authentication and error handling
  payments/              Payment-provider contracts
  routes/                Public, auth, and organizer routes
  services/              Vote-order and vote-crediting services
src/
  assets/                Local UI assets
  pages/                 Organizer and event-management pages
  App.jsx                Public pages and application routing
views/                    Original UI design references
```

## Not Yet Complete

The following work is intentionally not represented as production-ready:

- Live Paystack initialization, verification, and webhook endpoints
- Arkesel USSD and SMS provider implementations
- Redis session storage and BullMQ jobs
- Object-storage uploads for event and candidate images
- Event draft persistence through the authenticated API
- Password reset and two-factor authentication
- Settlements, exports, and Super Admin interfaces
- Complete browser and integration test coverage

Provider-specific behavior must be implemented from current official documentation. Do not invent provider request formats, callback fields, or signature rules.

## Deployment Notes

1. Set `NODE_ENV=production` and strong unique secrets.
2. Configure an accessible PostgreSQL database.
3. Run `npm ci`, `npm run db:generate`, and `npm run db:deploy`.
4. Build both applications with `npm run build` and `npm run build:api`.
5. Serve `dist/` through a static host or CDN.
6. Run the API with `npm run start:api` behind HTTPS.
7. Configure `APP_URL`, `API_URL`, `VITE_API_URL`, and provider webhook URLs for the deployed origins.
8. Replace all development seed credentials before creating organizer accounts.
