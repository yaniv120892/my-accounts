# Deployment

Load before changing `vercel.json`, a database or auth env var, or when a Vercel build fails.

## Hosting

Vercel project in `yaniv120892s-projects`, functions in `fra1` (`vercel.json`). Neon project in
Frankfurt with a `production` branch for Production and a `preview` branch for every Preview.
Tests use the docker-compose Postgres (port 5436), never Neon.

`vercel.json` runs `prisma migrate deploy` and then the build, so every deployment migrates its
own branch first. That needs both `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct).

## Environment variables

| Variable                                                        | Required   | Notes                                                                                                                                                                                                           |
| --------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`, `DATABASE_URL_UNPOOLED`                         | yes        | Production and Preview point at their own Neon branch.                                                                                                                                                          |
| `BETTER_AUTH_SECRET`                                            | yes        | Changing it signs everyone out and orphans the JWKS signing key. Different per environment.                                                                                                                     |
| `BETTER_AUTH_URL`                                               | production | The public origin; the issuer is this plus `/api/auth`. Unset, a deployment uses its own URL, which is fine for previews only.                                                                                  |
| `TRUSTED_CLIENT_IDS`                                            | no         | Client ids from `npm run clients:create`, comma-separated.                                                                                                                                                      |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`                      | no         | Register `<BETTER_AUTH_URL>/api/auth/callback/google` with Google.                                                                                                                                              |
| `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_HOST`, `SMTP_PORT`          | production | Without them no code is mailed.                                                                                                                                                                                 |
| `UPSTASH_REDIS_REST_URL`/`_TOKEN` or `KV_REST_API_URL`/`_TOKEN` | production | The daily mail budget; unset on production, no mail is sent.                                                                                                                                                    |
| `SIGN_IN_MAIL_ENABLED`, `SIGN_IN_MAIL_GLOBAL_DAILY_LIMIT`       | no         | Kill switch and daily cap.                                                                                                                                                                                      |
| `BETTERSTACK_SOURCE_URL`/`_TOKEN`                               | production | The `my-accounts` HTTP source in Better Stack; warn and above ship there, and each production cold start ships one `server_booted` line. Unset on production, the boot logs `better_stack_logs_not_configured`. |
| `NEXT_PUBLIC_SENTRY_DSN`                                        | production | Sentry project `my-accounts`, errors only. Unset on production, the boot logs `sentry_errors_not_configured`.                                                                                                   |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ALERT_CHAT_ID`                  | production | The suite's ops-alert bot and chat, the same values as the other apps. Unset on production, the boot logs `telegram_alerts_not_configured`.                                                                     |
| `OPS_SMOKE_SECRET`                                              | no         | Bearer secret for the smoke route under "Proving error alerts"; unset, the route answers 404.                                                                                                                   |
| `SENTRY_ORG`/`_PROJECT`/`_AUTH_TOKEN`, `POSTHOG_PROJECT_KEY`    | no         | Source-map upload and product events; each is off when unset.                                                                                                                                                   |
| `LOG_LEVEL`                                                     | no         | Defaults to `info`.                                                                                                                                                                                             |

`.env.example` lists the same with defaults.

## Health

`/api/health` is liveness and touches nothing; `/api/health/deep` probes the database and is
rate-limited per address.

## Proving error alerts

`POST /api/ops/smoke-error` throws on purpose, so the request fails like any unhandled 5xx: it is
logged as `unhandled_request_error`, reported to Sentry, and alerted on Telegram. It answers 404
while `OPS_SMOKE_SECRET` is unset, 429 past five calls per address per hour, and 401 (logged as
`ops_smoke_unauthorized`) without the secret as a bearer token:

```sh
curl -X POST -H "Authorization: Bearer $OPS_SMOKE_SECRET" https://yaniv-accounts.vercel.app/api/ops/smoke-error
```

Telegram alerts are capped at a few per alert type per hour on each instance, so repeated calls
stop being alerted.
