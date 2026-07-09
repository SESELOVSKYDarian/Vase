const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("vase-labs requires DATABASE_URL to point to its PostgreSQL database.");
  process.exit(1);
}

if (!/^postgres(ql)?:\/\//.test(databaseUrl)) {
  console.error(
    "vase-labs DATABASE_URL must start with postgresql:// or postgres://. " +
      "Do not reuse the app-vase mysql:// DATABASE_URL for Labs.",
  );
  process.exit(1);
}
