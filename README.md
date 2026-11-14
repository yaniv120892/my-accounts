# my-accounts

One account for the My suite (Expenses, Investments, Shopping and Parking). People sign in here
with an emailed code or Google, and the apps sign in through it with OpenID Connect. Built on
Next.js 16 and Better Auth 1.7.23. Design decisions are in [DECISIONS.md](DECISIONS.md).

## Running locally

```bash
docker compose up -d   # Postgres on port 5436: my_accounts_dev, _test and _e2e_test
cp .env.example .env   # point DATABASE_URL at the docker database, set BETTER_AUTH_SECRET
npm install
npm run db:deploy
npm run dev
```

With no SMTP settings, `next dev` prints the sign-in code to the console.

## Checks

`npm run format:check`, `lint`, `typecheck`, `test` (unit), `test:integration` (the full OIDC flow
against the docker database), `build` and `test:e2e` (Playwright on its own dev server).

## Docs

- [docs/sign-in.md](docs/sign-in.md) — codes, Google, and how a sign-in resumes an authorize.
- [docs/clients.md](docs/clients.md) — registering a suite app and what it configures.
- [docs/deployment.md](docs/deployment.md) — Vercel, Neon and the environment variables.
