import { prisma } from "@/lib/db/prisma";

type DailyPoint = {
  date: string;
  value: number;
};

function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function addDays(date: Date, days: number) {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
}

function toDayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildDayKeys(days: number, now = new Date()) {
  const today = startOfDay(now);
  const start = addDays(today, -(days - 1));
  const keys: string[] = [];
  for (let i = 0; i < days; i += 1) {
    keys.push(toDayKey(addDays(start, i)));
  }
  return { start, end: addDays(today, 1), keys };
}

function initSeries(keys: string[]) {
  return new Map(keys.map((key) => [key, 0]));
}

function mapToPoints(series: Map<string, number>) {
  return Array.from(series.entries()).map(([date, value]) => ({ date, value }));
}

function sumRange(series: DailyPoint[], days: number) {
  return series.slice(-days).reduce((total, point) => total + point.value, 0);
}

export async function getTenantAnalytics(tenantId: string, days = 30) {
  const { start, end, keys } = buildDayKeys(days);

  const [orders, conversations, tickets, domainConnections, channelConnections] = await Promise.all([
    prisma.order.findMany({
      where: { tenantId, createdAt: { gte: start, lt: end } },
      select: { createdAt: true, totalAmount: true, status: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.aiConversation.findMany({
      where: { tenantId, startedAt: { gte: start, lt: end } },
      select: { startedAt: true },
      orderBy: { startedAt: "asc" },
    }),
    prisma.supportTicket.findMany({
      where: { tenantId, createdAt: { gte: start, lt: end } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.domainConnection.findMany({
      where: { tenantId, status: "CONNECTED", updatedAt: { gte: start, lt: end } },
      select: { updatedAt: true },
      orderBy: { updatedAt: "asc" },
    }),
    prisma.aiChannelConnection.findMany({
      where: { tenantId, status: "CONNECTED", updatedAt: { gte: start, lt: end } },
      select: { updatedAt: true },
      orderBy: { updatedAt: "asc" },
    }),
  ]);

  const salesSeries = initSeries(keys);
  const leadsSeries = initSeries(keys);
  const conversationsSeries = initSeries(keys);
  const ticketsSeries = initSeries(keys);
  const connectedDomainsSeries = initSeries(keys);
  const connectedChannelsSeries = initSeries(keys);
  const ordersByStatus = new Map<string, number>();

  for (const order of orders) {
    const key = toDayKey(order.createdAt);
    if (salesSeries.has(key)) {
      const current = salesSeries.get(key) ?? 0;
      salesSeries.set(key, current + Number(order.totalAmount ?? 0));
      const leadsCurrent = leadsSeries.get(key) ?? 0;
      leadsSeries.set(key, leadsCurrent + 1);
    }
    ordersByStatus.set(order.status, (ordersByStatus.get(order.status) ?? 0) + 1);
  }

  for (const conversation of conversations) {
    const key = toDayKey(conversation.startedAt);
    if (conversationsSeries.has(key)) {
      conversationsSeries.set(key, (conversationsSeries.get(key) ?? 0) + 1);
      leadsSeries.set(key, (leadsSeries.get(key) ?? 0) + 1);
    }
  }

  for (const ticket of tickets) {
    const key = toDayKey(ticket.createdAt);
    if (ticketsSeries.has(key)) {
      ticketsSeries.set(key, (ticketsSeries.get(key) ?? 0) + 1);
      leadsSeries.set(key, (leadsSeries.get(key) ?? 0) + 1);
    }
  }

  for (const domain of domainConnections) {
    const key = toDayKey(domain.updatedAt);
    if (connectedDomainsSeries.has(key)) {
      connectedDomainsSeries.set(key, (connectedDomainsSeries.get(key) ?? 0) + 1);
    }
  }

  for (const channel of channelConnections) {
    const key = toDayKey(channel.updatedAt);
    if (connectedChannelsSeries.has(key)) {
      connectedChannelsSeries.set(key, (connectedChannelsSeries.get(key) ?? 0) + 1);
    }
  }

  const sales = mapToPoints(salesSeries);
  const leads = mapToPoints(leadsSeries);
  const conversationsPoints = mapToPoints(conversationsSeries);
  const ticketsPoints = mapToPoints(ticketsSeries);
  const connectedDomains = mapToPoints(connectedDomainsSeries);
  const connectedChannels = mapToPoints(connectedChannelsSeries);

  return {
    period: {
      days,
      start,
      end,
    },
    summary: {
      salesToday: sales[sales.length - 1]?.value ?? 0,
      salesLast7Days: sumRange(sales, 7),
      leadsToday: leads[leads.length - 1]?.value ?? 0,
      leadsLast7Days: sumRange(leads, 7),
      conversationsToday: conversationsPoints[conversationsPoints.length - 1]?.value ?? 0,
      ticketsToday: ticketsPoints[ticketsPoints.length - 1]?.value ?? 0,
      domainsConnectedLast30Days: connectedDomains.reduce((total, point) => total + point.value, 0),
      channelsConnectedLast30Days: connectedChannels.reduce((total, point) => total + point.value, 0),
    },
    series: {
      sales,
      leads,
      conversations: conversationsPoints,
      tickets: ticketsPoints,
      connectedDomains,
      connectedChannels,
    },
    ordersByStatus: Array.from(ordersByStatus.entries()).map(([status, value]) => ({
      status,
      value,
    })),
  };
}
