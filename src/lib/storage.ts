import { mkdir, readFile, writeFile } from "fs/promises";
import { randomUUID } from "crypto";
import path from "path";

// Local filesystem storage for v1 - no cloud object storage (S3/Blob) is
// configured yet. Files live outside `public/` (served only through the
// /api/documents/[id] route, not directly) and outside git (see .gitignore).
const STORAGE_ROOT = path.join(process.cwd(), "storage", "documents");

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
}

export async function saveDocumentFile(file: File): Promise<string> {
  await mkdir(STORAGE_ROOT, { recursive: true });
  const storageKey = `${randomUUID()}-${sanitizeFileName(file.name)}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(STORAGE_ROOT, storageKey), buffer);
  return storageKey;
}

export async function readDocumentFile(storageKey: string): Promise<Buffer> {
  return readFile(path.join(STORAGE_ROOT, storageKey));
}
