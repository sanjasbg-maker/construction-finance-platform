export const AGING_BUCKETS = ["Overdue", "0-30 days", "31-60 days", "61-90 days", "90+ days"] as const;
export type AgingBucketLabel = (typeof AGING_BUCKETS)[number];

/** Buckets a due date relative to `now` into a fixed period label - used by
 * both the Purchase Invoices aging export and Reports' Cash Flow Forecast,
 * so "how we bucket a due date" is defined in exactly one place. */
export function bucketByDueDate(dueDate: Date, now: Date = new Date()): AgingBucketLabel {
  const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / 86_400_000);
  if (daysUntilDue < 0) return "Overdue";
  if (daysUntilDue <= 30) return "0-30 days";
  if (daysUntilDue <= 60) return "31-60 days";
  if (daysUntilDue <= 90) return "61-90 days";
  return "90+ days";
}
