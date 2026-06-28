# Vase Editor Monorepo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import the production editor into `Vase` as an independently deployable EasyPanel service.

**Architecture:** Preserve the editor's Express API and Vite frontend under `apps/vase-editor`, using a multi-stage Docker image built from the monorepo root. Keep the V3 Business app and editor as separate services connected through the existing SSO bridge.

**Tech Stack:** Node.js 20, Express, React 18, Vite 5, PostgreSQL, Docker, EasyPanel

---

### Task 1: Define the deployment contract

**Files:**
- Create: `tests/vase-editor-deployment.test.ts`

- [x] Add assertions for required source folders, safe environment examples, port `3000`, `/health`, and monorepo-root Docker paths.
- [x] Run `npx vitest run tests/vase-editor-deployment.test.ts` and verify it fails because `apps/vase-editor` does not exist.

### Task 2: Import the editor source

**Files:**
- Create: `apps/vase-editor/web/**`
- Create: `apps/vase-editor/server/**`
- Create: `apps/vase-editor/db/**`
- Create: `apps/vase-editor/.env.example`
- Create: `apps/vase-editor/README.md`

- [x] Copy only runtime source, static assets, manifests, SQL files, and examples from `Proyecto-Teflon`.
- [x] Exclude `.env`, `node_modules`, `dist`, `.npm-cache`, uploads, and scratch files.
- [x] Replace real example secrets with explicit placeholders.

### Task 3: Adapt container deployment

**Files:**
- Create: `apps/vase-editor/Dockerfile`

- [x] Prefix all Docker `COPY` sources with `apps/vase-editor`.
- [x] Preserve Vite build arguments, Node production mode, port `3000`, and the Express startup command.
- [x] Run the deployment contract test and verify it passes.

### Task 4: Document EasyPanel migration

**Files:**
- Modify: `docs/v3/easypanel.md`
- Modify: `.env.easypanel.example`

- [x] Add the editor service, Dockerfile, domain, port, existing database dependency, build arguments, health endpoint, and safe cutover sequence.
- [x] Document that V3 Business and Editor must not share a domain or database schema.

### Task 5: Verify the imported application

**Files:**
- Verify: `apps/vase-editor/**`

- [x] Install server and web dependencies with `npm ci`.
- [x] Run Node tests for the server and frontend utilities.
- [x] Run `npm run build --prefix apps/vase-editor/web`.
- [x] Run `docker build -f apps/vase-editor/Dockerfile -t vase-editor:verify .`.
- [x] Run the targeted deployment test, root test suite, `git diff --check`, and a secret-pattern scan.
