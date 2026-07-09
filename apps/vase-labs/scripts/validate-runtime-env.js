const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("vase-labs requires DATABASE_URL to point to its MySQL database.");
  process.exit(1);
}

if (!/^mysql:\/\//.test(databaseUrl)) {
  console.error(
    "vase-labs DATABASE_URL must start with mysql://. " +
      "Do not use a postgresql:// DATABASE_URL for Labs.",
  );
  process.exit(1);
}
