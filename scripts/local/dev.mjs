#!/usr/bin/env node
// Arranca las apps de Vase en tu compu, con la salida de cada una marcada con su nombre.
// Uso: npm run local:dev                → app, sitio, Business y Labs
//      npm run local:dev -- app labs    → solo esas
//      npm run local:dev -- todo        → también Management y Rest
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const APPS = {
  app: { cwd: "apps/vase-app", cmd: "npm run dev", color: 32 },
  sitio: { cwd: "apps/vase-portal", cmd: "npm run dev", color: 36 },
  "business-api": { cwd: "apps/vase-editor/server", cmd: "npm run dev", color: 33 },
  "business-web": { cwd: "apps/vase-editor/web", cmd: "npm run dev", color: 33 },
  labs: { cwd: "apps/vase-labs", cmd: "npm run dev", color: 35 },
  management: { cwd: "apps/vase-management", cmd: "npm run dev", color: 34 },
  rest: { cwd: "apps/vase-rest", cmd: "npm run dev", color: 31 },
};
const DEFAULT = ["app", "sitio", "business-api", "business-web", "labs"];

const args = process.argv.slice(2);
let names = args.length ? args : DEFAULT;
if (names.includes("todo")) names = Object.keys(APPS);
names = names.flatMap((name) => (name === "business" ? ["business-api", "business-web"] : [name]));
const unknown = names.filter((name) => !APPS[name]);
if (unknown.length) {
  console.error(`No conozco: ${unknown.join(", ")}. Opciones: ${Object.keys(APPS).join(", ")}, business, todo`);
  process.exit(1);
}

const children = names.map((name) => {
  const { cwd, cmd, color } = APPS[name];
  const tag = `\x1b[${color}m[${name}]\x1b[0m `;
  const child = spawn(cmd, { cwd: path.join(root, cwd), shell: true, env: { ...process.env, FORCE_COLOR: "1" } });
  const pipe = (stream, out) => {
    let buffer = "";
    stream.on("data", (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";
      for (const line of lines) out.write(`${tag}${line}\n`);
    });
  };
  pipe(child.stdout, process.stdout);
  pipe(child.stderr, process.stderr);
  child.on("exit", (code) => console.log(`${tag}terminó (código ${code})`));
  return child;
});

const stop = () => {
  for (const child of children) child.kill();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
console.log(`Arrancando: ${names.join(", ")}  (Ctrl+C para frenar todo)`);
