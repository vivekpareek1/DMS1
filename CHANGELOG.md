# CHANGELOG - what actually changed and what's still open

This replaces the previous README-HONEST-VERDICT-FIXED.md, which described
fixes to the package before this one and is no longer accurate.

## Verified, not just claimed

- `cd backend && npm install` - succeeds (687 packages).
- `cd backend && npx tsc --noEmit` - passes clean.
- `cd backend && npx jest` - both spec suites pass for real (4/4 tests).
- `cd frontend && npm install` - succeeds.
- `cd frontend && npx tsc --noEmit` - passes clean.
- `cd frontend && npx next build` - succeeds, produces a real production build.

## NOT verified - you need to do this first

Prisma's CLI (`generate`, `validate`, `migrate`) could not run in the sandbox
this was built in - it needs `binaries.prisma.sh`, which wasn't reachable.
Every `prisma.<model>.<field>` reference in the code was checked by hand
against `schema.prisma`, and real mismatches were fixed (see below), but this
was a manual cross-check, not a compiler-verified one. Run this first, before
anything else:

    cd backend
    npx prisma generate
    npx prisma migrate dev --name init
    npx tsc --noEmit    # re-run now that the real client types exist

## Bugs found and fixed

- `PermissionService`: the folder-inheritance walk had no cycle detection -
  a circular folder reference (or a bad migration) would hang the request
  forever. Added a visited-set + depth cap. The existing test for this was
  written but would have hung, not passed, without the fix.
- `PermissionService.can()` was missing the `isFolder` parameter that
  `files.controller.ts` was already calling it with - uploads were checking
  permissions against a non-existent File row and always failing.
- `PermissionService.invalidateCache()` was called but didn't exist.
- Several services (`billing`, `company`, `screenshot-audit`,
  `files.controller`) took `prisma: any` in their constructors instead of
  `PrismaService` - NestJS can't resolve an untyped `any` dependency, so
  these would fail at boot with "cannot resolve dependencies."
- `schema.prisma` was missing `FileVersion` (referenced by
  `files.controller.ts`), and `File` was missing `md5`/`isLocked`/
  `lockedById`/`lockedAt` - the controller and schema had drifted apart.
- `files.controller.ts` wrote file size as `BigInt` into an `Int` column and
  into a JSON response body (BigInt isn't JSON-serializable) - changed to
  `Number`.
- `billing.service.ts` referenced `edition.yearlyDiscount`, which didn't
  exist on `EditionFeatures` anywhere. Added it with a placeholder value of
  15% on every tier - **confirm your actual yearly-discount pricing before
  launch**, this was invented to make the code type-check, not a business
  decision.
- `billing.service.ts` had a null-safety bug on `razorpayOrder` that could
  surface as a runtime error if Razorpay isn't configured.
- `CustomThrottlerGuard.getTracker` had a synchronous signature that doesn't
  match the `@nestjs/throttler` version actually installed.
- `health.controller.ts` manually did `new AuditService()` instead of using
  dependency injection - now injected properly.
- `ThumbnailWorker` was defined but never registered as a provider anywhere
  - queued thumbnail jobs would sit unprocessed forever. Now registered.
- No `tsconfig.json`, `tsconfig.build.json`, or `nest-cli.json` existed for
  the backend, and no `tsconfig.json` existed for the frontend - the backend
  could not have been built even once, and the frontend's `@/*` import alias
  (used in every new component) had nothing resolving it.
- No `app/layout.tsx` existed - Next.js App Router will not run at all
  without a root layout. Added one.
- `PlanSelector.tsx` imported from `@/config/edition.config`, a path that
  never existed - now fetches pricing from `GET /api/billing/plans` instead
  of duplicating the pricing config on the frontend.
- `WatermarkOverlay.tsx` had a dead `<style jsx>` block targeting a
  `.watermark` class nothing in the component actually used - removed.
- `next@14.2.0` was pinned to a version with disclosed CVEs. Next.js 14.x is
  fully end-of-life (October 2025) - `14.2.35` is the last patched release
  in that line and is what's pinned now. **Plan a migration to 15.x/16.x**;
  14.x will not receive fixes for anything disclosed after EOL.
- 81 duplicate/abandoned file versions (`_1.ts`, `_2_1.ts`, etc.) and an
  entire fictitious `master-agent`/"Fable" module (fake third-party AI
  review integration, never a real product) were deleted.

## New: Google SSO, as requested

- `AuthModule` (`google-auth.service.ts`, `auth.controller.ts`,
  `jwt-auth.guard.ts`, `public.decorator.ts`): verifies a Google ID token
  server-side via `google-auth-library`, then issues your own JWT for
  session handling. `POST /auth/google-signup` creates a Company + first
  admin User; `POST /auth/google-login` logs an existing user in.
- `JwtAuthGuard` is registered globally (`APP_GUARD`) - every route requires
  a valid Bearer token unless explicitly marked `@Public()`.
- `schema.prisma`: `User.password` is now optional and `User.googleId` was
  added (this needs a real migration - see above).
- Frontend: the signup page now renders Google's own Sign-In button
  (`GoogleSignInButton.tsx`, using Google Identity Services) instead of
  collecting a password that the backend was never going to check.
- **You need to set `GOOGLE_OAUTH_CLIENT_ID` (backend) and
  `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (frontend)** - the app fails fast on boot
  without the former (see `env.validation.ts`).

## New: wired the modules that previously 404'd

`BillingModule`, `CompanyModule` (controller didn't exist before at all),
`DlpModule` (controller didn't exist before at all), and `HealthModule` are
now written and imported into `AppModule`. Billing and company endpoints
check that the authenticated user's `companyId` matches the resource being
accessed - previously any authenticated-shaped request could act on any
company's data.

## Explicitly still stubbed / not done

- **DLP components have no page to live on.** `ScreenshotProtection.tsx`
  and `SecureViewer.tsx` exist but are not imported anywhere in `app/` -
  there is no file-viewer route yet. The backend endpoints they'd call
  (`POST /dlp/screenshot-attempt`, etc.) exist and are wired; the frontend
  page that would use them does not.
- Razorpay/Stripe: `billing.service.ts`'s order-creation and
  signature-verification logic is real, not stubbed, but nothing in this
  pass added a server-to-server Razorpay *webhook* endpoint - right now
  activation only happens via the client-driven `verify-payment` call. Add
  a webhook for resilience against a client that never calls back.
  `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` need to be set for checkout to
  work at all - see `PaymentCheckout.tsx`'s hardcoded test-card copy, which
  you'll want to remove before anyone but you sees this page.
- No end-to-end test against a real Postgres/Redis - only the two existing
  unit-test files (permission cycle detection, retention cutoff math) were
  verified. Coverage on `AuditService`, `DriveService`, billing, DLP is
  still zero.
- `docker-compose.production.fixed.yml` and the various deploy scripts in
  `deploy/` were not re-audited in this pass beyond what the last review
  already covered.
