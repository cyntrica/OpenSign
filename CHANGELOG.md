# Changelog — SineSeal (OpenSign Fork)

All notable changes to the SineSeal fork of OpenSign are documented here.
Based on [OpenSign](https://github.com/OpenSignLabs/OpenSign) v2.35.0. Fork maintained at [cyntrica/OpenSign](https://github.com/cyntrica/OpenSign).

---

## [Unreleased] — 2026-03-02

### Plugin Architecture (Phase 1–4)

A manifest-driven plugin system enabling isolated customization without modifying the OpenSign core. Plugins declare Cloud Functions, Parse triggers, Express routes, application hooks, frontend pages, and menu items through a single `manifest.json`.

**Core infrastructure** (`plugins/_loader/`):
- `backend.js` — Server-side plugin loader. Discovers plugins from `plugins/*/manifest.json`, registers Cloud Functions (namespaced as `pluginName_functionName`), Parse triggers, Express routes, and application hooks. Runs optional `setup()` for schema creation and data seeding. Exposes hooks via `globalThis.__pluginHooks`.
- `vite-plugin-opensign-plugins.js` — Vite build plugin. Generates a virtual ES module (`virtual:opensign-plugins`) exporting lazy-loaded routes, sidebar menu items, admin Settings menu items, and theme overrides. Processes `pages`, `menuItems`, `adminPages`, and `themeOverrides` from each plugin manifest.
- `install-plugin-deps.js` — Pre-build script that installs `serverDependencies` declared in plugin `package.json` files into the host server's `node_modules`.
- `tailwind-plugin-overrides.cjs` — Aggregates DaisyUI theme overrides from plugins for the Tailwind build.

**Core file changes** (minimal, additive-only):
- `apps/OpenSignServer/index.js` — Loads plugins on startup via `backend.js`. Adds `verify` callback to `express.json()` to capture raw request body on `/plugins/*` routes (needed for Stripe webhook signature verification).
- `apps/OpenSignServer/cloud/main.js` — Imports plugin loader.
- `apps/OpenSignServer/Dockerhubfile` — Copies `plugins/` into image, runs dependency installer.
- `apps/OpenSign/Dockerhubfile` — Copies `plugins/` into image, symlinks `node_modules` for plugin module resolution.
- `apps/OpenSign/src/App.jsx` — Renders plugin routes inside `<HomeLayout />` with `<Suspense>` fallback.
- `apps/OpenSign/src/json/menuJson.js` — Merges `pluginMenuItems` into sidebar via position hints (`before:`, `after:`, `end`). Merges `pluginAdminMenuItems` into Settings children (admin-role-gated).
- `apps/OpenSign/vite.config.js` — Registers the Vite plugin, extends `server.fs.allow` for plugin source files.
- `apps/OpenSign/tailwind.config.js` — Loads plugin theme overrides.
- `apps/OpenSign/package.json` — Adds pre-build plugin dependency installer script.
- `apps/OpenSignServer/package.json` — Adds pre-build plugin dependency installer script.
- `docker-compose.yml` — Adds `./plugins:/usr/plugins:ro` volume mount.

**Application hooks** (fire-through-core pattern for classes with existing triggers):
- `DocumentBeforesave.js` — `beforeDocumentSave` hook (awaited, can abort save).
- `DocumentAftersave.js` — `afterDocumentSave` hook (fire-and-forget).
- `TemplateBeforesave.js` — `beforeTemplateSave` hook (awaited, can abort save).
- `usersignup.js` — `onUserSignup` hook (fire-and-forget).

**Sidebar i18n fallback** (`Menu.jsx`, `SubMenu.jsx`):
- Added `defaultValue` to translation calls so plugin menu items display their title directly when no translation key exists, instead of showing raw keys like `sidebar.Billing`.

**Admin pages framework**:
- Plugins can declare `adminPages` in their manifest `frontend` section. These pages get routes in `<HomeLayout />` and their menu items appear as Settings children, visible only to `contracts_Admin` and `contracts_OrgAdmin` roles (gated by the existing sidebar role logic in `Sidebar.jsx`).

**Test plugin** (`plugins/hello-world/`):
- Verifies Cloud Functions (`hello_ping`), application hooks (`afterSign`), frontend pages (`/hello`), and sidebar menu injection. Used for end-to-end validation of the plugin system.

### Membership Plugin

Stripe-powered subscription management with usage limit enforcement. Infrastructure-first: full Stripe pipeline ready, seeded with a free plan, paid tiers deferred until Stripe keys are configured.

**Data model** (3 Parse classes, created automatically on first startup):
- `membership_Plan` — Plan definitions (name, slug, limits object, price in cents, Stripe IDs, active flag, sort order). CLP: read by authenticated users, write by masterKey only. Seeded with a "Free" plan on first run.
- `membership_Subscription` — One per tenant. Links `TenantId` → `PlanId` with Stripe customer/subscription IDs, status, billing period dates, and cancel-at-period-end flag. Existing tenants are backfilled with free subscriptions on startup.
- `membership_Usage` — Monthly counters per tenant. Tracks `documentsCreated` by period (YYYY-MM format). Storage, templates, and seats are counted live from existing OpenSign tables.

**Usage limit enforcement** (`backend/lib/checkLimit.js`):
- Shared utility queries the tenant's subscription → plan → limits, then checks current usage. Throws `Parse.Error(OPERATION_FORBIDDEN)` when a limit is reached.
- `beforeDocumentSave` hook — Checks `documentsPerMonth` and `storageBytes` limits.
- `afterDocumentSave` hook — Increments `membership_Usage.documentsCreated` for the current period.
- `beforeTemplateSave` hook — Checks `templates` limit.
- `onUserSignup` hook — Creates a free subscription for new tenants.
- `contractsUsersBeforeSave` trigger — Checks `seats` limit on new user creation.

**Usage metrics** (4 dimensions):
- Documents/month — From `membership_Usage` table (period-based counter).
- Templates — Sum of `contracts_Users.TemplateCount` across tenant users.
- Storage bytes — From `partners_TenantCredits.usedStorage`.
- Team seats — Count of `contracts_Users` per `TenantId`.

**Cloud Functions** (8 total):
- `membership_getPlans` — Lists plans sorted by `sortOrder`. Supports `includeInactive` param for admin views.
- `membership_getSubscription` — Returns tenant's subscription with included plan data.
- `membership_getUsage` — Returns all 4 usage metrics for the billing page.
- `membership_createCheckout` — Creates a Stripe Checkout Session. Creates Stripe customer if needed. Returns redirect URL.
- `membership_createPortalSession` — Creates a Stripe Customer Portal session for managing subscriptions.
- `membership_cancelSubscription` — Sets `cancelAtPeriodEnd = true` on the Stripe subscription.
- `membership_savePlan` — Creates or updates a plan (admin-role-gated). Validates required fields, enforces slug uniqueness.
- `membership_deletePlan` — Deletes a plan (admin-role-gated). Prevents deletion of the free plan or plans with active subscriptions.

**Stripe webhook** (`POST /plugins/membership/stripe/webhook`):
- Handles 4 events: `checkout.session.completed`, `invoice.paid`, `customer.subscription.updated`, `customer.subscription.deleted`.
- Uses raw body capture from `express.json()` verify callback for signature verification via `stripe.webhooks.constructEvent()`.
- Gracefully disabled when `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` env vars are empty.

**Frontend — Billing page** (`/billing`, sidebar item before Settings):
- Current plan card showing name, status, and cancel-at-period-end warning.
- 4 usage bar cards in a 2-column grid (documents/month, templates, storage, seats).
- Progress bars turn warning (yellow) at 80% usage, error (red) at 100%.
- Available plans grid with upgrade/downgrade buttons (shown when >1 plan exists).
- "Manage" button for Stripe Customer Portal (paid plans only).
- Components: `UsageBar.jsx` (progress bar card), `PlanCard.jsx` (plan display with limits and CTA).

**Frontend — Plan Management admin page** (`/settings/plans`, Settings dropdown, admin-only):
- Table of all plans showing name, slug, price, limits, active status, and action buttons.
- Create/edit modal with fields for name, slug, price (cents with dollar preview), all 4 limits (-1 for unlimited), Stripe Price/Product IDs, active toggle, and sort order.
- Auto-generates slug from plan name on creation.
- Delete with safety checks: free plan deletion blocked, plans with active subscriptions cannot be deleted.
- Frontend admin role check (locks out non-admins), backend admin role check (enforced on all mutations).

**Environment variables** (membership plugin):
- `STRIPE_SECRET_KEY` — Required for Stripe API calls. Leave empty to disable Stripe features.
- `STRIPE_WEBHOOK_SECRET` — Required for webhook signature verification.
- `STRIPE_PUBLISHABLE_KEY` — Optional, reserved for future embedded Stripe components.

### Docker & Build Fixes

- Fixed esbuild parse error from `*/` in JSX comments (`App.jsx`).
- Fixed virtual module import paths from relative to absolute (`vite-plugin-opensign-plugins.js`).
- Fixed Rollup module resolution for plugin files outside `node_modules` tree (symlink in client Dockerhubfile).
- Fixed ESM/CJS module detection for plugin loader (`plugins/_loader/package.json` with `"type": "module"`, renamed `tailwind-plugin-overrides.js` → `.cjs`).
- Fixed JSDoc block comment `*/` pattern in `backend.js` (converted to line comments).
- Fixed broken synchronous `getStripe()` function that used `await` in a non-async context (`stripeClient.js`).
- Added `"type": "module"` to membership plugin `package.json` for proper ES module parsing.

### Deployment

- Custom Docker images: `sineseal/server:latest`, `sineseal/client:latest`.
- Production at `sineseal.com` on DigitalOcean droplet (157.245.124.169).
- Caddy reverse proxy with automatic HTTPS.
- MongoDB in Docker with persistent volume.
- Plugins volume-mounted at `/usr/plugins:ro` for hot-swap without image rebuilds.

---

## Files Changed (from upstream v2.35.0)

52 files changed, 2450 insertions, 11 deletions.

**Core modifications** (13 files, ~60 additive lines):
- `apps/OpenSignServer/index.js`
- `apps/OpenSignServer/cloud/main.js`
- `apps/OpenSignServer/cloud/parsefunction/DocumentBeforesave.js`
- `apps/OpenSignServer/cloud/parsefunction/DocumentAftersave.js`
- `apps/OpenSignServer/cloud/parsefunction/TemplateBeforesave.js`
- `apps/OpenSignServer/cloud/parsefunction/usersignup.js`
- `apps/OpenSignServer/cloud/parsefunction/pdf/PDF.js`
- `apps/OpenSignServer/Dockerhubfile`
- `apps/OpenSign/src/App.jsx`
- `apps/OpenSign/src/json/menuJson.js`
- `apps/OpenSign/src/components/sidebar/Menu.jsx`
- `apps/OpenSign/src/components/sidebar/SubMenu.jsx`
- `apps/OpenSign/Dockerhubfile`
- `apps/OpenSign/vite.config.js`
- `apps/OpenSign/tailwind.config.js`

**Plugin system** (5 files):
- `plugins/_loader/backend.js`
- `plugins/_loader/vite-plugin-opensign-plugins.js`
- `plugins/_loader/install-plugin-deps.js`
- `plugins/_loader/tailwind-plugin-overrides.cjs`
- `plugins/_loader/package.json`

**Hello-world test plugin** (4 files):
- `plugins/hello-world/manifest.json`
- `plugins/hello-world/backend/index.js`
- `plugins/hello-world/backend/ping.js`
- `plugins/hello-world/backend/hooks/afterSign.js`
- `plugins/hello-world/frontend/pages/HelloWorld.jsx`

**Membership plugin** (21 files):
- `plugins/membership/manifest.json`
- `plugins/membership/package.json`
- `plugins/membership/backend/index.js`
- `plugins/membership/backend/lib/checkLimit.js`
- `plugins/membership/backend/lib/planDefaults.js`
- `plugins/membership/backend/lib/stripeClient.js`
- `plugins/membership/backend/functions/getPlans.js`
- `plugins/membership/backend/functions/getSubscription.js`
- `plugins/membership/backend/functions/getUsage.js`
- `plugins/membership/backend/functions/createCheckout.js`
- `plugins/membership/backend/functions/createPortalSession.js`
- `plugins/membership/backend/functions/cancelSubscription.js`
- `plugins/membership/backend/functions/savePlan.js`
- `plugins/membership/backend/functions/deletePlan.js`
- `plugins/membership/backend/routes/stripeWebhook.js`
- `plugins/membership/backend/hooks/beforeDocumentSave.js`
- `plugins/membership/backend/hooks/afterDocumentSave.js`
- `plugins/membership/backend/hooks/beforeTemplateSave.js`
- `plugins/membership/backend/hooks/onUserSignup.js`
- `plugins/membership/backend/triggers/contractsUsersBeforeSave.js`
- `plugins/membership/frontend/pages/Billing.jsx`
- `plugins/membership/frontend/pages/PlanAdmin.jsx`
- `plugins/membership/frontend/components/UsageBar.jsx`
- `plugins/membership/frontend/components/PlanCard.jsx`
