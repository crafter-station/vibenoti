# VibeNoti

## Setup

Install dependencies from the repository root:

```bash
bun install
```

Create the local environment file and fill in its secrets:

```bash
cp .env.example .env
```

Start the development workspaces:

```bash
bun run dev
```

Start OpenCode with the API environment loaded:

```bash
bun run opencode
```

The launcher reads `apps/web/.env` and passes its `API_KEY` to the plugin as
`VIBENOTI_API_KEY`. OpenCode must be restarted after plugin changes.

## Validation

```bash
bun run lint
bun run typecheck
bun run test
bun run build
```

## Better Auth database schema

1. Generate the Better Auth Drizzle schema:

```bash
bun run auth:generate
```

This creates or updates `packages/db/src/auth-schema.ts`.

2. Generate the SQL migration:

```bash
bun run db:generate
```

Migration files are stored in `packages/db/drizzle`.

3. Apply pending migrations to PostgreSQL:

```bash
bun run db:migrate
```

Repeat these steps whenever the Better Auth configuration, fields, or plugins change.
