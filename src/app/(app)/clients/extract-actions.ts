"use server";

import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getCurrentUser } from "@/lib/current-user";
import { getAnthropicClient } from "@/lib/anthropic";

const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15MB — comfortably under the API's 32MB request limit

const clientExtractionSchema = z.object({
  name: z.string().nullable(),
  taxId: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
});

export type ClientExtraction = z.infer<typeof clientExtractionSchema>;

export type ClientExtractionResult =
  | { success: true; data: ClientExtraction }
  | { success: false; error: string };

export async function extractClientFromPdf(
  formData: FormData,
): Promise<ClientExtractionResult> {
  const user = await getCurrentUser();
  if (!user || user.role === "VIEWER") {
    return { success: false, error: "You don't have permission to do this." };
  }

  const file = formData.get("document");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "No file uploaded." };
  }
  if (file.type !== "application/pdf") {
    return { success: false, error: "Please upload a PDF file." };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { success: false, error: "File is too large (max 15MB)." };
  }

  const client = getAnthropicClient();
  if (!client) {
    return {
      success: false,
      error: "PDF extraction isn't configured yet (missing ANTHROPIC_API_KEY).",
    };
  }

  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");

  try {
    const response = await client.messages.parse({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64,
              },
            },
            {
              type: "text",
              text: "This PDF relates to a client company (e.g. a contract, company registration document, or correspondence). Extract the CLIENT company's own details — name, tax ID, contact email, and contact phone — as stated in the document. If a field isn't present, return null for it rather than guessing.",
            },
          ],
        },
      ],
      output_config: {
        format: zodOutputFormat(clientExtractionSchema),
      },
    });

    if (!response.parsed_output) {
      return {
        success: false,
        error: "Could not extract client details from this PDF.",
      };
    }

    return { success: true, data: response.parsed_output };
  } catch (err) {
    console.error("Client PDF extraction failed:", err);
    return {
      success: false,
      error: "Extraction failed. You can enter the details manually.",
    };
  }
}
