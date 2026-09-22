// Unified form submitter for Google Apps Script Web App.
// Sends POST with Content-Type: text/plain;charset=utf-8 (required to bypass CORS).
// The Apps Script expects: { formType: "...", data: { field1: "...", ... } }
// and returns: { success: true, app_id: "..." }

export const API_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbz2EoqhbyNYTjnhqqHJb-r64l8kNKG6EkfnDANwQDGKXc9SWHWXSn7Ri6ZDIpta89Ux/exec";

export type FormType =
  | "Pathfinder"
  | "Volunteer"
  | "partner"
  | "Ambassador"
  | "CountryUnion";

export interface SubmitResult {
  generatedId: string;
  raw: unknown;
}

export async function submitToAppsScript(
  formType: FormType,
  fields: Record<string, unknown>
): Promise<SubmitResult> {
  // Nest fields under `data` so Apps Script reads: const data = body.data
  const body = { formType, data: fields };

  console.log(`[submitForm] Submitting ${formType}:`, body);

  const response = await fetch(API_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  console.log(`[submitForm] Response status=${response.status}, body=${text.substring(0, 500)}`);

  if (text.trim().startsWith("<!")) {
    throw new Error("API returned an error page. Please try again.");
  }

  let result: {
    success?: boolean;
    error?: string;
    app_id?: string;
  };

  try {
    result = JSON.parse(text);
  } catch {
    throw new Error("Invalid response from server");
  }

  if (!result.success) {
    throw new Error(result.error || "Submission failed");
  }

  return { generatedId: result.app_id || "", raw: result };
}
