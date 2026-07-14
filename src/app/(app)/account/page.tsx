import { getCurrentUser } from "@/lib/current-user";
import { ChangePasswordForm } from "./ChangePasswordForm";

export default async function AccountPage() {
  const user = await getCurrentUser();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">My Account</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {user?.name} ({user?.role})
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Change Password
        </h2>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
