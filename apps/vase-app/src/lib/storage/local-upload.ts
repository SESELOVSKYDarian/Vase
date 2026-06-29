import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export async function saveLocalUpload(input: {
  relativePath: string;
  bytes: Uint8Array;
}) {
  const baseDir = join(process.cwd(), "uploads");
  const absolutePath = join(baseDir, input.relativePath);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, Buffer.from(input.bytes));
  return {
    absolutePath,
    relativePath: input.relativePath.replaceAll("\\", "/"),
  };
}
