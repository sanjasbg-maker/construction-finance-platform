import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { UserForm } from "../../UserForm";
import { updateUser } from "../../actions";

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id } });

  if (!user) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Edit User</h1>
      <UserForm
        action={updateUser.bind(null, id)}
        defaultValues={{ name: user.name, email: user.email, role: user.role }}
        mode="edit"
      />
    </div>
  );
}
