import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const ACTIVE_USER_COOKIE = "active-user-id";

/**
 * Dev-only "acting as" stub in place of real authentication (see plan decision on
 * auth scope). Reads the active user id from a cookie, falling back to the
 * earliest-created seeded user so there's always a current user to attribute writes
 * to.
 */
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const activeUserId = cookieStore.get(ACTIVE_USER_COOKIE)?.value;

  if (activeUserId) {
    const user = await prisma.user.findUnique({ where: { id: activeUserId } });
    if (user) return user;
  }

  return prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
}

export async function listUsers() {
  return prisma.user.findMany({ orderBy: { createdAt: "asc" } });
}
