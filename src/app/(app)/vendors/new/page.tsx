import { VendorForm } from "../VendorForm";
import { createVendor } from "../actions";

export default function NewVendorPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Add Vendor
      </h1>
      <VendorForm action={createVendor} />
    </div>
  );
}
