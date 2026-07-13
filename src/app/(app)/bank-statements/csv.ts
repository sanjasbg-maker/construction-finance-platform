import Papa from "papaparse";

export type ParsedTransaction = {
  date: Date;
  description: string;
  amount: string;
};

export type ParseCsvResult =
  | { success: true; transactions: ParsedTransaction[] }
  | { success: false; error: string };

const REQUIRED_COLUMNS = ["date", "description", "amount"] as const;

function normalizeHeader(header: string) {
  return header.trim().toLowerCase();
}

/**
 * Expected format: a header row with date/description/amount columns (any
 * order, case-insensitive), date as YYYY-MM-DD, amount signed (positive =
 * money in, negative = money out). One fixed format for now - see plan
 * decision #2, per-bank adapters are a later addition.
 */
export function parseStatementCsv(text: string): ParseCsvResult {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: normalizeHeader,
  });

  if (result.errors.length > 0) {
    const first = result.errors[0];
    return { success: false, error: `CSV parse error: ${first.message} (row ${first.row ?? "?"}).` };
  }

  const headers = result.meta.fields ?? [];
  const missing = REQUIRED_COLUMNS.filter((col) => !headers.includes(col));
  if (missing.length > 0) {
    return {
      success: false,
      error: `CSV is missing required column(s): ${missing.join(", ")}. Expected columns: date, description, amount.`,
    };
  }

  const transactions: ParsedTransaction[] = [];
  for (let i = 0; i < result.data.length; i++) {
    const row = result.data[i];
    const rowNumber = i + 2; // +1 for 0-index, +1 for header row

    const rawDate = (row.date ?? "").trim();
    const date = new Date(rawDate);
    if (!rawDate || Number.isNaN(date.getTime())) {
      return { success: false, error: `Row ${rowNumber}: invalid date "${rawDate}" (expected YYYY-MM-DD).` };
    }

    const description = (row.description ?? "").trim();
    if (!description) {
      return { success: false, error: `Row ${rowNumber}: description is required.` };
    }

    const rawAmount = (row.amount ?? "").trim();
    if (!rawAmount || Number.isNaN(Number(rawAmount))) {
      return { success: false, error: `Row ${rowNumber}: invalid amount "${rawAmount}".` };
    }

    transactions.push({ date, description, amount: rawAmount });
  }

  if (transactions.length === 0) {
    return { success: false, error: "CSV has no transaction rows." };
  }

  return { success: true, transactions };
}
