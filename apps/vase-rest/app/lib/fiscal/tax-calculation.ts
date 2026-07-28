import { Prisma } from "@prisma/client";

const round = (value: Prisma.Decimal) =>
  value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

export function splitTax(input: {
  gross: string;
  rate: string;
  included: boolean;
}) {
  const amount = new Prisma.Decimal(input.gross);
  const rate = new Prisma.Decimal(input.rate);
  if (amount.isNegative() || rate.isNegative() || rate.greaterThan(100)) {
    throw new Error("REST_TAX_VALUE_INVALID");
  }
  const divisor = new Prisma.Decimal(1).add(rate.div(100));
  const net = input.included ? round(amount.div(divisor)) : round(amount);
  const gross = input.included ? round(amount) : round(net.mul(divisor));
  return {
    gross: gross.toFixed(2),
    net: net.toFixed(2),
    tax: gross.sub(net).toFixed(2),
  };
}

