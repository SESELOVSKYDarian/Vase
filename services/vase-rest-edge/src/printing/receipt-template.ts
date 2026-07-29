const ESC = 0x1b;
const GS = 0x1d;

function printable(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7e]/g, "?");
}

export function renderEscPosReceipt(input: {
  title: string;
  lines: Array<{ quantity: string; name: string; note?: string }>;
  footer?: string;
}) {
  const chunks: Buffer[] = [
    Buffer.from([ESC, 0x40]),
    Buffer.from([ESC, 0x61, 0x01]),
    Buffer.from(`${printable(input.title)}\n`, "ascii"),
    Buffer.from([ESC, 0x61, 0x00]),
    Buffer.from("--------------------------------\n", "ascii"),
  ];
  for (const line of input.lines) {
    chunks.push(Buffer.from(
      `${line.quantity ? `${printable(line.quantity)} x ` : ""}${printable(line.name)}\n`,
      "ascii",
    ));
    if (line.note) chunks.push(Buffer.from(`  > ${printable(line.note)}\n`, "ascii"));
  }
  if (input.footer) {
    chunks.push(Buffer.from("--------------------------------\n", "ascii"));
    chunks.push(Buffer.from(`${printable(input.footer)}\n`, "ascii"));
  }
  chunks.push(Buffer.from("\n\n", "ascii"), Buffer.from([GS, 0x56, 0x00]));
  return Buffer.concat(chunks);
}
