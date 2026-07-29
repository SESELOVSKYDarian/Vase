import { centsToMoney, moneyToCents } from "../cash/money";
import { csvCell } from "../payments/reconciliation-service";

function localParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
    second: value("second"),
  };
}

function zonedMidnight(date: string, timeZone: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("REST_ANALYTICS_DATE_INVALID");
  }
  const [year, month, day] = date.split("-").map(Number);
  const desired = Date.UTC(year, month - 1, day);
  let guess = new Date(desired);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const actual = localParts(guess, timeZone);
    const represented = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      actual.second,
    );
    guess = new Date(guess.getTime() + desired - represented);
  }
  return guess;
}

export function localDayRange(date: string, timeZone: string) {
  const from = zonedMidnight(date, timeZone);
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  const nextDate = [
    next.getUTCFullYear(),
    String(next.getUTCMonth() + 1).padStart(2, "0"),
    String(next.getUTCDate()).padStart(2, "0"),
  ].join("-");
  return {
    from,
    to: new Date(zonedMidnight(nextDate, timeZone).getTime() - 1),
  };
}

function signedCents(value: string) {
  const negative = value.startsWith("-");
  const result = moneyToCents(negative ? value.slice(1) : value);
  return negative ? -result : result;
}

type AnalyticsInput = {
  now?: Date;
  branches: Array<{ id: string; name: string }>;
  orders: Array<{
    id: string;
    branchId: string;
    status: string;
    total: string;
  }>;
  payments: Array<{ branchId: string; status: string; amount: string }>;
  refunds: Array<{ branchId: string; status: string; amount: string }>;
  fiscalDocuments: Array<{ branchId: string; status: string; total: string }>;
  accountMovements: Array<{ branchId: string | null; amount: string }>;
  edges: Array<{ branchId: string; lastSeenAt: Date | null }>;
};

export function buildRestAnalytics(input: AnalyticsInput) {
  const now = input.now ?? new Date();
  const branches = input.branches.map((branch) => {
    const collected = input.payments.filter((payment) =>
      payment.branchId === branch.id &&
      ["APPLIED", "PARTIALLY_REFUNDED"].includes(payment.status))
      .reduce((sum, payment) => sum + moneyToCents(payment.amount), BigInt(0));
    const refunded = input.refunds.filter((refund) =>
      refund.branchId === branch.id && refund.status === "APPLIED")
      .reduce((sum, refund) => sum + moneyToCents(refund.amount), BigInt(0));
    const fiscalAuthorized = input.fiscalDocuments.filter((document) =>
      document.branchId === branch.id && document.status === "AUTHORIZED")
      .reduce((sum, document) => sum + moneyToCents(document.total), BigInt(0));
    const accountBalance = input.accountMovements.filter((movement) =>
      movement.branchId === branch.id)
      .reduce((sum, movement) => sum + signedCents(movement.amount), BigInt(0));
    const edge = input.edges.find((item) => item.branchId === branch.id);
    const edgeState = !edge?.lastSeenAt ? "OFFLINE"
      : now.getTime() - edge.lastSeenAt.getTime() > 5 * 60_000
        ? "STALE" : "ONLINE";
    return {
      ...branch,
      orders: input.orders.filter((order) => order.branchId === branch.id).length,
      collected: centsToMoney(collected),
      refunded: centsToMoney(refunded),
      netCollected: centsToMoney(collected - refunded),
      fiscalAuthorized: centsToMoney(fiscalAuthorized),
      customerAccountBalance: centsToMoney(accountBalance),
      edgeState,
      edgeLastSeenAt: edge?.lastSeenAt?.toISOString() ?? null,
    };
  });
  const sum = (field: keyof Pick<
    (typeof branches)[number],
    "collected" | "refunded" | "netCollected" | "fiscalAuthorized" |
      "customerAccountBalance"
  >) => centsToMoney(branches.reduce(
    (total, branch) => total + signedCents(branch[field]),
    BigInt(0),
  ));
  const unassignedAccountBalance = input.accountMovements
    .filter((movement) => movement.branchId === null)
    .reduce((total, movement) => total + signedCents(movement.amount), BigInt(0));
  return {
    generatedAt: now.toISOString(),
    totals: {
      orders: input.orders.length,
      collected: sum("collected"),
      refunded: sum("refunded"),
      netCollected: sum("netCollected"),
      fiscalAuthorized: sum("fiscalAuthorized"),
      customerAccountBalance: centsToMoney(
        signedCents(sum("customerAccountBalance")) + unassignedAccountBalance,
      ),
      unresolvedEdges: branches.filter((branch) =>
        branch.edgeState !== "ONLINE").length,
    },
    branches,
  };
}

export type RestAnalytics = ReturnType<typeof buildRestAnalytics>;

export function analyticsCsv(report: RestAnalytics) {
  return [
    [
      "branch_id",
      "branch_name",
      "orders",
      "collected",
      "refunded",
      "net_collected",
      "fiscal_authorized",
      "customer_account_balance",
      "edge_state",
      "edge_last_seen_at",
    ],
    ...report.branches.map((branch) => [
      branch.id,
      branch.name,
      branch.orders,
      branch.collected,
      branch.refunded,
      branch.netCollected,
      branch.fiscalAuthorized,
      branch.customerAccountBalance,
      branch.edgeState,
      branch.edgeLastSeenAt,
    ]),
  ].map((row) => row.map(csvCell).join(",")).join("\r\n");
}
