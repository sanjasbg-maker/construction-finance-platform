import { Sidebar } from "@/components/Sidebar";
import { getCurrentUser, listUsers } from "@/lib/current-user";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [users, currentUser] = await Promise.all([listUsers(), getCurrentUser()]);

  return (
    <div className="flex flex-1">
      <Sidebar users={users} activeUserId={currentUser?.id} />
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
