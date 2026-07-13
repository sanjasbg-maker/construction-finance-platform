"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma, withUser } from "@/lib/prisma";
import { requireWriteAccess } from "@/lib/authorization";
import { parseStatementCsv } from "./csv";

export type StatementFormState = {
  message?: string;
};

export async function importStatement(
  _prevState: StatementFormState,
  formData: FormData,
): Promise<StatementFormState> {
  const { user, error } = await requireWriteAccess();
  if (error || !user) return { message: error ?? "Unauthorized" };

  const bankAccountId = String(formData.get("bankAccountId") ?? "");
  if (!bankAccountId) return { message: "Bank account is required." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { message: "Please upload a CSV file." };
  }
  if (!file.name.toLowerCase().endsWith(".csv") && file.type !== "text/csv") {
    return { message: "Please upload a .csv file." };
  }

  const text = await file.text();
  const parsed = parseStatementCsv(text);
  if (!parsed.success) {
    return { message: parsed.error };
  }

  const fileNameOverride = String(formData.get("fileName") ?? "").trim();
  const fileName = fileNameOverride || file.name;

  const periodStartRaw = String(formData.get("periodStart") ?? "").trim();
  const periodEndRaw = String(formData.get("periodEnd") ?? "").trim();
  const dates = parsed.transactions.map((t) => t.date.getTime());
  const periodStart = periodStartRaw ? new Date(periodStartRaw) : new Date(Math.min(...dates));
  const periodEnd = periodEndRaw ? new Date(periodEndRaw) : new Date(Math.max(...dates));

  const client = withUser(user.id);
  const statement = await client.$transaction(async (tx) => {
    const created = await tx.bankStatement.create({
      data: { bankAccountId, fileName, periodStart, periodEnd },
    });
    // Individual create() calls (not createMany) so each row gets the usual
    // createdBy/updatedBy stamping - createMany bypasses the per-row extension
    // hooks that provide that.
    for (const t of parsed.transactions) {
      await tx.bankTransaction.create({
        data: {
          bankStatementId: created.id,
          date: t.date,
          description: t.description,
          amount: t.amount,
        },
      });
    }
    return created;
  });

  revalidatePath("/bank-statements");
  redirect(`/bank-statements/${statement.id}`);
}

export async function updateStatement(
  id: string,
  _prevState: StatementFormState,
  formData: FormData,
): Promise<StatementFormState> {
  const { user, error } = await requireWriteAccess();
  if (error || !user) return { message: error ?? "Unauthorized" };

  const fileName = String(formData.get("fileName") ?? "").trim();
  if (!fileName) return { message: "File name is required." };

  const periodStartRaw = String(formData.get("periodStart") ?? "").trim();
  const periodEndRaw = String(formData.get("periodEnd") ?? "").trim();

  await withUser(user.id).bankStatement.update({
    where: { id },
    data: {
      fileName,
      periodStart: periodStartRaw ? new Date(periodStartRaw) : null,
      periodEnd: periodEndRaw ? new Date(periodEndRaw) : null,
    },
  });
  revalidatePath("/bank-statements");
  revalidatePath(`/bank-statements/${id}`);
  redirect(`/bank-statements/${id}`);
}

export async function removeStatement(id: string) {
  const { user, error } = await requireWriteAccess();
  if (error || !user) throw new Error(error ?? "Unauthorized");

  const reconciledCount = await prisma.bankTransaction.count({
    where: { bankStatementId: id, reconciled: true },
  });
  if (reconciledCount > 0) {
    throw new Error("This statement has reconciled transactions and can no longer be deleted.");
  }

  await withUser(user.id).bankStatement.delete({ where: { id } });
  revalidatePath("/bank-statements");
}
