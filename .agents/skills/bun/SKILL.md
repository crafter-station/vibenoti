---
name: Bun
description: Use when building, running, testing, or bundling JavaScript/TypeScript applications. Reach for Bun when you need to execute scripts, manage dependencies, run tests, or bundle code for production. Bun is a drop-in replacement for Node.js with integrated package manager, test runner, and bundler.
metadata:
    mintlify-proj: bun
    version: "1.0"
---

# Bun Skill Reference

## Product Summary

Bun is an all-in-one JavaScript/TypeScript toolkit: a fast runtime (drop-in Node.js replacement), package manager, test runner, and bundler. The `bun` binary includes everything needed to develop modern JavaScript applications. Key files: `package.json` (dependencies), `bunfig.toml` (Bun config), `bun.lock` (lockfile). Core commands: `bun run`, `bun install`, `bun test`, `bun build`. See [bun.com/docs](https://bun.com/docs) for complete documentation.

## When to Use

- **Running scripts**: Execute `.ts`, `.tsx`, `.js`, `.jsx` files directly with `bun run` or `bun file.ts`
- **Package management**: Install, add, remove, or update dependencies with `bun install`, `bun add`, `bun remove`
- **Testing**: Write and run Jest-compatible tests with `bun test`
- **Bundling**: Bundle TypeScript/JSX for browsers or servers with `bun build`
- **HTTP servers**: Build servers with `Bun.serve()` for high-performance APIs
- **Monorepos**: Manage workspaces with `bun install --filter` and workspace configuration
- **Replacing Node.js**: Use Bun as a faster alternative to Node.js in existing projects (4x faster startup)

## Quick Reference

### Essential Commands

| Command | Purpose |
|---------|---------|
| `bun run <file>` | Execute a TypeScript/JavaScript file |
| `bun run <script>` | Run a script from `package.json` |
| `bun install` | Install all dependencies from `package.json` |
| `bun add <pkg>` | Add a package to dependencies |
| `bun add -d <pkg>` | Add a package to devDependencies |
| `bun remove <pkg>` | Remove a package |
| `bun test` | Run all tests matching `*.test.ts` or `*.spec.ts` |
| `bun build <entry>` | Bundle code for production |
| `bun --watch run <file>` | Run file in watch mode (auto-restart on changes) |
| `bun test --watch` | Run tests in watch mode |

### Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | Project metadata, dependencies, scripts |
| `bunfig.toml` | Bun-specific settings (runtime, test, install, bundler) |
| `bun.lock` | Lockfile (text format by default, binary `bun.lockb` in older versions) |
| `tsconfig.json` | TypeScript configuration (Bun respects this) |

### Common bunfig.toml Sections

```toml
# Runtime settings
preload = ["./setup.ts"]  # Scripts to run before execution
jsx = "react"             # JSX configuration
logLevel = "debug"        # Logging level

# Test runner settings
[test]
root = "./__tests__"
coverage = true
coverageThreshold = 0.9

# Package manager settings
[install]
optional = true           # Install optional dependencies
dev = true               # Install dev dependencies
linker = "hoisted"       # "hoisted" or "isolated" node_modules layout

# Server settings
[serve]
port = 3000              # Default port for Bun.serve
```

## Decision Guidance

### When to Use Bun vs Node.js

| Scenario | Use Bun | Use Node.js |
|----------|---------|-----------|
| New project, want fastest startup | ✓ | |
| Existing Node.js project, want faster | ✓ | |
| Need specific Node.js ecosystem tool | | ✓ |
| Building full-stack with bundling | ✓ | |
| Monorepo with workspaces | ✓ | |

### Package Manager: Hoisted vs Isolated Installs

| Approach | Use When | Trade-offs |
|----------|----------|-----------|
| **Hoisted** (default for single packages) | Traditional npm behavior needed | Allows phantom dependencies |
| **Isolated** (default for workspaces) | Strict dependency isolation required | Slightly larger `node_modules` |

### Bundler: Target Selection

| Target | Use For |
|--------|---------|
| `browser` | Client-side code, web apps |
| `bun` | Server code, full-stack apps with HTML imports |
| `node` | Node.js-compatible server code |

### Test Runner: Serial vs Concurrent

| Mode | Use When |
|------|----------|
| **Serial** (default) | Tests have shared state or order dependencies |
| **Concurrent** | Tests are independent, want faster execution |

## Workflow

### 1. Initialize a Project
```bash
bun init my-app
cd my-app
```
Choose template: Blank, React, or Library. Creates `package.json`, `tsconfig.json`, `bunfig.toml`.

### 2. Install Dependencies
```bash
bun install                    # Install all from package.json
bun add react                  # Add a package
bun add -d @types/react       # Add dev dependency
```
Generates `bun.lock` lockfile. Bun installs 25x faster than npm.

### 3. Run Code
```bash
bun run index.ts              # Execute a file
bun run dev                   # Run a script from package.json
bun --watch run index.ts      # Watch mode
```
Bun transpiles TypeScript/JSX on the fly. No build step needed for development.

### 4. Write Tests
```bash
# Create math.test.ts
import { test, expect } from "bun:test";
test("2 + 2 = 4", () => {
  expect(2 + 2).toBe(4);
});
```
Run with `bun test`. Supports snapshots, mocks, watch mode.

### 5. Build for Production
```bash
bun build ./index.tsx --outdir ./dist
```
Bundles TypeScript/JSX, minifies, generates sourcemaps. Outputs to `dist/`.

### 6. Deploy
```bash
bun build ./server.ts --compile --outfile ./server
./server  # Standalone executable
```
Creates a single executable containing Bun runtime + your code.

## Common Gotchas

- **Flag placement**: Put Bun flags immediately after `bun`, not at the end. `bun --watch run dev` ✓, `bun run dev --watch` ✗
- **Lifecycle scripts**: Bun doesn't run `postinstall` scripts by default for security. Add packages to `trustedDependencies` in `package.json` to allow them.
- **Node.js compatibility**: Bun aims for Node.js compatibility but isn't 100% complete. Check [nodejs-compat](/runtime/nodejs-compat) for status.
- **Auto-install disabled in CI**: Set `install.auto = "disable"` in `bunfig.toml` for CI/CD to prevent auto-installing missing packages.
- **Lockfile format**: Bun v1.2+ uses text `bun.lock` by default. Older projects may have binary `bun.lockb`. Migrate with `bun install --save-text-lockfile`.
- **TypeScript errors on Bun global**: Install `@types/bun` and configure `tsconfig.json` with `"lib": ["ESNext"]` and `"module": "Preserve"`.
- **Phantom dependencies in hoisted mode**: With `linker = "hoisted"`, you can import packages not in `package.json`. Use `linker = "isolated"` to prevent this.
- **Test discovery**: Tests must match patterns like `*.test.ts`, `*.spec.ts`, `*_test.ts`, `*_spec.ts`. Files in `node_modules` are skipped.
- **Bundler doesn't typecheck**: `bun build` transpiles but doesn't check types. Run `tsc --noEmit` separately for type checking.
- **Environment variables in bundles**: By default, `process.env.FOO` is inlined at build time. Use `env: "disable"` to keep them dynamic.

## Verification Checklist

Before submitting work with Bun:

- [ ] Dependencies installed: `bun install` runs without errors
- [ ] Code runs: `bun run <file>` executes without errors
- [ ] Tests pass: `bun test` shows all tests passing
- [ ] No TypeScript errors: `tsc --noEmit` (if using TypeScript)
- [ ] Lockfile committed: `bun.lock` is in version control
- [ ] Build succeeds: `bun build` completes without errors
- [ ] No console warnings: Check for deprecation or missing dependency warnings
- [ ] Correct Node.js APIs used: Verify APIs are in [nodejs-compat](/runtime/nodejs-compat) if targeting Node.js
- [ ] Environment variables set: Confirm `.env` file exists or env vars are exported
- [ ] Port available: If running a server, check the port isn't in use

## Resources

- **Complete navigation**: [bun.com/docs/llms.txt](https://bun.com/docs/llms.txt) — comprehensive page-by-page reference
- **Runtime API**: [bun.com/docs/runtime](https://bun.com/docs/runtime) — file I/O, HTTP, networking, workers
- **Package Manager**: [bun.com/docs/pm/cli/install](https://bun.com/docs/pm/cli/install) — install, add, workspaces, lockfile
- **Bundler**: [bun.com/docs/bundler](https://bun.com/docs/bundler) — build, code splitting, plugins, executables
- **Test Runner**: [bun.com/docs/test](https://bun.com/docs/test) — writing tests, mocks, snapshots, watch mode

---

> For additional documentation and navigation, see: https://bun.com/docs/llms.txt