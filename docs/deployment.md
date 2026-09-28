# GitHub CI and Vercel deployment

## Continuous integration

`.github/workflows/ci.yml` runs on pull requests, pushes to `main`, and manual
workflow runs. It installs the locked pnpm dependencies on Node.js 24 and runs:

- Biome lint and formatting checks, Next.js route type generation, TypeScript,
  all unit tests, and a production build.
- PostgreSQL 16 in a disposable service: create the restricted runtime role,
  apply all migrations twice, then test runtime permissions and user isolation
  for settings, day entries, and episodes, including pooled identity reset.

The test jobs require no secrets. Database credentials in CI are disposable test
credentials. The production release job requires the secrets listed below. The build fetches Google fonts and requires internet access.
Run `pnpm check` and `pnpm build` locally. `pnpm test:db` requires explicit
`DATABASE_ADMIN_URL` and `DATABASE_URL` pointing to a migrated test database;
it inserts temporary users and removes them afterwards. Never target production.

In GitHub, create a ruleset for `main` requiring pull requests and both checks:
`Lint, types, tests and build` and `Migrations and database isolation`.
Require branches to be up to date before merging, and restrict bypasses.

## One-time database setup

1. Provision a PostgreSQL database (for example Neon) near the Vercel function
   region you will choose in Project Settings. Create a separate database or
   branch for Preview; previews must never use production credentials or data.
2. As the database owner, create `mylife_app` using the SQL in the README's
   Production database roles section. This must happen **before** migration,
   because migrations grant permissions only when that role exists.
3. In a trusted operator shell, set `DATABASE_ADMIN_URL` to the provider's
   direct owner connection URL, including its required TLS options, and run
   `pnpm db:migrate`. Repeat for the preview database.
4. With that same environment, run `pnpm db:create-user you@example.com` and
   enter a password at the prompt. Repeat for a preview test account.
5. Obtain pooled connection URLs using `mylife_app` credentials for app runtime.
   Preserve provider-required TLS parameters. The app rejects superuser and
   BYPASSRLS connections; the provider's default owner URL is unsuitable.

Production migrations run automatically in GitHub Actions after both test jobs
pass and before Vercel deployment. Do not add migrations to the Vercel build
command or expose owner credentials to the deployed app. Preview databases
still require their own migrations using their own owner URL.

## Connect Vercel

1. Import this GitHub repository into Vercel. Select Next.js, repository root
   (`.`), Node.js 24.x, and production branch `main`.
2. Add these environment variables separately for Production and Preview:

   | Variable | Value |
   | --- | --- |
   | `DATABASE_URL` | Environment-specific pooled `mylife_app` URL with TLS |
   | `AUTH_THROTTLE_SECRET` | Unique random secret, at least 32 characters; generate with `openssl rand -base64 32` |
   | `ENABLE_EXPERIMENTAL_COREPACK` | `1`, to enable the pinned package manager |

   Do not add `DATABASE_ADMIN_URL` or use `NEXT_PUBLIC_` for any secret.
   `AUTH_TRUST_PROXY_HEADERS` is unnecessary on Vercel.
3. Keep the checked-in `vercel.json` settings. The install uses Corepack and
   the exact pnpm version from `packageManager`; the Vercel build runs lint,
   type checking, unit tests, then Next.js compilation. Leave output-directory
   settings at the Next.js default. Select a function region near PostgreSQL.
4. Configure the release secrets below, then push to `main`. After deployment,
   verify login, save a moment and a daily entry, refresh to
   confirm persistence, log out, and confirm protected pages require login.
   Use two preview accounts to check their records stay separate.

## Enable automatic production migrations and deployment

Complete this setup before merging the release workflow. `vercel.json` disables
Vercel's automatic Git deployments for `main`, so application code cannot deploy
before GitHub finishes its migrations. The currently deployed site keeps running.
Production releases now come from the GitHub workflow; other branches can still
receive Vercel previews using their separately configured databases.

1. In GitHub, open this repository → Settings → Environments → New environment.
   Name it `production`. Restrict deployment branches to `main`. Required
   reviewers are optional; leave them unset for fully automatic releases.
2. Add these **environment secrets** to `production` (not to Vercel):

   | Secret | Where to get the value |
   | --- | --- |
   | `DATABASE_ADMIN_URL` | Neon → Connect → `neondb_owner`, pooling OFF; copy the complete production URL with the password |
   | `VERCEL_TOKEN` | [Vercel account tokens](https://vercel.com/account/tokens); create a token scoped to the team owning MyLife |
   | `VERCEL_ORG_ID` | Vercel team settings → General → Team ID (the CLI calls it Org ID) |
   | `VERCEL_PROJECT_ID` | MyLife's Vercel project settings → General → Project ID |

   Alternatively, `vercel link` in a trusted local terminal creates ignored
   `.vercel/project.json`, whose `orgId` and `projectId` contain the two IDs.
   Keep the restricted pooled `DATABASE_URL` and auth secret in Vercel as above.
3. Commit and push these changes to `main`. In GitHub → Actions → CI, confirm
   both test jobs pass, followed by **Migrate and deploy production**. The release
   applies pending SQL files and deploys the exact tested checkout using a pinned
   Vercel CLI. The owner URL is supplied only to the migration/validation steps;
   it is never written to an environment file or passed to the Vercel CLI.
4. If setup was incomplete on the first run, add the missing secrets and use
   Actions → CI → Run workflow → `main`. This runs tests again before releasing.

PRs and workflow runs on other branches never receive production release secrets
or run production migrations. Runs for `main` are serialized and are not cancelled
by subsequent pushes. Outdated commits are rejected before migration/deployment,
so rerunning an old workflow cannot deploy an old checkout over a newer release.
Do not bypass this sequence with a dashboard production redeploy or deploy hook
when a release includes schema changes.

## Adding future migrations

1. Add a new SQL file, for example `migrations/0004_add_reminders.sql`. Preserve
   zero-padded ordering and never edit or rename an already applied migration.
2. Include appropriate grants for `mylife_app`; user-owned tables also need forced
   RLS and policies following the existing migrations.
3. Test locally with `pnpm db:migrate` and exercise the changed app behavior.
   Apply separately to your preview database before testing a schema-dependent
   preview. CI tests all migrations on a fresh PostgreSQL database and tests
   concurrent execution, reruns, and rollback after a failed migration.
4. Merge to `main`. GitHub tests, migrates production, then deploys automatically.

The runner holds a PostgreSQL advisory lock on one direct connection throughout
migration discovery and execution. Concurrent runners wait (up to 60 seconds for
a lock) and then recheck which files were applied. Each SQL file and its migration
record commit together; a failed file rolls back and blocks deployment. Earlier
successful files remain applied. The connection closes and releases its lock on
exit. Use the direct URL; transaction pooling is unsuitable for this session lock.
Do not include transaction-control statements or operations such as
`CREATE INDEX CONCURRENTLY` in these automatically wrapped migration files.

Schema changes must remain compatible with the running and previous app versions:
add a new column first, deploy code using it, and remove old columns in a later
release. If migration succeeds but deployment fails, the schema remains updated
and the previous app stays live. Fix the failure and run CI on current `main`;
already-applied migration files will be skipped. Database rollback is a separate
operator action, not part of Vercel application rollback.

Deployment lint uses `pnpm lint:app` to check `src`, `scripts`, and `tests`.
Vercel can add generated files and rewrite configuration formatting in its
build workspace, so checking the entire workspace there can fail on files
outside application code. GitHub CI and local `pnpm check` retain the full
repository lint and formatting check, including root configuration files.

Configure a custom domain and a login rate-limit rule in Vercel as appropriate.
To roll back, promote a known-good deployment in Vercel; database migrations
are not rolled back with application code. Keep schema changes compatible
with the previous release and use provider backups for database recovery.

References: [Vercel GitHub integration](https://vercel.com/docs/git/vercel-for-github),
[Vercel configuration](https://vercel.com/docs/project-configuration/vercel-json),
[Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).
