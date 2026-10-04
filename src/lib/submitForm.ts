/**
 * TİSYA Unified Form Intake System
 * Supabase-First Architecture with Google Sheets Mirroring.
 *
 * Flow:
 *  1. Frontend submits directly to Supabase RPC `submit_application` (Primary Source of Truth).
 *  2. Supabase atomically validates, generates unique application ID, and stores the record.
 *  3. Application ID is returned immediately to the frontend, giving instant confirmation to applicant.
 *  4. Asynchronous mirror dispatch sends application data to Google Apps Script to update Google Sheets.
 *  5. Google Sheet failure/downtime NEVER blocks or fails the user application.
 */

export const DEV_SUPABASE_URL = "https://edsxgjdgqdiffhbeavah.supabase.co";
export const DEV_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkc3hnamRncWRpZmZoYmVhdmFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzODI0ODUsImV4cCI6MjEwMzk1ODQ4NX0.3GLbTEHredkCHYIkXMMVBjaX2Y0ROU4yIcRFTTTPFwA";

export const GOOGLE_APPS_SCRIPT_URL =
  (typeof import.meta !== "undefined" && (import.meta as any)?.env?.VITE_GOOGLE_APPS_SCRIPT_URL) ||
  "https://script.google.com/macros/s/AKfycbz2EoqhbyNYTjnhqqHJb-r64l8kNKG6EkfnDANwQDGKXc9SWHWXSn7Ri6ZDIpta89Ux/exec";

export const SUPABASE_URL =
  (typeof import.meta !== "undefined" && ((import.meta as any)?.env?.VITE_SUPABASE_URL || (import.meta as any)?.env?.["VITE_SUPABASE_URL"])) ||
  DEV_SUPABASE_URL;

export const SUPABASE_ANON_KEY =
  (typeof import.meta !== "undefined" &&
    ((import.meta as any)?.env?.VITE_SUPABASE_ANON_KEY ||
      (import.meta as any)?.env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
      (import.meta as any)?.env?.["VITE_SUPABASE_ANON_KEY"])) ||
  DEV_SUPABASE_ANON_KEY;

export type FormType =
  | "Pathfinder"
  | "Volunteer"
  | "partner"
  | "Ambassador";

export interface SubmitResult {
  generatedId: string;
  raw: unknown;
}

interface SupabaseRpcResponse {
  success: boolean;
  application_id: string;
  id: string;
  application_type: string;
  status: string;
  error?: string;
}

/**
 * Dispatches an asynchronous non-blocking mirror event to Google Apps Script.
 * Even if Google Apps Script is slow or down, the user's submission in Supabase is already preserved.
 */
async function mirrorToGoogleSheetAsync(payload: {
  formType: FormType;
  appId: string;
  supabaseId: string;
  data: Record<string, unknown>;
}): Promise<void> {
  if (!GOOGLE_APPS_SCRIPT_URL) return;

  try {
    const body = {
      action: "sync_application",
      formType: payload.formType,
      app_id: payload.appId,
      supabase_application_id: payload.supabaseId,
      data: payload.data,
      submitted_at: new Date().toISOString(),
    };

    console.log(`[mirrorToGoogleSheet] Mirroring ${payload.appId} to Google Sheet...`);

    // Using text/plain to bypass CORS preflight in Google Apps Script Web App
    const res = await fetch(GOOGLE_APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body),
    });

    const resText = await res.text();
    console.log(`[mirrorToGoogleSheet] Mirror response:`, resText.substring(0, 200));
  } catch (err) {
    // Non-blocking: Supabase is primary source of truth.
    console.warn(`[mirrorToGoogleSheet] Async mirror failed (non-blocking):`, err);
  }
}

/**
 * Submits form directly to Supabase as primary source of truth,
 * then triggers asynchronous Google Sheet mirror.
 */
export async function submitApplication(
  formType: FormType,
  fields: Record<string, unknown>
): Promise<SubmitResult> {
  console.log(`[submitForm] Submitting ${formType} to Supabase:`, fields);

  let supabaseResult: SupabaseRpcResponse | null = null;
  let supabaseError: Error | null = null;

  try {
    const rpcEndpoint = `${SUPABASE_URL}/rest/v1/rpc/submit_application`;
    const response = await fetch(rpcEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        p_form_type: formType,
        p_data: fields,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      let parsedErr: { message?: string; error?: string; hint?: string } = {};
      try {
        parsedErr = JSON.parse(errText);
      } catch (_) {}
      throw new Error(parsedErr.message || parsedErr.error || `Server responded with ${response.status}`);
    }

    supabaseResult = (await response.json()) as SupabaseRpcResponse;

    if (!supabaseResult || !supabaseResult.success || !supabaseResult.application_id) {
      throw new Error(supabaseResult?.error || "Submission failed to return an application ID");
    }
  } catch (err) {
    supabaseError = err instanceof Error ? err : new Error(String(err));
    console.error("[submitForm] Primary Supabase submission failed:", supabaseError);
  }

  // If Supabase succeeded (primary path):
  if (supabaseResult && supabaseResult.application_id) {
    const appId = supabaseResult.application_id;

    // Trigger asynchronous mirror to Google Sheets in background
    mirrorToGoogleSheetAsync({
      formType,
      appId,
      supabaseId: supabaseResult.id,
      data: fields,
    });

    return {
      generatedId: appId,
      raw: supabaseResult,
    };
  }

  // Resilience Fallback: If Supabase was unreachable, fall back to Apps Script direct submission
  console.warn("[submitForm] Supabase unavailable. Attempting fallback to Google Apps Script...");
  try {
    const fallbackResponse = await fetch(GOOGLE_APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ formType, data: fields }),
    });

    const text = await fallbackResponse.text();
    const result = JSON.parse(text);
    if (!result.success) {
      throw new Error(result.error || "Submission failed");
    }

    return {
      generatedId: result.app_id || "",
      raw: result,
    };
  } catch (fallbackErr) {
    console.error("[submitForm] Fallback also failed:", fallbackErr);
    throw supabaseError || new Error("Application submission failed. Please try again.");
  }
}

// Backwards-compatible alias for existing form components
export const submitToAppsScript = submitApplication;
