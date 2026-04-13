# API setup

This folder contains the Node/Express API for the multi-tenant storefront.

## Database (pgAdmin)
1. Create a database (example: teflon).
2. Run `db/schema.sql` in the pgAdmin Query Tool.
3. Optional: run `db/seed.sql` to create a pilot tenant.

## Env
- Copy `server/.env.example` to `server/.env` and edit values.

## Run
- `cd server`
- `npm install`
- `npm run dev`

## Local tenant resolution
- Use header `X-Tenant-Id` for local requests if you are not using subdomains.
