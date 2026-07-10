"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { ACTIVE_USER_COOKIE } from "@/lib/current-user";

export async function setActiveUser(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_USER_COOKIE, userId, { path: "/" });
  revalidatePath("/", "layout");
}
