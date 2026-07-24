# Changelog — SineSeal (OpenSign Fork)

All notable changes to the SineSeal fork of OpenSign are documented here.
Based on [OpenSign](https://github.com/OpenSignLabs/OpenSign) v2.35.0. Fork maintained at [cyntrica/OpenSign](https://github.com/cyntrica/OpenSign).

---

## [Unreleased] — 2026-03-03

### Security & Code Quality Audit (61 findings fixed)

Full codebase audit covering core server modifications, plugin loader, branding plugin, and membership plugin. All findings fixed across ~40 files.

**CRITICAL fixes (7):**
- Shell command injection via `exec()` in `index.js` → replaced with `spawn()` using env option object.
- Code injection via manifest values in Vite plugin → all interpolated strings now use `JSON.stringify()`.
- Command injection via dependency names in `install-plugin-deps.js` → replaced `execSync` with `execFileSync`.
- TOCTOU race condition in document limit check → usage increment moved to `beforeDocumentSave` (atomic with limit check), with duplicate-key retry logic. `afterDocumentSave` skips if already incremented.
- No auth check on `getPlans({ includeInactive: true })` → admin role check required for inactive plans.
- Tenant cross-reference not validated in checkout/cancel → subscription TenantId verified against user's tenant.
- CLP relies entirely on `useMasterKey` → added security documentation; architectural note on defense-in-depth.

**HIGH fixes (14):**
- XSS in email templates → created `escapeHtml()` utility in `Utils.js`; applied to all user-controlled values in `mailTemplate`, `sendNotifyMail`, `sendCompletedMail`, `sendDeclineMail`, and `ForwardDoc`.
- Missing authorization on document decline → added signer verification against document `Placeholders`.
- Path traversal in plugin file loading → `validatePluginPath()` verifies resolved paths stay within plugin directory.
- Express app exposed on `globalThis` → `__pluginExpressApp` deleted after plugin loading completes.
- PFX file race condition → `crypto.randomUUID()` for filenames, signed PDF paths tracked for cleanup.
- Signed PDFs not cleaned up on error → added to catch block cleanup alongside PFX files.
- Error swallowed in user signup → now re-throws so client receives error response.
- No MIME validation on logo upload → magic byte validation for PNG/JPEG/GIF/ICO; SVG/HTML extensions blocked.
- URL scheme validation on branding URLs → `isValidUrl()` rejects `javascript:` and `data:` schemes on footer URL, social links, email logo URL.
- Webhook handlers not idempotent → event ID tracking via `membership_WebhookEvent` table; 200 responses after signature verification to prevent retries.
- Subscription status not checked in limit enforcement → `past_due`/`canceled`/`unpaid` subscriptions fall back to free plan limits.
- No unique constraint handling on subscription TenantId → duplicate-key error handling in `onUserSignup`.
- Backfill limited to 1000 tenants → replaced with paginated loop (500 per batch, no upper limit).
- Any tenant member could cancel subscription → admin role check required for cancellation.

**MEDIUM fixes (22):**
- Hardcoded OpenSign email references (`complaint@opensiglabs.com`) → dynamic `contactEmail` from branding, fallback to `support@sineseal.com`.
- IP spoofing via X-Forwarded-For → `app.set('trust proxy', 1)` for Caddy proxy.
- Raw body capture for all plugin routes → restricted to Stripe webhook path only.
- Regex injection in `replaceMailVaribles` → replaced `new RegExp()` with `String.replaceAll()`.
- `Math.random()` for IDs → replaced with `crypto.randomInt()` in `generateId()` and `crypto.randomUUID()` in PDF.js.
- Plugin loader "fatal" error message → corrected to "server continuing without full plugin support".
- Wrong variable in `sendCompletedMail` → `tenant?.CompletionSubject` fixed to `_tenantRes?.CompletionSubject`.
- Null check on certificate `lastObj.SignedOn` → safe access with fallback to current timestamp.
- XSS in decline reason → `escapeHtml()` applied to reason and all user data in decline emails.
- Recipient emails not validated in ForwardDoc → validated against `emailRegex`; parallel sending via `Promise.allSettled()`.
- Class name injection via `userDetails.role` → validated against `ALLOWED_ROLE_PREFIXES` allowlist.
- Plugin route method not validated → whitelist: `get`, `post`, `put`, `patch`, `delete`.
- Plugin hook ran before field validation → moved hooks to after validation in `DocumentBeforesave`.
- JWT file URLs signed with MASTER_KEY → uses `FILE_SIGNING_SECRET` env var (falls back to MASTER_KEY).
- Branding schema seed race condition → duplicate-key error handling in both branding and membership setup.
- Stale branding cache no TTL → 24-hour cache expiration with `_cachedAt` timestamp; retry on fetch failure.
- `NavLink` used for external URLs → replaced with `<a>` tags in `SocialMedia.jsx`.
- No length limits on branding strings → `appName`: 100, `footerText`: 500, URLs: 2048 chars max.
- File URL signing check too loose → `isParseFile()` checks `/files/` in URL pathname.
- Stripe API version hardcoded → configurable via `STRIPE_API_VERSION` env var.
- `handleSubscriptionDeleted` missing free plan check → `PlanId` unset with critical log if no free plan.
- Open redirect via Host header → `PUBLIC_URL` env var required; `request.headers.host` fallback removed.

**LOW fixes (18):**
- `masterKeyIps` allows all IPs → documented; acceptable behind Caddy proxy.
- Fragile `export let` pattern → added documentation warning about ES module live bindings.
- Fire-and-forget async without `.catch()` → added error logging to `sendNotifyMail` and `sendCompletedMail`.
- Missing `await` on ACL saves → awaited with try/catch in `DocumentAftersave`.
- Division by zero in reminder calculation → guard rejects `RemindOnceInEvery <= 0`.
- Sequential email sending in ForwardDoc → `Promise.allSettled()` with per-recipient results.
- `uploadFile` returns undefined on error → now throws with descriptive message.
- Plugin load order filesystem-dependent → priority-based sorting; duplicate function name warnings.
- Plugin triggers can conflict with core → warning when registering triggers on core classes.
- Silent parse errors in Tailwind overrides → added `console.warn`.
- Missing `route.method` null check → skip with warning.
- Client-side admin checks bypassable → documented as UI-only gating; backend enforcement is authoritative.
- Old files not deleted on logo re-upload → best-effort cleanup of previous Parse File.
- Array index as React key in SocialLinkEditor → stable `crypto.randomUUID()` IDs; immutable sort order updates.
- Duplicate defaults in 3 places → documented authoritative source reference.
- Duplicate `requireAdmin` in membership → extracted to shared `lib/requireAdmin.js`.
- Template count query limited to 100 → set `.limit(10000)`.
- Hardcoded OpenSign docs URL → configurable via `branding.docsUrl`.

**New environment variables:**
- `FILE_SIGNING_SECRET` — Dedicated secret for JWT-signed file URLs (optional; falls back to `MASTER_KEY`).
- `STRIPE_API_VERSION` — Override Stripe API version (optional; defaults to `2024-12-18.acacia`).

**New files:**
- `plugins/membership/backend/lib/requireAdmin.js` — Shared admin role gate for membership cloud functions.

**New Parse class:**
- `membership_WebhookEvent` — Tracks processed Stripe webhook event IDs for idempotency (`eventId`, `type`, `processedAt`).

### SMS Code Quality Audit (12 findings fixed)

Targeted audit of all SMS plugin backend and frontend code. Fixes span security hardening, data integrity, code deduplication, and UX improvements.

**Security & data integrity (4 fixes):**
- Webhook idempotency — `sms_WebhookEvent` table tracks `messageSid:messageStatus` pairs to prevent duplicate processing on Twilio retries or out-of-order delivery.
- Phone number masked in opt-out log — `handleOptOut` now logs `maskPhone(phone)` (`***1234`) instead of raw E.164 numbers.
- Error message removed from webhook response — catch block returns `{ received: true }` only; `err.message` could contain phone numbers or internal details.
- Tenant isolation on user preferences — `getSmsPreferences` now resolves the caller's TenantId and scopes the `sms_UserPreference` query to their tenant, preventing cross-tenant preference leakage.

**Bug fixes (3):**
- Numeric phone coercion — `normalizeE164()` now converts numeric input to string before processing; prevents crashes when phone numbers are stored as integers in the database.
- Exact-match phone search — `getMessageLog` phone filter changed from `contains()` (substring match) to `equalTo()` with E.164 normalization, preventing false matches (e.g., searching `+1555` no longer returns `+15551234567`).
- React key stability — `MessageLogTable` removed index fallback from `key={msg.objectId || idx}` → `key={msg.objectId}` to prevent unnecessary re-renders on pagination changes.

**Code quality (3 fixes):**
- Shared helpers module — Extracted ~300 lines of duplicated utility functions (`getSettings`, `checkConsent`, `resolveSignerPhone`, `checkUserPref`, `checkUserPrefById`, `logMessage`, `maskPhone`) from `afterDocumentSave.js`, `afterSign.js`, and `sendReminders.js` into `lib/smsHelpers.js`. Each hook/job file reduced by ~100 lines.
- Signer phone resolution logging — `resolveSignerPhone()` now logs warnings when a signer's phone number can't be resolved (missing `contactbook` record or no phone field), aiding debugging of silent SMS delivery failures.
- Client-side phone validation — Test SMS tab validates phone input against E.164 format (`/^\+[1-9]\d{6,14}$/`) before allowing send, with inline error message.

**UX improvements (2 fixes):**
- Success message auto-clear — Success banners in SMS Settings and SMS Preferences auto-dismiss after 4 seconds instead of persisting until page navigation.
- Credential masking safety — Frontend stores masked credential values as placeholder text only (never in form state), tracks which fields the user actually modified via `dirtyCredentials` Set, and omits untouched credentials from save payload. Backend guard strengthened to reject values containing any bullet-like Unicode characters (`\u2022`, `\u25CF`, `\u25CB`, `\u2B24`, `\u2023`) or all-asterisk patterns.

**New file:**
- `plugins/sms/backend/lib/smsHelpers.js` — Shared utility functions for SMS hooks and jobs.

### Branding Plugin (White-Label)

Admin-configurable branding that replaces all OpenSign references with dynamic values. All settings managed through a "Branding" admin page under Settings.

**Data model** (1 Parse class, singleton):
- `branding_Settings` — App name, logo URLs (light/dark/favicon/email), footer text/URL, social media links array, theme color overrides for light and dark themes. CLP: public read (needed for unauthenticated pages), masterKey-only write. Seeded with defaults on first startup.

**Cloud Functions** (3 total):
- `branding_getSettings` — Returns singleton branding settings. Public, no auth required.
- `branding_saveSettings` — Upserts branding settings (admin-role-gated). Validates appName, socialLinks structure, and theme color tokens against allowed DaisyUI token names with hex format check.
- `branding_uploadLogo` — Accepts base64 file data + type (light/dark/favicon/email), saves as Parse File, updates corresponding field. Size limits: 2MB for logos, 512KB for favicon.

**BrandingProvider** (React Context):
- `BrandingProvider.jsx` — Context provider wrapping the entire app tree (in `App.jsx` above `BrowserRouter`). Loads branding from server on mount, caches to localStorage for instant hydration. Exposes `useBranding()` hook.
- `oklchConvert.js` — Pure-math hex-to-OKLCH color conversion (hex → sRGB → linear sRGB → XYZ D65 → OKLAB → OKLCH). No external dependencies.
- `applyThemeOverrides.js` — Runtime CSS injection. Creates/updates a `<style>` element with DaisyUI CSS variable overrides (`--p`, `--s`, `--a`, `--b1`, etc.) scoped to `[data-theme="opensigncss"]` and `[data-theme="opensigndark"]`.

**Frontend — Branding admin page** (`/settings/branding`, Settings dropdown, admin-only):
- 4-tab interface: General, Logo & Favicon, Theme Colors, Social Media.
- General: app name, footer text, footer URL.
- Logo & Favicon: file upload for light/dark logos and favicon with preview, email logo URL text field.
- Theme Colors: color pickers for 16 DaisyUI tokens in two columns (light/dark), with per-token reset buttons.
- Social Media: `SocialLinkEditor` component — sortable list of icon class + title + URL, add/remove/reorder.

**App name sweep** (26 files modified):
- Replaced all hardcoded `"OpenSign™"` with `localStorage.getItem("branding_appName") || "SineSeal"` across 26 source files.
- Replaced `drivename = appName === "OpenSign™" ? "OpenSign™" : ""` with `drivename = appName` in 6 files.
- `menuJson.js` — Drive title now reads from branding cache.
- `Sidebar.jsx` — `aria-label` changed from "OpenSign Sidebar Navigation" to "Sidebar Navigation".

**Core file changes** (4 structural, 26 app-name replacements):
- `App.jsx` — Wrapped with `<BrandingProvider>` above `<BrowserRouter>`.
- `SocialMedia.jsx` — Replaced 50-line hardcoded component with dynamic rendering from `useBranding().socialLinks`. Filters out links with empty URLs.
- `Footer.jsx` — Dynamic app name, custom footer text/URL from branding context.
- `Header.jsx` — Logo source reads from `useBranding().logoUrl`/`logoDarkUrl` with fallback to existing paths. Dark mode fallback chain: `logoDarkUrl → logoUrl → applogo` (prevents falling back to hardcoded OpenSign dark logo).
- `Title.jsx` — Dynamic app name and favicon from branding context.

**Server-side email branding**:
- `Utils.js` — `appName` changed from hardcoded `const` to `export let` with ES module live bindings. Added `emailLogoUrl` export and `initAppNameFromBranding()` function that reads branded app name and email logo URL from `branding_Settings` at server startup.
- `plugins/_loader/backend.js` — Calls `Utils.initAppNameFromBranding()` after all plugins have loaded, ensuring the branding schema exists before querying.
- `pdf/PDF.js` — Replaced hardcoded `eSignName = 'OpenSign'` with lazy `getESignName()` function (`appName.replace(/[™®©]/g, '')`) evaluated at call-time. All email templates and certificate signing names now use dynamic branding. Logo URL reads from `emailLogoUrl` with fallback.
- `generateCertificatebydocId.js` — Same `getESignName()` pattern for certificate digital signatures.
- `declinedocument.js` — Email sender name and logo URL now dynamic from branding.
- `ForwardDoc.js` — Email sender name and logo URL now dynamic from branding.
- `SendMailOTPv1.js` — OTP email subject/body use dynamic `appName` via live binding (reads `const AppName = appName` at call-time).

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
- **Admin exemption**: Admin users (`contracts_Admin`, `contracts_OrgAdmin`) are exempt from all plan limits. `getExtUserInfo(extUserPtr)` resolves both `tenantId` and admin status from the document's `ExtUserPtr` in a single query — this works even when `request.user` is null (e.g., `useMasterKey: true` saves from `recreateDocument.js`). `isAdminUser(user)` checks admin role from a Parse User object for contexts where `request.user` is available.
- `beforeDocumentSave` hook — Checks `documentsPerMonth` and `storageBytes` limits (admin-exempt via `getExtUserInfo`).
- `afterDocumentSave` hook — Increments `membership_Usage.documentsCreated` for the current period.
- `beforeTemplateSave` hook — Checks `templates` limit (admin-exempt via `getExtUserInfo`).
- `onUserSignup` hook — Creates a free subscription for new tenants.
- `contractsUsersBeforeSave` trigger — Checks `seats` limit on new user creation (admin-exempt via `isAdminUser`).

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

### SMS Plugin (Twilio Notifications, OTP & Reminders)

Twilio-powered SMS notifications for the document signing workflow. Sends SMS to signers when documents are sent, notifies creators when signers sign, alerts all parties on completion, and sends automated signing reminders. Includes SMS-based OTP verification via Twilio Verify as an alternative to email OTP. Per-tenant Twilio credentials with environment variable fallback. TCPA-compliant consent tracking. Zero core file changes — fully self-contained plugin.

**Data model** (5 Parse classes, created automatically on first startup):
- `sms_Settings` — Per-tenant SMS configuration. Twilio credentials (Account SID, Auth Token, Phone Number, Verify Service SID), master enable/disable, per-event notification toggles, fromNumber override, custom message templates. CLP: authenticated read, masterKey-only write.
- `sms_Message` — SMS audit log with delivery tracking. Stores Twilio SID, to/from numbers, message body, event type (`sign_request`/`sign_notify`/`completed`/`reminder`/`test`), delivery status (queued→sent→delivered/failed), error details, and optional document/contact pointers. CLP: authenticated read, masterKey-only write.
- `sms_Consent` — TCPA opt-in/opt-out tracking per phone per tenant. Records consent source (`web_form`/`admin_manual`/`twilio_stop`), consent/revocation timestamps. Every outbound SMS checks consent first — no record means no SMS (fail-safe). CLP: authenticated read, masterKey-only write.
- `sms_UserPreference` — Per-user notification preferences. Four boolean toggles controlling which SMS types the user receives (sign requests, signature notifications, completions, reminders). All default to true — users must explicitly opt out. CLP: authenticated read, masterKey-only write.
- `sms_WebhookEvent` — Idempotency tracking for Twilio status callbacks. Prevents duplicate processing of out-of-order webhook deliveries. CLP: restricted (internal use only).

**Lib modules** (6 shared utilities):
- `twilioClient.js` — Per-tenant Twilio SDK client factory. `getTwilioClientForTenant(tenantId)` checks DB credentials first, falls back to env vars. Also exports `getVerifyServiceSidForTenant()`, `getFromNumberForTenant()`, `getAuthTokenForTenant()` with same DB-first-then-env pattern. Legacy singleton exports preserved for backward compatibility.
- `requireAdmin.js` — Admin role gate. Resolves user's `contracts_Users` role, throws if not `contracts_Admin` or `contracts_OrgAdmin`.
- `normalizePhone.js` — E.164 phone normalization. Strips non-digits, prepends `+1` for 10-digit US numbers, validates against `/^\+[1-9]\d{6,14}$/`. Coerces numeric input to string.
- `smsTemplates.js` — Default message templates (all under 160 chars for single-segment billing) with `{{placeholder}}` interpolation. Templates: `sign_request`, `sign_notify`, `completed`, `reminder`.
- `statusOrder.js` — Monotonic status ranking prevents status downgrades from out-of-order Twilio callbacks.
- `smsHelpers.js` — Shared utilities extracted from hooks/jobs: `maskPhone`, `getSettings`, `checkConsent`, `resolveSignerPhone`, `checkUserPref`, `checkUserPrefById`, `logMessage`.

**Cloud Functions** (10 total, all registered as `sms_{name}`):
- `sms_getSettings` — Returns tenant SMS settings with masked credentials (bullet chars + last 4 characters). Shows env var hints when no DB settings exist. Admin-only.
- `sms_saveSettings` — Validates and saves settings. Skips masked credential values (containing `\u2022` chars) to preserve originals when unchanged. Validates E.164 fromNumber, template string lengths (320 char max). Admin-only.
- `sms_sendTestSms` — Sends a test message to a phone number, logs to `sms_Message`. Admin-only.
- `sms_getMessageLog` — Queries `sms_Message` with filters (event type, status, phone number) and pagination (skip/limit), sorted by sentAt descending. Admin-only.
- `sms_sendSmsOtp` — Calls Twilio Verify API to send OTP code. No local code storage — Twilio manages lifecycle (5 attempts, 10-min expiry). Unauthenticated (used from guest signing flow).
- `sms_verifySmsOtp` — Calls Twilio Verify API to check code. Returns `{ verified: true/false }`. Unauthenticated.
- `sms_checkConsent` — Checks if a phone number has SMS consent for caller's tenant. Any authenticated user.
- `sms_updateConsent` — Records or revokes SMS consent for a phone number. Admin-only.
- `sms_getSmsPreferences` — Returns calling user's per-notification-type SMS preferences (defaults all true). Any authenticated user.
- `sms_saveSmsPreferences` — Saves user's notification preferences (4 boolean toggles). Any authenticated user.

**Hooks** (2, fire-and-forget — SMS never blocks document operations):
- `afterDocumentSave` — Sends "You have a document to sign" SMS. Only fires for new documents. Resolves tenant → checks `sms_Settings.enabled` + `notifySignersOnSend` → filters signers (excludes prefill role; respects `SendinOrder`) → checks consent + user preferences → interpolates template → sends via Twilio → logs to `sms_Message`.
- `afterSign` — Sends signature event and completion notifications. If not completed + `notifyCreatorOnSign`: SMS to document creator (respecting their `signNotifications` preference). If completed + `notifyAllOnComplete`: SMS to all parties (respecting `completions` preferences).

**Scheduled job** (1, registered via `Parse.Cloud.job()`):
- `sms_sendReminders` — Queries documents where `IsCompleted !== true`, `AutomaticReminders === true`, `NextReminderDate <= now`, `IsArchive !== true`. Sends reminder SMS to unsigned signers with valid consented phones. Updates `NextReminderDate`. Processes up to 100 docs per run. Triggered externally (cron/Parse Dashboard).

**Webhook route** (1):
- `POST /plugins/sms/twilio/status` — Twilio delivery status callbacks. Validates `X-Twilio-Signature` using `twilio.validateRequest()` (works with parsed form params — no raw body needed). Updates `sms_Message` with monotonic status check. Handles STOP/opt-out (error code 21610) by updating `sms_Consent`. Always returns 200 to prevent Twilio retries.

**Frontend — SMS Settings admin page** (`/settings/sms`, Settings dropdown, admin-only):
- 4-tab interface: Configuration, Templates, Message Log, Test.
- Configuration: Twilio Credentials section (Account SID, Auth Token as password field, Phone Number, Verify Service SID) in 2-column grid, followed by 6 feature toggles (enabled, notifySignersOnSend, notifyCreatorOnSign, notifyAllOnComplete, enableSmsOtp, enableReminders) and sender override fromNumber field.
- Templates: Editable text areas for each event template with variable reference below each.
- Message Log: `MessageLogTable` component with event/status/phone filters + pagination. Status badges: `op-badge-success` (delivered), `op-badge-warning` (sent/sending), `op-badge-error` (failed), `op-badge-ghost` (queued).
- Test: Phone input + "Send Test SMS" button with result display.

**Frontend — SMS Preferences user page** (`/smsprefs`, sidebar item before Settings, all authenticated users):
- 4 toggle switches: Sign Requests, Signature Notifications, Completions, Reminders.
- All default to ON. Users opt out of specific notification types without affecting other users or system-wide settings.

**Environment variables** (SMS plugin):
- `TWILIO_ACCOUNT_SID` — Twilio Account SID (starts with `AC`). Required unless configured per-tenant in DB.
- `TWILIO_AUTH_TOKEN` — Twilio Auth Token. Used for API calls and webhook signature validation.
- `TWILIO_PHONE_NUMBER` — Default "From" phone number in E.164 format (e.g., `+15551234567`).
- `TWILIO_VERIFY_SERVICE_SID` — Twilio Verify Service SID (starts with `VA`) for OTP.

### Docker & Build Fixes

- Fixed esbuild parse error from `*/` in JSX comments (`App.jsx`).
- Fixed virtual module import paths from relative to absolute (`vite-plugin-opensign-plugins.js`).
- Fixed Rollup module resolution for plugin files outside `node_modules` tree (symlink in client Dockerhubfile).
- Fixed ESM/CJS module detection for plugin loader (`plugins/_loader/package.json` with `"type": "module"`, renamed `tailwind-plugin-overrides.js` → `.cjs`).
- Fixed JSDoc block comment `*/` pattern in `backend.js` (converted to line comments).
- Fixed broken synchronous `getStripe()` function that used `await` in a non-async context (`stripeClient.js`).
- Added `"type": "module"` to membership plugin `package.json` for proper ES module parsing.
- Fixed `Dockerfile.server` layer order — plugins must be copied before `npm install` so the postinstall script (`install-plugin-deps.js`) can discover and install plugin dependencies (stripe, twilio). Previously plugins were copied after install, causing silent dependency misses.
- Fixed `install-plugin-deps.js` target detection in Docker — `process.cwd()` in Docker is `/usr/src/app` (not containing "OpenSignServer" in path), so added `detectTarget()` function that falls back to reading `package.json` name field when path-based detection fails. Affected both stripe and twilio dependency installation.

### Deployment

- Custom Docker images: `sineseal/server:latest`, `sineseal/client:latest`.
- Production at `sineseal.com` on DigitalOcean droplet (157.245.124.169).
- SSH: `ssh -i ~/.ssh/id_rsa_sineseal opensign@157.245.124.169`.
- Source code: `~/opensign-src/` on server. Production compose: `~/opensign/`.
- Caddy reverse proxy with automatic HTTPS.
- MongoDB in Docker with persistent volume.
- Plugins volume-mounted at `./plugins:/usr/plugins:ro` for hot-swap without image rebuilds.

**Build & deploy workflow**:
- Client image: `cd ~/opensign-src && docker build -f Dockerfile.client -t sineseal/client:latest .`
- Server image: `cd ~/opensign-src && docker build -f Dockerfile.server -t sineseal/server:latest .`
- Deploy: `cd ~/opensign && docker compose up -d server` (or `client`). Must use `docker compose up -d` (not `docker restart`) to pick up new images.
- Plugin-only changes (volume-mounted): copy files to `~/opensign/plugins/` then `docker restart` the server container.
- Server app code changes (baked in image): requires image rebuild + `docker compose up -d`.

---

## Files Changed (from upstream v2.35.0)

~126 files changed, ~7800 insertions, ~360 deletions.

**Core modifications** (18 files — plugin system hooks + branding sweep + email branding):
- `apps/OpenSignServer/index.js`
- `apps/OpenSignServer/Utils.js` — Dynamic `appName`/`emailLogoUrl` exports with `initAppNameFromBranding()`
- `apps/OpenSignServer/cloud/main.js`
- `apps/OpenSignServer/cloud/parsefunction/DocumentBeforesave.js`
- `apps/OpenSignServer/cloud/parsefunction/DocumentAftersave.js`
- `apps/OpenSignServer/cloud/parsefunction/TemplateBeforesave.js`
- `apps/OpenSignServer/cloud/parsefunction/usersignup.js`
- `apps/OpenSignServer/cloud/parsefunction/pdf/PDF.js` — Dynamic `getESignName()`, dynamic email logo
- `apps/OpenSignServer/cloud/parsefunction/generateCertificatebydocId.js` — Dynamic `getESignName()` for certificates
- `apps/OpenSignServer/cloud/parsefunction/declinedocument.js` — Dynamic email branding
- `apps/OpenSignServer/cloud/parsefunction/ForwardDoc.js` — Dynamic email branding
- `apps/OpenSignServer/Dockerhubfile`
- `apps/OpenSign/src/App.jsx`
- `apps/OpenSign/src/json/menuJson.js`
- `apps/OpenSign/src/components/sidebar/Menu.jsx`
- `apps/OpenSign/src/components/sidebar/SubMenu.jsx`
- `apps/OpenSign/Dockerhubfile`
- `apps/OpenSign/vite.config.js`
- `apps/OpenSign/tailwind.config.js`

**Plugin system** (5 files):
- `plugins/_loader/backend.js` — Calls `initAppNameFromBranding()` after all plugins load
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
- `plugins/membership/backend/lib/checkLimit.js` — Admin exemption: `getExtUserInfo()`, `isAdminUser()`
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
- `plugins/membership/backend/hooks/beforeDocumentSave.js` — Admin-exempt via `getExtUserInfo()`
- `plugins/membership/backend/hooks/afterDocumentSave.js`
- `plugins/membership/backend/hooks/beforeTemplateSave.js` — Admin-exempt via `getExtUserInfo()`
- `plugins/membership/backend/hooks/onUserSignup.js`
- `plugins/membership/backend/triggers/contractsUsersBeforeSave.js` — Admin-exempt via `isAdminUser()`
- `plugins/membership/frontend/pages/Billing.jsx`
- `plugins/membership/frontend/pages/PlanAdmin.jsx`
- `plugins/membership/frontend/components/UsageBar.jsx`
- `plugins/membership/frontend/components/PlanCard.jsx`

**SMS plugin** (26 files):
- `plugins/sms/manifest.json`
- `plugins/sms/package.json`
- `plugins/sms/backend/index.js` — Schema creation for 5 Parse classes
- `plugins/sms/backend/lib/twilioClient.js` — Per-tenant Twilio client factory with DB-first credential lookup
- `plugins/sms/backend/lib/requireAdmin.js` — Admin role gate
- `plugins/sms/backend/lib/normalizePhone.js` — E.164 normalization + validation + numeric coercion
- `plugins/sms/backend/lib/smsTemplates.js` — Default templates + `{{placeholder}}` interpolation
- `plugins/sms/backend/lib/statusOrder.js` — Monotonic status ranking for webhook updates
- `plugins/sms/backend/lib/smsHelpers.js` — Shared utilities for hooks/jobs (dedup ~300 lines)
- `plugins/sms/backend/functions/getSettings.js` — Read tenant config with credential masking
- `plugins/sms/backend/functions/saveSettings.js` — Validate + save settings, skip masked credential values
- `plugins/sms/backend/functions/sendTestSms.js` — Send test message to verify config
- `plugins/sms/backend/functions/getMessageLog.js` — Query SMS log with filters + pagination
- `plugins/sms/backend/functions/sendSmsOtp.js` — Start Twilio Verify OTP
- `plugins/sms/backend/functions/verifySmsOtp.js` — Check Twilio Verify code
- `plugins/sms/backend/functions/checkConsent.js` — Check phone consent status
- `plugins/sms/backend/functions/updateConsent.js` — Record/revoke consent
- `plugins/sms/backend/functions/getSmsPreferences.js` — Get user notification prefs
- `plugins/sms/backend/functions/saveSmsPreferences.js` — Save user notification prefs
- `plugins/sms/backend/routes/twilioWebhook.js` — `POST /plugins/sms/twilio/status` delivery callbacks
- `plugins/sms/backend/hooks/afterDocumentSave.js` — SMS signers when doc created
- `plugins/sms/backend/hooks/afterSign.js` — SMS on sign event + completion
- `plugins/sms/backend/jobs/sendReminders.js` — Scheduled reminder job
- `plugins/sms/frontend/pages/SmsAdmin.jsx` — Admin settings (4-tab: Config, Templates, Log, Test)
- `plugins/sms/frontend/pages/SmsPreferences.jsx` — User notification preferences
- `plugins/sms/frontend/components/MessageLogTable.jsx` — Paginated log table with status badges

**Branding plugin** (13 files):
- `plugins/branding/manifest.json`
- `plugins/branding/package.json`
- `plugins/branding/backend/index.js`
- `plugins/branding/backend/lib/defaults.js`
- `plugins/branding/backend/lib/requireAdmin.js`
- `plugins/branding/backend/functions/getSettings.js`
- `plugins/branding/backend/functions/saveSettings.js`
- `plugins/branding/backend/functions/uploadLogo.js`
- `plugins/branding/frontend/BrandingProvider.jsx`
- `plugins/branding/frontend/lib/oklchConvert.js`
- `plugins/branding/frontend/lib/applyThemeOverrides.js`
- `plugins/branding/frontend/components/SocialLinkEditor.jsx`
- `plugins/branding/frontend/pages/BrandingAdmin.jsx`

**Branding sweep — app name replacements** (26 client files):
- `apps/OpenSign/src/constant/Utils.js` (4 instances + localStorage)
- `apps/OpenSign/src/json/menuJson.js`
- `apps/OpenSign/src/components/SocialMedia.jsx` (full rewrite)
- `apps/OpenSign/src/components/Footer.jsx` (full rewrite)
- `apps/OpenSign/src/components/Header.jsx`
- `apps/OpenSign/src/components/Title.jsx`
- `apps/OpenSign/src/components/sidebar/Sidebar.jsx`
- `apps/OpenSign/src/components/sidebar/Menu.jsx`
- `apps/OpenSign/src/components/sidebar/SubMenu.jsx`
- `apps/OpenSign/src/components/pdf/EditTemplate.jsx`
- `apps/OpenSign/src/components/pdf/AgreementContent.jsx`
- `apps/OpenSign/src/components/preferences/MailTemplateEditor.jsx`
- `apps/OpenSign/src/components/shared/fields/FolderModal.jsx`
- `apps/OpenSign/src/components/shared/fields/SelectFolder.jsx`
- `apps/OpenSign/src/components/bulksend/BulkSendUi.jsx`
- `apps/OpenSign/src/pages/Login.jsx`
- `apps/OpenSign/src/pages/GuestLogin.jsx`
- `apps/OpenSign/src/pages/Form.jsx`
- `apps/OpenSign/src/pages/Opensigndrive.jsx`
- `apps/OpenSign/src/pages/SignyourselfPdf.jsx`
- `apps/OpenSign/src/pages/PdfRequestFiles.jsx`
- `apps/OpenSign/src/pages/Preferences.jsx`
- `apps/OpenSign/src/pages/AddAdmin.jsx`
- `apps/OpenSign/src/pages/UpdateExistUserAdmin.jsx`
- `apps/OpenSign/src/layout/HomeLayout.jsx`
- `apps/OpenSign/src/primitives/DownloadPdfZip.jsx`
- `apps/OpenSign/src/primitives/RenderReportCell.jsx`
- `apps/OpenSign/src/reports/document/DocumentsReport.jsx`
- `apps/OpenSign/src/reports/template/TemplatesReport.jsx`
