type OrderAnalyticsInput = {
  channel: string | null;
  status: string;
  currency: string;
  totalAmount: unknown;
  businessUpdatedAt: Date;
};

const messagingChannels = ["WHATSAPP", "INSTAGRAM", "MESSENGER"] as const;

function emptyChannel() {
  return { orders: 0, confirmed: 0, pending: 0, total: 0, averageTicket: 0, conversionRate: 0 };
}

function isConfirmed(status: string) {
  return ["CONFIRMED", "PAID", "FULFILLED", "COMPLETED"].includes(status);
}

export function buildLabsOrderAnalytics(orders: OrderAnalyticsInput[]) {
  const channels = Object.fromEntries(messagingChannels.map((channel) => [channel, emptyChannel()])) as Record<typeof messagingChannels[number], ReturnType<typeof emptyChannel>>;
  const currencyMap = new Map<string, { currency: string; total: number; orders: number }>();
  const statusCounts = new Map<string, number>();

  for (const order of orders) {
    const channel = messagingChannels.includes(order.channel as never) ? order.channel as typeof messagingChannels[number] : "WHATSAPP";
    const amount = Number(order.totalAmount ?? 0);
    const bucket = channels[channel];
    bucket.orders += 1;
    bucket.total += Number.isFinite(amount) ? amount : 0;
    if (isConfirmed(order.status)) bucket.confirmed += 1;
    else bucket.pending += 1;
    statusCounts.set(order.status, (statusCounts.get(order.status) ?? 0) + 1);

    const currency = order.currency || "ARS";
    const current = currencyMap.get(currency) ?? { currency, total: 0, orders: 0 };
    current.total += Number.isFinite(amount) ? amount : 0;
    current.orders += 1;
    currencyMap.set(currency, current);
  }

  for (const channel of messagingChannels) {
    const bucket = channels[channel];
    bucket.averageTicket = bucket.orders ? Math.round((bucket.total / bucket.orders) * 100) / 100 : 0;
    bucket.conversionRate = bucket.orders ? Math.round((bucket.confirmed / bucket.orders) * 100) : 0;
  }

  return {
    totalOrders: orders.length,
    channels,
    totalsByCurrency: Array.from(currencyMap.values()).sort((a, b) => a.currency.localeCompare(b.currency)),
    statusBreakdown: Array.from(statusCounts.entries()).map(([status, count]) => ({ status, count })),
  };
}
