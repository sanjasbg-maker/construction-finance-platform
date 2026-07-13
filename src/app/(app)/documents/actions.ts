"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { withUser } from "@/lib/prisma";
import { requireWriteAccess } from "@/lib/authorization";
import { saveDocumentFile } from "@/lib/storage";
import { documentMetaSchema, toLinkFields } from "./schema";

export type DocumentFormState = {
  message?: string;
  errors?: Partial<Record<"category" | "linkId", string[]>>;
};

const MAX_FILE_SIZE = 20 * 1024 * 1024;

function parseMeta(formData: FormData) {
  return {
    category: String(formData.get("category") ?? ""),
    linkType: String(formData.get("linkType") ?? "NONE"),
    linkId: String(formData.get("linkId") ?? "") || undefined,
  };
}

export async function uploadDocument(
  _prevState: DocumentFormState,
  formData: FormData,
): Promise<DocumentFormState> {
  const { user, error } = await requireWriteAccess();
  if (error || !user) return { message: error ?? "Unauthorized" };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { message: "Please choose a file to upload." };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { message: "File is too large (max 20MB)." };
  }

  const parsed = documentMetaSchema.safeParse(parseMeta(formData));
  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
      message: "Please fix the errors below.",
    };
  }

  const storageKey = await saveDocumentFile(file);

  await withUser(user.id).document.create({
    data: {
      category: parsed.data.category,
      fileName: file.name,
      url: storageKey,
      mimeType: file.type || "application/octet-stream",
      ...toLinkFields(parsed.data),
    },
  });

  revalidatePath("/documents");
  redirect("/documents");
}

export async function updateDocument(
  id: string,
  _prevState: DocumentFormState,
  formData: FormData,
): Promise<DocumentFormState> {
  const { user, error } = await requireWriteAccess();
  if (error || !user) return { message: error ?? "Unauthorized" };

  const parsed = documentMetaSchema.safeParse(parseMeta(formData));
  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
      message: "Please fix the errors below.",
    };
  }

  await withUser(user.id).document.update({
    where: { id },
    data: {
      category: parsed.data.category,
      ...toLinkFields(parsed.data),
    },
  });

  revalidatePath("/documents");
  redirect("/documents");
}

export async function removeDocument(id: string) {
  const { user, error } = await requireWriteAccess();
  if (error || !user) throw new Error(error ?? "Unauthorized");

  // Soft delete only - the file stays on disk, consistent with the rest of
  // the app never truly destroying financial/document history.
  await withUser(user.id).document.delete({ where: { id } });
  revalidatePath("/documents");
}
