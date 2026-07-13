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
