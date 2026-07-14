"use server";

import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getCurrentUser } from "@/lib/current-user";
import { getAnthropicClient } from "@/lib/anthropic";

const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15MB — comfortably under the API's 32MB request limit

// Project/Contract are deliberately not part of this schema - a PDF has no
// way to know which internal project it belongs to (see the SEF-routing
// discussion), so those stay a manual selection every time, not a guess.
const purchaseInvoiceExtractionSchema = z.object({
  vendorName: z.string().nullable(),
  invoiceNumber: z.string().nullable(),
  sefNumber: z.string().nullable(),
  amount: z.string().nullable(),
  currency: z.enum(["EUR", "RSD"]).nullable(),
  issueDate: z.string().nullable(),
  dueDate: z.string().nullable(),
});

export type PurchaseInvoiceExtraction = z.infer<typeof purchaseInvoiceExtractionSchema>;

export type PurchaseInvoiceExtractionResult =
  | { success: true; data: PurchaseInvoiceExtraction }
  | { success: false; error: string };

export async function extractPurchaseInvoice(
  formData: FormData,
): Promise<PurchaseInvoiceExtractionResult> {
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
              text: "This PDF is a vendor invoice (purchase invoice) received by our company. Extract: the VENDOR name (the company that issued this invoice and is requesting payment, not us as the recipient), the invoice number, the SEF number (Serbian e-invoicing system reference, if present), the total amount, the currency (EUR or RSD), the issue date, and the payment due date. Dates must be in YYYY-MM-DD format. If a field isn't present on the invoice, return null for it rather than guessing.",
            },
          ],
        },
      ],
      output_config: {
        format: zodOutputFormat(purchaseInvoiceExtractionSchema),
      },
    });

    if (!response.parsed_output) {
      return {
        success: false,
        error: "Could not extract invoice details from this PDF.",
      };
    }

    return { success: true, data: response.parsed_output };
  } catch (err) {
    console.error("Purchase invoice PDF extraction failed:", err);
    return {
      success: false,
      error: "Extraction failed. You can enter the details manually.",
    };
  }
}
