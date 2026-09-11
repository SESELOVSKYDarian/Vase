export function chartNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function normalizedMonthlySeries(rows: Array<{ label: unknown; presupuestado: unknown; facturado: unknown; cobrado: unknown }>) {
  return rows.map((row) => ({ label: String(row.label ?? ""), presupuestado: chartNumber(row.presupuestado), facturado: chartNumber(row.facturado), cobrado: chartNumber(row.cobrado) }));
}

