# Vase Portal Port 3000 Design

## Objective

Run Vase Portal consistently on internal port `3000` in local development,
Docker, EasyPanel, automated checks, and deployment documentation.

## Scope

The change updates only Vase Portal:

- Portal development and production start scripts use port `3000`.
- The Portal Docker image sets `PORT=3000` and exposes port `3000`.
- EasyPanel documentation identifies `3000` as the Portal service port.
- Portal environment examples, README, runbook, and migration tests use
  `3000`.

Vase App remains on port `3002`. `APP_INTERNAL_URL` continues to target Vase
App and is not changed by this work.

## Deployment Contract

```text
portal-vase
  Build path: /
  Dockerfile: apps/vase-portal/Dockerfile
  Port: 3000
  Domain: vase.ar
```

The public site remains `https://vase.ar`; the internal container port is not
visible to users.

## Verification

- Repository migration tests assert Portal port `3000`.
- Portal tests and workspace typechecks pass.
- `next build` succeeds for Portal.
- The Portal Docker image builds and declares port `3000`.
