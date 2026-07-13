import { getCurrentUser } from "@/lib/current-user";
import type { UserRole } from "@/generated/prisma/client";

/** VIEWER is read-only everywhere; every other role may write. */
export async function requireWriteAccess() {
  const user = await getCurrentUser();
  if (!user) {
    return { user: null, error: "No active user. Select one from the sidebar." };
  }
  if (user.role === "VIEWER") {
    return { user: null, error: "Viewers cannot make changes." };
  }
  return { user, error: null as string | null };
}

/** Restricts an action to specific roles. ADMIN always bypasses this, same as
 * it bypasses every other role gate in the app. */
export async function requireRole(allowedRoles: UserRole[]) {
  const user = await getCurrentUser();
  if (!user) {
    return { user: null, error: "No active user. Select one from the sidebar." };
  }
  if (user.role === "ADMIN" || allowedRoles.includes(user.role)) {
    return { user, error: null as string | null };
  }
  return { user: null, error: `Only ${allowedRoles.join(" or ")} can do this.` };
}
