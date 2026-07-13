import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readDocumentFile } from "@/lib/storage";

function sanitizeForHeader(name: string) {
  return name.replace(/["\r\n]/g, "_");
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const document = await prisma.document.findUnique({ where: { id } });
  if (!document) {
    return new NextResponse("Not found", { status: 404 });
  }

  const bytes = await readDocumentFile(document.url).catch(() => null);
  if (!bytes) {
    return new NextResponse("File missing on disk", { status: 404 });
  }

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": document.mimeType,
      "Content-Disposition": `inline; filename="${sanitizeForHeader(document.fileName)}"`,
    },
  });
}
