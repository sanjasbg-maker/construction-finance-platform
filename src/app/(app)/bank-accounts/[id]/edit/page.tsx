import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BankAccountForm } from "../../BankAccountForm";
import { updateBankAccount } from "../../actions";

export default async function EditBankAccountPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const account = await prisma.bankAccount.findUnique({ where: { id } });

  if (!account) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Edit Bank Account
      </h1>
      <BankAccountForm
        action={updateBankAccount.bind(null, id)}
        defaultValues={{ ...account, openingBalance: account.openingBalance.toString() }}
      />
    </div>
  );
}
