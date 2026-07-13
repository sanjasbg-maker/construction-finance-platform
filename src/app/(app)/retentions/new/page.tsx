import { RetentionForm } from "../RetentionForm";
import { createRetention } from "../actions";
import { getRetentionFormOptions } from "../form-options";

export default async function NewRetentionPage() {
  const { contracts, purchaseInvoices, salesInvoices } = await getRetentionFormOptions();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Add Retention</h1>
      <RetentionForm
        action={createRetention}
        contracts={contracts}
        purchaseInvoices={purchaseInvoices}
        salesInvoices={salesInvoices}
      />
    </div>
  );
}
