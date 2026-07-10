"use server";

import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getCurrentUser } from "@/lib/current-user";
import { getAnthropicClient } from "@/lib/anthropic";

const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15MB — comfortably under the API's 32MB request limit

const vendorExtractionSchema = z.object({
  name: z.string().nullable(),
  taxId: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  paymentTerms: z.string().nullable(),
});

export type VendorExtraction = z.infer<typeof vendorExtractionSchema>;

export type VendorExtractionResult =
  | { success: true; data: VendorExtraction }
  | { success: false; error: string };

export async function extractVendorFromInvoice(
  formData: FormData,
): Promise<VendorExtractionResult> {
  const user = await getCurrentUser();
  if (!user || user.role === "VIEWER") {
    return { success: false, error: "You don't have permission to do this." };
  }

  const file = formData.get("invoice");
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
              text: "This PDF is a vendor invoice. Extract the details of the VENDOR — the company that issued this invoice and is requesting payment — not the recipient/customer being billed. If a field isn't present on the invoice, return null for it rather than guessing.",
            },
          ],
        },
      ],
      output_config: {
        format: zodOutputFormat(vendorExtractionSchema),
      },
    });

    if (!response.parsed_output) {
      return {
        success: false,
        error: "Could not extract vendor details from this PDF.",
      };
    }

    return { success: true, data: response.parsed_output };
  } catch (err) {
    console.error("Vendor PDF extraction failed:", err);
    return {
      success: false,
      error: "Extraction failed. You can enter the details manually.",
    };
  }
}
