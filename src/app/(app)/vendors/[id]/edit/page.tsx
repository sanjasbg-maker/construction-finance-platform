import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { VendorForm } from "../../VendorForm";
import { updateVendor } from "../../actions";

export default async function EditVendorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const vendor = await prisma.vendor.findUnique({ where: { id } });

  if (!vendor) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Edit Vendor
      </h1>
      <VendorForm
        action={updateVendor.bind(null, id)}
        defaultValues={{ ...vendor, openingBalance: vendor.openingBalance.toString() }}
      />
    </div>
  );
}
