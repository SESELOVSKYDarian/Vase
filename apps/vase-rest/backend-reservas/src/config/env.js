import { config } from "dotenv";
// Carga .env y .env.local (Next.js convention)
config();
config({ path: ".env.local", override: false });

// Variables obligatorias del backend; no se envian al frontend.
const requiredEnv = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
];

for (const variable of requiredEnv) {
  if (!process.env[variable]) {
    throw new Error(`Falta la variable de entorno ${variable}`);
  }
}

export const env = {
  port: process.env.PORT || 3001,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
};
