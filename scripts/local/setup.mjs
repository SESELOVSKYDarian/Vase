#!/usr/bin/env node
// Prepara Vase para probar en tu computadora, sin tocar producción:
//   1. levanta las bases (MySQL, Postgres, Redis) y un buzón de mails falso en Docker;
//   2. escribe los .env.local de cada app apuntando a esas bases (solo si no existen; --force los rehace);
//   3. crea las tablas con las migraciones y carga una cuenta de prueba.
// Uso: npm run local:setup [-- --force]
import { execSync, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const compose = path.join(root, "infra/local/docker-compose.yml");
const secretsFile = path.join(root, "infra/local/.secrets.json");
const force = process.argv.includes("--force");

const step = (text) => console.log(`\n▸ ${text}`);
const fail = (text) => {
  console.error(`\n✗ ${text}`);
  process.exit(1);
};

// 1. Docker
step("Revisando Docker");
const docker = spawnSync("docker", ["info"], { stdio: "ignore", shell: true });
if (docker.status !== 0) {
  fail("Docker no está instalado o no está abierto. Instalá Docker Desktop (https://www.docker.com/products/docker-desktop/), abrilo y volvé a correr: npm run local:setup");
}

step("Levantando bases de datos (MySQL, Postgres, Redis y Mailpit)");
execSync(`docker compose -f "${compose}" up -d --wait`, { stdio: "inherit", cwd: root });

// 2. Claves de desarrollo (aleatorias, solo para esta compu; no son las de producción)
const secrets = existsSync(secretsFile) ? JSON.parse(readFileSync(secretsFile, "utf8")) : {};
const secret = (name, bytes = 32) => (secrets[name] ??= randomBytes(bytes).toString("base64url"));
const keys = {
  authSecret: secret("authSecret"),
  serviceToken: secret("serviceToken"),
  businessSso: secret("businessSso"),
  restContext: secret("restContext"),
  managementSso: secret("managementSso"),
  serverActions: secret("serverActions"),
  appKey: secret("appKey"),
  tokenEncryption: secret("tokenEncryption"),
  businessJwt: secret("businessJwt"),
  uploadsJwt: secret("uploadsJwt"),
  restStaff: secret("restStaff"),
  restEnrollment: secret("restEnrollment"),
  restCredential: secret("restCredential"),
  testPassword: secret("testPassword", 12),
  adminPassword: secret("adminPassword", 12),
};
mkdirSync(path.dirname(secretsFile), { recursive: true });
writeFileSync(secretsFile, `${JSON.stringify(secrets, null, 2)}\n`);

const MYSQL = "mysql://vase:vase-local@127.0.0.1:3307";
const PG = "postgresql://vase:vase-local@127.0.0.1:5433";
const URL = {
  portal: "http://localhost:3000",
  app: "http://localhost:3002",
  labs: "http://localhost:3007",
  management: "http://localhost:3006",
  rest: "http://localhost:3009",
  businessApi: "http://localhost:4000",
  businessWeb: "http://localhost:5173",
};
const SMTP = { SMTP_HOST: "127.0.0.1", SMTP_PORT: "1025", SMTP_SECURE: "false", SMTP_USER: "local", SMTP_PASS: "local" };

const envFiles = {
  "apps/vase-app/.env.local": {
    NODE_ENV: "development",
    PORT: "3002",
    DATABASE_URL: `${MYSQL}/vase`,
    NEXT_PUBLIC_PUBLIC_SITE_ORIGIN: URL.portal,
    NEXT_PUBLIC_APP_URL: URL.app,
    VASE_ADMIN_PUBLIC_URL: "http://admin.localhost:3002",
    NEXT_PUBLIC_LABS_URL: URL.labs,
    AUTH_COOKIE_DOMAIN: "",
    TRUSTED_ORIGINS: `${URL.app},http://admin.localhost:3002,http://127.0.0.1:3002,${URL.labs},${URL.businessWeb},${URL.portal}`,
    VASE_PRIMARY_HOST: "localhost:3002",
    VASE_ADMIN_HOST: "admin.localhost:3002",
    VASE_LABS_HOST: "localhost:3007",
    AUTH_SECRET: keys.authSecret,
    AUTH_TRUST_HOST: "true",
    NEXT_SERVER_ACTIONS_ENCRYPTION_KEY: Buffer.from(keys.serverActions, "base64url").subarray(0, 32).toString("base64"),
    VASE_BUSINESS_SSO_SECRET: keys.businessSso,
    VASE_BUSINESS_SSO_ISSUER: "vase-app",
    VASE_BUSINESS_SSO_AUDIENCE: "vase-business",
    BUSINESS_EDITOR_URL: `${URL.businessWeb}/admin/evolution`,
    SERVICE_TO_SERVICE_TOKEN: keys.serviceToken,
    LABS_INTERNAL_URL: URL.labs,
    REST_INTERNAL_URL: URL.rest,
    REST_CONTEXT_SIGNING_SECRET: keys.restContext,
    MANAGEMENT_INTERNAL_URL: URL.management,
    MANAGEMENT_PUBLIC_URL: URL.management,
    MANAGEMENT_SSO_SECRET: keys.managementSso,
    MASTER_ADMIN_EMAIL: "admin@vase.local",
    MASTER_ADMIN_PASSWORD: keys.adminPassword,
    TEST_ACCOUNT_EMAIL: "prueba@vase.local",
    TEST_ACCOUNT_PASSWORD: keys.testPassword,
    TEST_TENANT_SLUG: "negocio-prueba",
    TEST_TENANT_NAME: "Negocio de prueba",
    ...SMTP,
    AUTH_FROM_EMAIL: "no-reply@vase.local",
    CONTACT_TO_EMAIL: "contacto@vase.local",
    CONTACT_FROM_EMAIL: "no-reply@vase.local",
    UPLOADS_JWT_SECRET: keys.uploadsJwt,
    DISABLE_SCHEDULER: "true",
  },
  "apps/vase-labs/.env.local": {
    PORT: "3007",
    NEXT_PUBLIC_APP_URL: URL.labs,
    APP_INTERNAL_URL: URL.app,
    DATABASE_URL: `${MYSQL}/vase_labs`,
    AUTH_SECRET: keys.authSecret,
    AUTH_COOKIE_DOMAIN: "",
    SERVICE_TO_SERVICE_TOKEN: keys.serviceToken,
    SESSION_ISSUER: "localhost:3002",
    SESSION_AUDIENCE: "vase-platform",
    REDIS_URL: "redis://127.0.0.1:6380",
    TRUSTED_ORIGINS: `${URL.portal},${URL.app},${URL.labs},${URL.businessWeb}`,
    TOKEN_ENCRYPTION_SECRET: keys.tokenEncryption,
    APP_KEY: keys.appKey,
    META_APP_ID: "local",
    META_APP_SECRET: "local",
    META_VERIFY_TOKEN: "local",
    META_WEBHOOK_SECRET: "local",
    META_OAUTH_REDIRECT_URI: `${URL.labs}/api/v1/meta/oauth/callback`,
  },
  "apps/vase-portal/.env.local": {
    PORT: "3000",
    NEXT_PUBLIC_PUBLIC_SITE_ORIGIN: URL.portal,
    NEXT_PUBLIC_APP_URL: URL.app,
    NEXT_PUBLIC_NEWS_ORIGIN: "http://news.localhost:3000",
    APP_INTERNAL_URL: URL.app,
    APP_KEY: keys.appKey,
    SERVICE_TO_SERVICE_TOKEN: keys.serviceToken,
  },
  "apps/vase-management/.env.local": {
    DATABASE_URL: `${PG}/vase_management`,
    AUTH_SECRET: keys.authSecret,
    SERVICE_TO_SERVICE_TOKEN: keys.serviceToken,
    APP_INTERNAL_URL: URL.app,
    VASE_APP_PUBLIC_URL: URL.app,
    NEXT_PUBLIC_VASE_APP_URL: URL.app,
    NEXT_PUBLIC_APP_URL: URL.management,
    NEXT_PUBLIC_APP_NAME: "Vase Management (local)",
    NEXT_SERVER_ACTIONS_ENCRYPTION_KEY: Buffer.from(keys.serverActions, "base64url").subarray(0, 32).toString("base64"),
    CRON_SECRET: keys.serviceToken,
    BUSINESS_INTERNAL_URL: URL.businessApi,
    LABS_INTERNAL_URL: URL.labs,
    ...SMTP,
    SMTP_FROM: "no-reply@vase.local",
  },
  "apps/vase-rest/.env.local": {
    PORT: "3009",
    NEXT_PUBLIC_APP_URL: URL.rest,
    DATABASE_URL: `${PG}/vase_rest`,
    AUTH_SECRET: keys.authSecret,
    AUTH_TRUST_HOST: "true",
    VASE_APP_INTERNAL_URL: URL.app,
    VASE_ADMIN_INTERNAL_URL: URL.app,
    SERVICE_TO_SERVICE_TOKEN: keys.serviceToken,
    REST_CONTEXT_SIGNING_SECRET: keys.restContext,
    REST_STAFF_SESSION_SECRET: keys.restStaff,
    REST_ENROLLMENT_SIGNING_SECRET: keys.restEnrollment,
    REST_CREDENTIAL_ENCRYPTION_KEY: Buffer.from(keys.restCredential, "base64url").subarray(0, 32).toString("base64"),
    REST_PUBLIC_URL: URL.rest,
    REDIS_URL: "redis://127.0.0.1:6380",
  },
  "apps/vase-editor/server/.env": {
    PORT: "4000",
    DATABASE_URL: `${PG}/vase_business`,
    JWT_SECRET: keys.businessJwt,
    PUBLIC_API_URL: URL.businessApi,
    INTEGRATIONS_PUBLIC_BASE_URL: URL.businessApi,
    PUBLIC_ADMIN_URL: `${URL.businessWeb}/admin/evolution`,
    VASE_BUSINESS_SSO_SECRET: keys.businessSso,
    VASE_BUSINESS_SSO_ISSUER: "vase-app",
    VASE_BUSINESS_SSO_AUDIENCE: "vase-business",
    VASE_APP_INTERNAL_URL: URL.app,
    LABS_INTERNAL_URL: URL.labs,
    SERVICE_TO_SERVICE_TOKEN: keys.serviceToken,
    PLATFORM_BASE_DOMAIN: "localhost",
    DISABLE_AUTH: "false",
    EMAIL_COMPANY_NAME: "Vase (local)",
    ...SMTP,
    SMTP_FROM: "Vase <no-reply@vase.local>",
  },
  "apps/vase-editor/web/.env.local": {
    VITE_API_URL: URL.businessApi,
    VITE_EDITOR_HOST: "localhost:5173",
    VITE_ALLOW_LOCAL_ADMIN: "true",
    VITE_EXTERNAL_AUTH: "false",
    VITE_VASE_APP_URL: URL.app,
    VITE_VASE_APP_LAUNCH_URL: `${URL.app}/app/business/launch`,
    VITE_VASE_APP_LOGIN_URL: `${URL.app}/signin`,
    VITE_VASE_APP_SIGNUP_URL: `${URL.app}/register`,
  },
};

step("Escribiendo archivos de configuración local");
for (const [file, values] of Object.entries(envFiles)) {
  const target = path.join(root, file);
  if (existsSync(target) && !force) {
    console.log(`  · ${file} ya existe (no lo toco; usá --force para rehacerlo)`);
    continue;
  }
  const body = ["# Generado por npm run local:setup. Solo para probar en esta compu: apunta a las bases de Docker.", ...Object.entries(values).map(([k, v]) => `${k}=${/[\s#"]/.test(v) ? JSON.stringify(v) : v}`), ""].join("\n");
  writeFileSync(target, body);
  console.log(`  ✓ ${file}`);
}

// 3. Tablas y datos de prueba (con las mismas migraciones que producción)
const run = (cwd, command, env) => {
  const result = spawnSync(command, { cwd: path.join(root, cwd), stdio: "inherit", shell: true, env: { ...process.env, ...env } });
  if (result.status !== 0) fail(`Falló: ${command} (en ${cwd})`);
};
const appEnv = envFiles["apps/vase-app/.env.local"];

step("Creando tablas de app (migraciones)");
run("apps/vase-app", "npx prisma migrate deploy", { DATABASE_URL: appEnv.DATABASE_URL });
step("Creando tablas de Labs");
run("apps/vase-labs", "npx prisma migrate deploy", { DATABASE_URL: envFiles["apps/vase-labs/.env.local"].DATABASE_URL });
step("Creando tablas de Management");
run("apps/vase-management", "npx prisma migrate deploy", { DATABASE_URL: envFiles["apps/vase-management/.env.local"].DATABASE_URL });
step("Creando tablas de Rest");
run("apps/vase-rest", "npx prisma migrate deploy", { DATABASE_URL: envFiles["apps/vase-rest/.env.local"].DATABASE_URL });

step("Cargando datos base y cuentas de prueba");
run("apps/vase-app", "npm run prisma:seed", appEnv);
run("apps/vase-app", "npm run bootstrap:master-admin", appEnv);
run("apps/vase-app", "npm run bootstrap:test-account", appEnv);

console.log(`
✓ Listo. Para arrancar: npm run local:dev

  Vase (app)        ${URL.app}
  Sitio (vase.ar)   ${URL.portal}
  Business (panel)  ${URL.businessWeb}
  Labs              ${URL.labs}
  Mails de prueba   http://localhost:8025   (ningún mail sale de tu compu)

  Cuentas de prueba: ver TEST_ACCOUNT_* y MASTER_ADMIN_* en apps/vase-app/.env.local
`);
