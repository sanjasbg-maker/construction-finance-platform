/** Sums a Decimal-bearing field across records (e.g. PaymentAllocation.amount). */
export function sumDecimal(items: { amount: unknown }[]) {
  return items.reduce((acc, item) => acc + Number(item.amount), 0);
}

export function formatMoney(value: unknown, currency: string) {
  return `${Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

/** Sums are never blended across currencies (no FX conversion in this app) -
 * this groups by currency so each subtotal can be formatted separately. */
export function sumByCurrency(rows: { amount: number; currency: string }[]) {
  const totals = new Map<string, number>();
  for (const row of rows) {
    totals.set(row.currency, (totals.get(row.currency) ?? 0) + row.amount);
  }
  return Array.from(totals.entries());
}

export function formatMultiCurrency(rows: { amount: number; currency: string }[]) {
  const totals = sumByCurrency(rows);
  if (totals.length === 0) return "—";
  return totals.map(([currency, amount]) => formatMoney(amount, currency)).join(" + ");
}
