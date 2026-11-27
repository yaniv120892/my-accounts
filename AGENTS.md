<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project docs

Short docs, one topic each. Load the one whose trigger matches your task.

- [Suite architecture](https://github.com/yaniv120892/platform) (locally `../platform`) — how the
  My apps and shared packages fit together. Its `DECISIONS.md` "Accounts" row is why this app
  exists. Load its `AGENTS.md` before adding a store, cron, external API or alert, or code a
  sibling app could reuse. Update it in the same change when a fact there moves.
- [DECISIONS.md](DECISIONS.md) — why the app is built this way. Load before reversing or adding a
  design decision.
- [docs/sign-in.md](docs/sign-in.md) — the emailed code, Google, sessions, and how a sign-in
  resumes an authorize. Load before changing `src/lib/createAuth.ts`, a sign-in or consent page,
  or `src/lib/authClient.ts`, and before upgrading Better Auth or regenerating the Prisma schema.
- [docs/clients.md](docs/clients.md) — registering a suite app as a trusted OIDC client and what
  the client app configures. Load before creating a client or changing `scripts/create-client.mts`.
- [docs/deployment.md](docs/deployment.md) — Vercel, Neon and every environment variable. Load
  before changing `vercel.json`, an env var, or when a build fails on the database.
