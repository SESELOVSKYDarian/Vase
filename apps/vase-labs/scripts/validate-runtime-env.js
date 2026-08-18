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

const requiredKnowledgeStorage = [
  "KNOWLEDGE_S3_ENDPOINT",
  "KNOWLEDGE_S3_BUCKET",
  "KNOWLEDGE_S3_ACCESS_KEY_ID",
  "KNOWLEDGE_S3_SECRET_ACCESS_KEY",
];
const missingKnowledgeStorage = requiredKnowledgeStorage.filter((key) => !process.env[key]?.trim());
if (missingKnowledgeStorage.length) {
  console.error(`vase-labs requires S3 knowledge storage: ${missingKnowledgeStorage.join(", ")}.`);
  process.exit(1);
}
