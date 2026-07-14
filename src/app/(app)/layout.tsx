import { Sidebar } from "@/components/Sidebar";
import { getCurrentUser } from "@/lib/current-user";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // proxy.ts already guarantees a valid session for every route under (app),
  // so currentUser is never actually null here in practice.
  const currentUser = await getCurrentUser();

  return (
    <div className="flex flex-1">
      <Sidebar currentUser={{ name: currentUser?.name ?? "", role: currentUser?.role ?? "" }} />
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
