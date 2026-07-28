const requiredVariables = [
  "DATABASE_URL",
  "AUTH_SECRET",
  "VASE_APP_INTERNAL_URL",
  "SERVICE_TO_SERVICE_TOKEN",
  "REST_CREDENTIAL_ENCRYPTION_KEY",
  "REST_EDGE_SIGNING_KEY",
  "REDIS_URL",
  "NEXT_PUBLIC_APP_URL",
];

const missing = requiredVariables.filter((name) => !process.env[name]?.trim());

if (missing.length > 0) {
  console.error(`vase-rest is missing required runtime variables: ${missing.join(", ")}`);
  process.exit(1);
}

if (!process.env.DATABASE_URL.startsWith("postgresql://")) {
  console.error("vase-rest DATABASE_URL must start with postgresql:// and point to postgres-rest.");
  process.exit(1);
}

if (process.env.NEXT_PUBLIC_APP_URL !== "https://rest.vase.ar") {
  console.error("vase-rest NEXT_PUBLIC_APP_URL must be https://rest.vase.ar in production.");
  process.exit(1);
}
