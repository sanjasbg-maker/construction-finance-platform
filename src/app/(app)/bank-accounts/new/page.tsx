import { BankAccountForm } from "../BankAccountForm";
import { createBankAccount } from "../actions";

export default function NewBankAccountPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Add Bank Account
      </h1>
      <BankAccountForm action={createBankAccount} />
    </div>
  );
}
