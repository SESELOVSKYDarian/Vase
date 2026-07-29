# Vase Rest production runbook

## Cloud deployment

Deploy `apps/vase-rest/Dockerfile` as `vase-rest-app` on port 3009 and attach
only the dedicated `postgres-rest` database. The container fails closed when a
required secret is missing, validates that `DATABASE_URL` is PostgreSQL, runs
`prisma migrate deploy`, and then starts Next.js.

Generate the Ed25519 Edge signing key outside the repository. Store its
base64-encoded private PEM only in `REST_EDGE_SIGNING_PRIVATE_KEY_B64`. Supply
the matching public PEM to the signed Edge build through
`CloudPublicKeyPath` and its expected SHA-256 through
`CloudPublicKeySha256`.

Readiness:

- `/api/health/live` proves the process is running.
- `/api/health/ready` must report the dedicated database as healthy.
- Vase Admin must show the Rest entitlement and operational projection.

## Tenant and branch activation

1. Publish the Rest plan and limits in Vase Admin.
2. Activate the product for the global Vase tenant.
3. The owner enters through Vase SSO and creates the restaurant tenant.
4. Create branches and optional branch groups.
5. Set each configuration family to tenant, branch group, or branch scope.
6. Create local employees, branch roles, and individual PINs.
7. Generate a one-time Edge enrollment code for the intended branch.

Changing a URL, branch identifier, or client payload cannot select another
tenant; every server operation resolves tenant and branch from the authenticated
owner/staff/device context.

## Edge installation

Build only from a pinned Node executable, pinned cloud public key, and an
available LocalMachine code-signing certificate:

```powershell
npm run build:windows --workspace @vase/rest-edge -- `
  -NodeExePath C:\release\node.exe `
  -NodeSha256 EXPECTED_NODE_SHA256 `
  -CloudPublicKeyPath C:\release\cloud-signing.pub `
  -CloudPublicKeySha256 EXPECTED_PUBLIC_KEY_SHA256 `
  -ProductVersion 3.0.0 `
  -SigningThumbprint WINDOWS_CODE_SIGNING_THUMBPRINT
```

Install the signed MSI as administrator. It creates a protected per-install TLS
identity, trusts it on the Edge host, preserves the data directory, installs the
Windows service, and limits TCP 3443 to the private subnet. Import the displayed
branch certificate on each authorized workstation before pairing it; then verify
the installation ID and fingerprint shown by Vase Rest.

## Backup and restore

Stop `VaseRestEdge` before copying `vase-rest-edge.sqlite`, `-wal`, `-shm`,
the TLS key/certificate, cloud public key, and installation metadata. Encrypt
the backup and restrict it to the tenant operator. Restore all files together,
start the service, and verify identity, last sync watermark, pending outbox,
staff projection, and printer queue before allowing commands.

PostgreSQL backups must include the Rest database and be restored into an
isolated database first. Run migrations, tenant-count checks, financial totals,
and Edge reconciliation before promoting the restore.

## Incident operations

- WAN outage: keep workstations on the paired LAN Edge. Never switch operational
  routes to direct cloud writes.
- Edge outage: restore the protected Edge backup or enroll a replacement after
  revoking the failed installation. Do not reuse identity material concurrently.
- Print failure: inspect the durable job, correct network/spooler configuration,
  and use explicit retry. Never mark a job printed without adapter confirmation.
- ARCA ambiguity: query the official last authorized voucher and reconcile before
  retrying the same idempotent command.
- Mercado Pago ambiguity: reconcile the provider payment ID and webhook receipt;
  never create a second payment attempt to hide an unknown result.
- Delivery outage: leave the connection degraded and the operation failed. Do
  not synthesize provider acceptance.
- Compromised PIN/device: revoke it, rotate PINs/secrets, and review audit events.

## Updates and rollback

The Edge checks the configured HTTPS manifest every six hours. It accepts only
Ed25519 manifests for its channel, a newer semantic version, an MSI URL, the
declared SHA-256, and a valid Authenticode signature. The MSI starts the new
service and must pass `/health/live` within 60 seconds. A failed health custom
action makes Windows Installer roll back the upgrade; the data directory is
never downgraded destructively.

## External release gates

General availability remains blocked until the real organization supplies and
records: ARCA homologation/production certificates, Mercado Pago production
credentials and terminal validation where applicable, each delivery provider's
approved contract/credentials, an Authenticode certificate, an ESC/POS hardware
test, a clean Windows install/upgrade/rollback test, a PostgreSQL restore drill,
and a live-branch pilot with zero lost or duplicated operations.
