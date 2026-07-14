import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

/**
 * Reads the session cookie and verifies it against the Session table. No
 * fallback: a missing or invalid session means null, full stop - middleware
 * already guarantees a valid session for anything under (app), so this only
 * legitimately returns null for routes outside that guard (e.g. /login).
 */
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function listUsers() {
  return prisma.user.findMany({ orderBy: { createdAt: "asc" } });
}
