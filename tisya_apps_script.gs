/**
 * ================================================================
 *  TİSYA Unified Intake & Synchronization System — Google Apps Script
 *  Handles: Pathfinder | Pioneer (Volunteer) | Partner | Ambassador
 *
 *  ARCHITECTURE:
 *    Website Application Form
 *      ↓
 *    Supabase (Primary Source of Truth)
 *      ↓
 *    Google Apps Script → Google Sheet Mirror (Admin View)
 *
 *  Deploy as: Web App
 *    • Execute as: Me
 *    • Who has access: Anyone
 *
 *  Features:
 *    • Full support for all 4 application types (Pathfinder, Pioneer, Partner, Ambassador)
 *    • Webhook mirror ingestion (push from website/Supabase)
 *    • Scheduled & manual pull synchronization (syncFromSupabase)
 *    • Idempotent upsert by application ID (never duplicates rows)
 *    • Status & TİSYA ID synchronization from Supabase to Google Sheet
 *    • Historical migration utility (migrateHistoricalSheetRecordsToSupabase)
 *    • Automated applicant confirmation and admin notification emails
 *    • Google Sheet UI menu for easy administrative control
 * ================================================================
 */


/* ================================================================
   EMAIL CONFIGURATION
================================================================ */

const ADMIN_EMAIL = "info@tisya.online";

const SENDER_NAME =
  "TİSYA — Türkiye International Students Youth Alliance";


/* ================================================================
   SUPABASE INTEGRATION CONFIGURATION
================================================================ */

const SUPABASE_DEFAULT_URL = "https://edsxgjdgqdiffhbeavah.supabase.co";

/**
 * Columns present at the far right of all 4 sheets:
 * Pathfinders | Pioneers | Partners | Ambassadors
 */
const SUPABASE_SYNC_COLUMNS = [
  "supabase_application_id",
  "supabase_sync_status",
  "application_status",
  "tisya_id",
  "synced_at"
];


/* ================================================================
   SHEET CONFIGURATION
================================================================ */

const FORM_CONFIG = {

  /* --------------------------------------------------------------
     Pathfinder
  -------------------------------------------------------------- */
  Pathfinder: {
    tab: "Pathfinders",
    prefix: "PF",
    application_type: "pathfinder",

    fields: [
      "source_form_version",
      "full_name",
      "email",
      "contact_number",
      "city",
      "nationality",
      "university",
      "department_of_study",
      "interests",
      "attention_reason",
      "social_level",
      "acquisition_channel",
      "consent_data_storage",
      "consent_updates"
    ]
  },

  /* --------------------------------------------------------------
     Pioneer / Volunteer
  -------------------------------------------------------------- */
  Volunteer: {
    tab: "Pioneers",
    prefix: "TIS-OPX-",
    application_type: "pioneer",

    fields: [
      "full_name",
      "email",
      "contact_number",
      "whatsapp_number",
      "city",
      "nationality",
      "university",
      "department_of_study",
      "education_level",
      "gender",
      "referral_source",
      "primary_impact_zone",
      "impact_zones",
      "open_to_other_roles",
      "event_roles",
      "media_design_skills",
      "tech_skills",
      "outreach_skills",
      "education_project_skills",
      "research_policy_roles",
      "operations_roles",
      "languages_known",
      "primary_language",
      "language_proficiency",
      "skills",
      "social_energy",
      "planning_style",
      "visibility_preference",
      "work_preference",
      "commitment_duration",
      "hours_per_week",
      "previous_volunteering",
      "previous_volunteering_experience",
      "portfolio_links",
      "fun_tags",
      "consent_commitment",
      "consent_data_storage",
      "consent_updates"
    ]
  },

  /* --------------------------------------------------------------
     Partner / Sponsor
  -------------------------------------------------------------- */
  partner: {
    tab: "Partners",
    prefix: "TIS-PT-",
    application_type: "partner",

    fields: [
      "org_name",
      "org_type",
      "contact_name",
      "role_title",
      "contact_email",
      "contact_phone",
      "website",
      "contribution_types",
      "fin_budget",
      "fin_visibility",
      "fin_visibility_other",
      "event_types",
      "event_involvement",
      "mentor_roles",
      "mentor_topics",
      "intern_types",
      "intern_fields",
      "intern_positions",
      "resource_support",
      "strategic_idea",
      "audiences",
      "audience_fields",
      "collab_vision",
      "why_tisya",
      "prior_partnership",
      "prior_description",
      "additional_details",
      "consent"
    ]
  },

  /* --------------------------------------------------------------
     Ambassador
  -------------------------------------------------------------- */
  Ambassador: {
    tab: "Ambassadors",
    prefix: "AMB-X",
    application_type: "ambassador",

    fields: [
      "ambassador_type",
      "full_name",
      "email",
      "phone",
      "country",
      "city",
      "institution",
      "linkedin",
      "previous_involvement",
      "involvement_details",
      "reach_network",
      "presence",
      "why_ambassador",
      "experience",
      "consent_commitment",
      "consent"
    ]
  }

};


/* ================================================================
   MAIN POST ENTRY POINT (WEBHOOK / DIRECT INTAKE)
================================================================ */

function doPost(e) {

  try {

    /* ------------------------------------------------------------
       1. Parse incoming JSON
    ------------------------------------------------------------ */

    var body;

    try {

      body = JSON.parse(e.postData.contents);

    } catch (parseErr) {

      return respond({
        success: false,
        error: "Invalid JSON body."
      });

    }


    /* ------------------------------------------------------------
       2. Normalize Form Type
    ------------------------------------------------------------ */

    var rawFormType = body.formType || body.form_type;

    if (!rawFormType) {

      return respond({
        success: false,
        error: "Missing required 'formType' property."
      });

    }

    var formKey = resolveFormKey(rawFormType);

    if (!formKey || !FORM_CONFIG[formKey]) {

      return respond({
        success: false,
        error:
          'Unknown formType: "' +
          rawFormType +
          '". Expected one of: ' +
          Object.keys(FORM_CONFIG).join(", ")
      });

    }

    var cfg = FORM_CONFIG[formKey];
    var data = body.data || {};


    /* ------------------------------------------------------------
       3. Resolve Application ID and Metadata
    ------------------------------------------------------------ */

    var appId =
      body.app_id ||
      body.originalApplicationId ||
      body.original_application_id ||
      data.app_id ||
      generateAppId(formKey, data);

    var supabaseAppId =
      body.supabase_application_id ||
      body.supabaseId ||
      data.supabase_application_id ||
      "";

    var appStatus =
      body.application_status ||
      body.status ||
      "submitted";

    var tisyaId =
      body.tisya_id ||
      data.tisya_id ||
      "";

    var submittedAt =
      body.submitted_at ||
      Utilities.formatDate(
        new Date(),
        "GMT+3",
        "yyyy-MM-dd HH:mm:ss"
      );


    /* ------------------------------------------------------------
       4. Get/create destination sheet with sync columns
    ------------------------------------------------------------ */

    var sheet = getOrCreateSheet(cfg.tab, cfg.fields);
    ensureSupabaseSyncColumns(sheet);


    /* ------------------------------------------------------------
       5. Idempotent Upsert (Update if exists, Append if new)
    ------------------------------------------------------------ */

    var syncMeta = {
      supabase_application_id: supabaseAppId,
      supabase_sync_status: supabaseAppId ? "synced" : "pending",
      application_status: appStatus,
      tisya_id: tisyaId,
      synced_at: Utilities.formatDate(new Date(), "GMT+3", "yyyy-MM-dd HH:mm:ss")
    };

    var upsertResult = upsertApplicationRow(
      sheet,
      cfg,
      appId,
      data,
      submittedAt,
      syncMeta
    );


    /* ------------------------------------------------------------
       6. Email notifications (Applicant confirmation & Admin alert)
    ------------------------------------------------------------ */

    var isNewlyCreated = upsertResult.action === "appended";

    if (isNewlyCreated || body.send_email === true) {

      try {

        sendNotificationEmails(
          formKey,
          cfg,
          data,
          appId,
          submittedAt
        );

      } catch (mailErr) {

        console.error(
          "[" + appId + "] Email notification error: " + String(mailErr)
        );

      }

    }


    /* ------------------------------------------------------------
       7. If Supabase ID was not passed, sync to Supabase now
    ------------------------------------------------------------ */

    if (!supabaseAppId) {

      try {

        var syncRes = syncApplicationToSupabase(
          formKey,
          data,
          appId,
          sheet,
          upsertResult.rowNumber
        );

        if (syncRes.success && syncRes.id) {
          supabaseAppId = syncRes.id;
        }

      } catch (syncErr) {

        console.error(
          "[" + appId + "] Fallback Supabase sync failed: " + String(syncErr)
        );

      }

    }


    /* ------------------------------------------------------------
       8. Return Success
    ------------------------------------------------------------ */

    return respond({
      success: true,
      app_id: appId,
      action: upsertResult.action,
      row: upsertResult.rowNumber,
      supabase_application_id: supabaseAppId,
      supabase_sync_status: supabaseAppId ? "synced" : "pending"
    });


  } catch (err) {

    console.error("doPost critical error: " + String(err.message || err));

    return respond({
      success: false,
      error: String(err.message || err)
    });

  }

}


/* ================================================================
   GET HEALTH CHECK & STATUS
================================================================ */

function doGet(e) {

  var params = (e && e.parameter) || {};
  var action = params.action || "";

  if (action === "sync") {

    var syncReport = syncFromSupabase();

    return respond({
      success: true,
      report: syncReport
    });

  }

  return respond({
    success: true,
    message: "TİSYA Unified Intake & Mirror API is active.",
    timestamp: new Date().toISOString()
  });

}


/* ================================================================
   IDEMPOTENT ROW UPSERT LOGIC
================================================================ */

/**
 * Searches the target sheet for existing row by app_id.
 * If found: updates fields and sync metadata.
 * If not found: appends new row.
 * Returns { action: "updated" | "appended", rowNumber: number }
 */
function upsertApplicationRow(
  sheet,
  cfg,
  appId,
  data,
  submittedAt,
  syncMeta
) {

  var lock = LockService.getScriptLock();

  try {

    lock.waitLock(30000);

    var map = getHeaderMap(sheet);
    var appIdCol = map["app_id"];

    if (!appIdCol) {
      throw new Error("Missing 'app_id' column in sheet: " + cfg.tab);
    }

    var lastRow = sheet.getLastRow();
    var existingRowNumber = -1;

    if (lastRow >= 2) {

      var idRange = sheet.getRange(2, appIdCol, lastRow - 1, 1).getValues();

      for (var i = 0; i < idRange.length; i++) {

        if (String(idRange[i][0]).trim() === String(appId).trim()) {

          existingRowNumber = i + 2;
          break;

        }

      }

    }

    // --- CASE A: UPDATE EXISTING ROW ---
    if (existingRowNumber !== -1) {

      // Update data fields if present
      cfg.fields.forEach(function(field) {

        if (map[field] && data[field] !== undefined && data[field] !== null) {

          sheet
            .getRange(existingRowNumber, map[field])
            .setValue(formatValue(data[field]));

        }

      });

      // Update sync metadata
      if (syncMeta) {

        if (syncMeta.supabase_application_id && map["supabase_application_id"]) {
          sheet.getRange(existingRowNumber, map["supabase_application_id"]).setValue(syncMeta.supabase_application_id);
        }

        if (syncMeta.supabase_sync_status && map["supabase_sync_status"]) {
          sheet.getRange(existingRowNumber, map["supabase_sync_status"]).setValue(syncMeta.supabase_sync_status);
        }

        if (syncMeta.application_status && map["application_status"]) {
          sheet.getRange(existingRowNumber, map["application_status"]).setValue(syncMeta.application_status);
        }

        if (syncMeta.tisya_id && map["tisya_id"]) {
          sheet.getRange(existingRowNumber, map["tisya_id"]).setValue(syncMeta.tisya_id);
        }

        if (syncMeta.synced_at && map["synced_at"]) {
          sheet.getRange(existingRowNumber, map["synced_at"]).setValue(syncMeta.synced_at);
        }

      }

      return {
        action: "updated",
        rowNumber: existingRowNumber
      };

    }

    // --- CASE B: APPEND NEW ROW ---
    var rowValues = [
      submittedAt || Utilities.formatDate(new Date(), "GMT+3", "yyyy-MM-dd HH:mm:ss"),
      appId
    ];

    cfg.fields.forEach(function(field) {
      rowValues.push(formatValue(data[field]));
    });

    // Append 5 sync columns
    rowValues.push(syncMeta.supabase_application_id || "");
    rowValues.push(syncMeta.supabase_sync_status || "synced");
    rowValues.push(syncMeta.application_status || "submitted");
    rowValues.push(syncMeta.tisya_id || "");
    rowValues.push(syncMeta.synced_at || Utilities.formatDate(new Date(), "GMT+3", "yyyy-MM-dd HH:mm:ss"));

    sheet.appendRow(rowValues);

    return {
      action: "appended",
      rowNumber: sheet.getLastRow()
    };

  } finally {

    try {
      lock.releaseLock();
    } catch (_) {}

  }

}


/* ================================================================
   PULL SYNCHRONIZATION FROM SUPABASE
================================================================ */

/**
 * Reads newly created or updated applications from Supabase,
 * and updates or appends them to the corresponding Google Sheet tabs.
 * Can be run manually from menu or automatically on a timer trigger.
 */
function syncFromSupabase() {

  var config = getSupabaseConfig();
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var url = config.url + "/rest/v1/applications?select=*&order=created_at.asc";

  var headers = {
    "apikey": config.key,
    "Authorization": "Bearer " + config.key,
    "Content-Type": "application/json"
  };

  var response = UrlFetchApp.fetch(url, {
    method: "get",
    headers: headers,
    muteHttpExceptions: true
  });

  var code = response.getResponseCode();

  if (code < 200 || code >= 300) {

    throw new Error("Supabase fetch failed: HTTP " + code + " - " + response.getContentText());

  }

  var applications = JSON.parse(response.getContentText()) || [];
  var report = {
    total: applications.length,
    updated: 0,
    appended: 0,
    errors: 0
  };

  applications.forEach(function(app) {

    try {

      var formKey = mapTypeToFormKey(app.application_type);

      if (!formKey || !FORM_CONFIG[formKey]) {
        return;
      }

      var cfg = FORM_CONFIG[formKey];
      var sheet = getOrCreateSheet(cfg.tab, cfg.fields);
      ensureSupabaseSyncColumns(sheet);

      var appId = app.original_application_id;

      if (!appId) {
        return;
      }

      var data = app.payload || {};

      var submittedAt = app.submitted_at
        ? Utilities.formatDate(new Date(app.submitted_at), "GMT+3", "yyyy-MM-dd HH:mm:ss")
        : Utilities.formatDate(new Date(app.created_at), "GMT+3", "yyyy-MM-dd HH:mm:ss");

      var syncMeta = {
        supabase_application_id: app.id,
        supabase_sync_status: "synced",
        application_status: app.status || "submitted",
        tisya_id: "",
        synced_at: Utilities.formatDate(new Date(), "GMT+3", "yyyy-MM-dd HH:mm:ss")
      };

      var res = upsertApplicationRow(
        sheet,
        cfg,
        appId,
        data,
        submittedAt,
        syncMeta
      );

      if (res.action === "updated") {
        report.updated++;
      } else {
        report.appended++;
      }

      // Update sheet_sync_status on Supabase
      try {

        UrlFetchApp.fetch(config.url + "/rest/v1/rpc/mark_application_sheet_synced", {
          method: "post",
          headers: headers,
          payload: JSON.stringify({
            p_application_id: appId,
            p_synced_at: new Date().toISOString()
          }),
          muteHttpExceptions: true
        });

      } catch (_) {}

    } catch (itemErr) {

      console.error("Error syncing app " + (app.id || "") + ": " + String(itemErr));
      report.errors++;

    }

  });

  return report;

}


/* ================================================================
   ONE-TIME HISTORICAL SHEET MIGRATION TO SUPABASE
================================================================ */

/**
 * Scans all rows in Pathfinders, Pioneers, Partners, Ambassadors.
 * Any row without a supabase_application_id is safely migrated to Supabase.
 * Uses originalApplicationId to guarantee zero duplicate records.
 */
function migrateHistoricalSheetRecordsToSupabase() {

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var config = getSupabaseConfig();
  var totalMigrated = 0;
  var totalSkipped = 0;

  Object.keys(FORM_CONFIG).forEach(function(formKey) {

    var cfg = FORM_CONFIG[formKey];
    var sheet = ss.getSheetByName(cfg.tab);

    if (!sheet || sheet.getLastRow() < 2) {
      return;
    }

    ensureSupabaseSyncColumns(sheet);
    var map = getHeaderMap(sheet);

    if (!map["app_id"]) {
      return;
    }

    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    var values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

    values.forEach(function(row, index) {

      var rowNumber = index + 2;
      var appId = String(row[map["app_id"] - 1] || "").trim();
      var syncId = String(row[map["supabase_application_id"] - 1] || "").trim();

      if (!appId) {
        return;
      }

      // If already has supabase UUID and is marked synced, skip
      if (syncId && row[map["supabase_sync_status"] - 1] === "synced") {
        totalSkipped++;
        return;
      }

      // Reconstruct form payload
      var data = {};
      cfg.fields.forEach(function(field) {
        if (map[field]) {
          data[field] = row[map[field] - 1];
        }
      });

      var submittedAtRaw = row[map["submitted_at"] - 1];
      var submittedAtIso = null;

      if (submittedAtRaw) {
        try {
          submittedAtIso = new Date(submittedAtRaw).toISOString();
        } catch (_) {}
      }

      var syncResult = syncApplicationToSupabase(
        formKey,
        data,
        appId,
        sheet,
        rowNumber,
        submittedAtIso
      );

      if (syncResult.success) {
        totalMigrated++;
      }

    });

  });

  return {
    migrated: totalMigrated,
    skipped: totalSkipped
  };

}


/* ================================================================
   SUPABASE CLIENT HELPER
================================================================ */

function getSupabaseConfig() {

  var props = PropertiesService.getScriptProperties();

  var url =
    props.getProperty("SUPABASE_URL") ||
    props.getProperty("SUPABASE_INGEST_URL") ||
    SUPABASE_DEFAULT_URL;

  // Accept service role key or ingest secret or anon key
  var key =
    props.getProperty("SUPABASE_SERVICE_ROLE_KEY") ||
    props.getProperty("SUPABASE_ANON_KEY") ||
    props.getProperty("SUPABASE_INGEST_SECRET");

  if (!key) {

    // Fallback to public anon key if no privileged key is yet set in Script Properties
    key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkc3hnamRncWRpZmZoYmVhdmFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzODI0ODUsImV4cCI6MjEwMzk1ODQ4NX0.3GLbTEHredkCHYIkXMMVBjaX2Y0ROU4yIcRFTTTPFwA";

  }

  // Clean trailing slashes
  url = url.replace(/\/+$/, "");

  return {
    url: url,
    key: key
  };

}

/**
 * Pushes application to Supabase Edge Function ingest-application.
 * Safe & idempotent.
 */
function syncApplicationToSupabase(
  formType,
  data,
  appId,
  sheet,
  rowNumber,
  submittedAt
) {

  var config = getSupabaseConfig();
  var ingestUrl = config.url + "/functions/v1/ingest-application";

  var applicant = getApplicantIdentity(formType, data);

  var payload = {
    formType: formType,
    originalApplicationId: appId,
    submittedAt: submittedAt || new Date().toISOString(),
    applicant: {
      fullName: applicant.name,
      email: applicant.email,
      phone: applicant.phone || null
    },
    data: data,
    source: "google_sheets_mirror"
  };

  var lastError = "";

  for (var attempt = 1; attempt <= 2; attempt++) {

    try {

      var response = UrlFetchApp.fetch(ingestUrl, {
        method: "post",
        contentType: "application/json",
        headers: {
          "x-ingest-secret": config.key,
          "Authorization": "Bearer " + config.key
        },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      });

      var statusCode = response.getResponseCode();
      var responseText = response.getContentText();
      var responseBody = {};

      try {
        responseBody = JSON.parse(responseText);
      } catch (_) {}

      var returnId = responseBody.id || responseBody.applicationId;

      if (statusCode >= 200 && statusCode < 300 && returnId) {

        setCellByHeader(sheet, rowNumber, "supabase_application_id", returnId);
        setCellByHeader(sheet, rowNumber, "supabase_sync_status", "synced");
        setCellByHeader(sheet, rowNumber, "application_status", responseBody.status || "submitted");
        setCellByHeader(
          sheet,
          rowNumber,
          "synced_at",
          Utilities.formatDate(new Date(), "GMT+3", "yyyy-MM-dd HH:mm:ss")
        );

        return {
          success: true,
          id: returnId
        };

      }

      lastError = "HTTP " + statusCode + ": " + (responseBody.error || responseText.substring(0, 300));

    } catch (fetchErr) {

      lastError = String(fetchErr.message || fetchErr);

    }

    if (attempt < 2) {
      Utilities.sleep(1000);
    }

  }

  // Mark error on row
  try {
    setCellByHeader(sheet, rowNumber, "supabase_sync_status", "error");
    setCellByHeader(
      sheet,
      rowNumber,
      "synced_at",
      Utilities.formatDate(new Date(), "GMT+3", "yyyy-MM-dd HH:mm:ss")
    );

    var map = getHeaderMap(sheet);
    if (map["supabase_sync_status"]) {
      sheet.getRange(rowNumber, map["supabase_sync_status"]).setNote(lastError);
    }
  } catch (_) {}

  return {
    success: false,
    error: lastError
  };

}


/* ================================================================
   UI MENU & AUTOMATED TRIGGERS
================================================================ */

/**
 * Adds custom admin menu when the Google Sheet is opened.
 */
function onOpen() {

  var ui = SpreadsheetApp.getUi();

  ui.createMenu("TİSYA Management")
    .addItem("Sync Latest from Supabase", "menuSyncFromSupabase")
    .addItem("Migrate Unsynced Records to Supabase", "menuMigrateHistorical")
    .addSeparator()
    .addItem("Install Automated Hourly Sync Trigger", "installSupabaseSyncTrigger")
    .addToUi();

}

function menuSyncFromSupabase() {

  var ui = SpreadsheetApp.getUi();

  try {

    var report = syncFromSupabase();

    ui.alert(
      "Sync Complete",
      "Processed: " + report.total + "\n" +
      "Updated: " + report.updated + "\n" +
      "Appended: " + report.appended + "\n" +
      "Errors: " + report.errors,
      ui.ButtonSet.OK
    );

  } catch (err) {

    ui.alert("Sync Error", String(err.message || err), ui.ButtonSet.OK);

  }

}

function menuMigrateHistorical() {

  var ui = SpreadsheetApp.getUi();

  try {

    var report = migrateHistoricalSheetRecordsToSupabase();

    ui.alert(
      "Migration Complete",
      "Successfully Migrated to Supabase: " + report.migrated + "\n" +
      "Already Synced (Skipped): " + report.skipped,
      ui.ButtonSet.OK
    );

  } catch (err) {

    ui.alert("Migration Error", String(err.message || err), ui.ButtonSet.OK);

  }

}

/**
 * Installs hourly mirror sync trigger.
 */
function installSupabaseSyncTrigger() {

  var handler = "syncFromSupabase";
  var triggers = ScriptApp.getProjectTriggers();

  for (var i = 0; i < triggers.length; i++) {

    if (triggers[i].getHandlerFunction() === handler) {
      return "Supabase sync trigger is already active.";
    }

  }

  ScriptApp.newTrigger(handler)
    .timeBased()
    .everyHours(1)
    .create();

  return "Supabase sync trigger installed (runs hourly).";

}


/* ================================================================
   EMAIL NOTIFICATIONS
================================================================ */

function getApplicantIdentity(formType, data) {

  if (formType === "partner") {

    return {
      name: data.contact_name || data.org_name || "Applicant",
      email: data.contact_email || data.email || "",
      phone: data.contact_phone || data.phone || ""
    };

  }

  return {
    name: data.full_name || "Applicant",
    email: data.email || "",
    phone: data.contact_number || data.whatsapp_number || data.phone || ""
  };

}

function sendNotificationEmails(formType, cfg, data, appId, submittedAt) {

  var applicant = getApplicantIdentity(formType, data);

  // 1. Applicant confirmation email
  if (applicant.email) {

    try {

      MailApp.sendEmail({
        to: applicant.email,
        subject: "TİSYA Application Received — " + appId,
        htmlBody: buildApplicantEmailHtml(applicant.name, appId),
        name: SENDER_NAME
      });

    } catch (err) {

      console.error("[" + appId + "] Applicant email failed: " + String(err));

    }

  }

  // 2. Admin notification email
  if (ADMIN_EMAIL && ADMIN_EMAIL !== "YOUR_EMAIL_HERE") {

    try {

      MailApp.sendEmail({
        to: ADMIN_EMAIL,
        subject: "New TİSYA Application — " + appId,
        htmlBody: buildAdminEmailHtml(formType, cfg, data, appId, submittedAt, applicant),
        name: SENDER_NAME
      });

    } catch (err) {

      console.error("[" + appId + "] Admin email failed: " + String(err));

    }

  }

}

function buildApplicantEmailHtml(name, appId) {

  return "" +
  '<div style="margin:0;padding:24px;background:#f4f4f7;font-family:Arial,Helvetica,sans-serif;">' +
    '<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e6e6ef;">' +
      '<div style="background:#1a1a2e;padding:22px 28px;">' +
        '<div style="color:#ffffff;font-size:20px;font-weight:bold;letter-spacing:1px;">T\u0130SYA</div>' +
        '<div style="color:#b8b8d0;font-size:12px;margin-top:2px;">T\u00fcrkiye International Students Youth Alliance</div>' +
      '</div>' +
      '<div style="padding:28px;color:#2b2b3a;font-size:15px;line-height:1.65;">' +
        '<p style="margin:0 0 14px;">Dear ' + escapeHtml(name) + ',</p>' +
        '<p style="margin:0 0 14px;">Thank you for submitting your application to T\u0130SYA. We are pleased to confirm that your application has been <strong>successfully received</strong>.</p>' +
        '<div style="background:#f4f4fb;border:1px solid #e0e0f0;border-radius:8px;padding:14px 18px;margin:0 0 16px;">' +
          '<div style="font-size:12px;color:#6b6b85;text-transform:uppercase;letter-spacing:1px;">Application ID</div>' +
          '<div style="font-size:20px;font-weight:bold;color:#1a1a2e;margin-top:4px;">' + escapeHtml(appId) + '</div>' +
        '</div>' +
        '<p style="margin:0 0 14px;">Please keep this Application ID for your records and include it in any future communication regarding your application.</p>' +
        '<p style="margin:0 0 6px;"><strong>What happens next</strong></p>' +
        '<p style="margin:0 0 14px;">Your application will now proceed through the T\u0130SYA review process. If you are selected to proceed to the next stage, the T\u0130SYA team will contact you using the information provided in your application.</p>' +
        '<p style="margin:0 0 4px;">Thank you for your interest in T\u0130SYA.</p>' +
        '<p style="margin:0;">Best regards,<br><strong>The T\u0130SYA Team</strong></p>' +
      '</div>' +
      '<div style="background:#f4f4f7;padding:14px 28px;font-size:12px;color:#8a8aa0;text-align:center;">' +
        'This is an automated confirmation. Please do not reply to this email.' +
      '</div>' +
    '</div>' +
  '</div>';

}

function buildAdminEmailHtml(formType, cfg, data, appId, submittedAt, applicant) {

  var rows = "";

  cfg.fields.forEach(function(field) {

    var val = formatValue(data[field]);

    rows +=
      "<tr>" +
        '<td style="padding:6px 10px;border-bottom:1px solid #ececf2;color:#6b6b85;font-size:13px;white-space:nowrap;">' +
          escapeHtml(field) +
        "</td>" +
        '<td style="padding:6px 10px;border-bottom:1px solid #ececf2;color:#2b2b3a;font-size:13px;">' +
          escapeHtml(String(val)) +
        "</td>" +
      "</tr>";

  });

  return "" +
  '<div style="margin:0;padding:24px;background:#f4f4f7;font-family:Arial,Helvetica,sans-serif;">' +
    '<div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e6e6ef;">' +
      '<div style="background:#1a1a2e;padding:18px 28px;color:#ffffff;font-size:16px;font-weight:bold;">New T\u0130SYA Application</div>' +
      '<div style="padding:24px 28px;color:#2b2b3a;font-size:14px;line-height:1.6;">' +
        '<p style="margin:0 0 16px;">A new application has been successfully recorded.</p>' +
        '<table style="border-collapse:collapse;margin:0 0 18px;">' +
          '<tr><td style="padding:3px 12px 3px 0;color:#6b6b85;">Application ID</td><td style="padding:3px 0;font-weight:bold;">' + escapeHtml(appId) + '</td></tr>' +
          '<tr><td style="padding:3px 12px 3px 0;color:#6b6b85;">Form</td><td style="padding:3px 0;">' + escapeHtml(cfg.tab) + ' (' + escapeHtml(formType) + ')</td></tr>' +
          '<tr><td style="padding:3px 12px 3px 0;color:#6b6b85;">Applicant</td><td style="padding:3px 0;">' + escapeHtml(applicant.name) + '</td></tr>' +
          '<tr><td style="padding:3px 12px 3px 0;color:#6b6b85;">Email</td><td style="padding:3px 0;">' + escapeHtml(applicant.email) + '</td></tr>' +
          '<tr><td style="padding:3px 12px 3px 0;color:#6b6b85;">Submitted</td><td style="padding:3px 0;">' + escapeHtml(submittedAt) + ' (GMT+3)</td></tr>' +
        '</table>' +
        '<div style="font-weight:bold;margin:0 0 8px;">Submitted details</div>' +
        '<table style="border-collapse:collapse;width:100%;border:1px solid #ececf2;border-radius:6px;">' +
          rows +
        '</table>' +
      '</div>' +
    '</div>' +
  '</div>';

}

function escapeHtml(s) {

  if (s === null || s === undefined) return "";

  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

}


/* ================================================================
   SHEET HELPERS
================================================================ */

function getOrCreateSheet(tabName, fields) {

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(tabName);

  if (!sheet) {

    sheet = ss.insertSheet(tabName);

    var headers = ["submitted_at", "app_id"].concat(fields).concat(SUPABASE_SYNC_COLUMNS);

    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange
      .setFontWeight("bold")
      .setBackground("#1a1a2e")
      .setFontColor("#ffffff")
      .setHorizontalAlignment("center");

    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 160);
    sheet.setColumnWidth(2, 150);

  } else {

    ensureSupabaseSyncColumns(sheet);

  }

  return sheet;

}

function ensureSupabaseSyncColumns(sheet) {

  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var headerValues = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var existing = {};

  headerValues.forEach(function(header, index) {
    if (header !== "" && header !== null && header !== undefined) {
      existing[String(header).trim()] = index + 1;
    }
  });

  SUPABASE_SYNC_COLUMNS.forEach(function(colName) {

    if (!existing[colName]) {

      var newCol = sheet.getLastColumn() + 1;
      var cell = sheet.getRange(1, newCol);
      cell.setValue(colName)
        .setFontWeight("bold")
        .setBackground("#1a1a2e")
        .setFontColor("#ffffff")
        .setHorizontalAlignment("center");

      existing[colName] = newCol;

    }

  });

  return existing;

}

function getHeaderMap(sheet) {

  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var map = {};

  headers.forEach(function(h, idx) {
    if (h !== "" && h !== null && h !== undefined) {
      map[String(h).trim()] = idx + 1;
    }
  });

  return map;

}

function setCellByHeader(sheet, rowNumber, header, value) {

  var map = getHeaderMap(sheet);
  if (!map[header]) {
    throw new Error("Missing sheet column: " + header);
  }

  sheet.getRange(rowNumber, map[header]).setValue(value);

}

function getCellByHeader(sheet, rowNumber, header) {

  var map = getHeaderMap(sheet);
  if (!map[header]) return "";

  return sheet.getRange(rowNumber, map[header]).getValue();

}

function formatValue(v) {

  if (v === null || v === undefined) return "";
  if (Array.isArray(v)) return v.join(", ");
  if (v === true) return "Yes";
  if (v === false) return "No";
  return v;

}

function respond(obj) {

  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);

}

function resolveFormKey(raw) {

  if (!raw) return null;
  var l = String(raw).trim().toLowerCase();

  if (l === "pathfinder") return "Pathfinder";
  if (l === "volunteer" || l === "pioneer") return "Volunteer";
  if (l === "partner") return "partner";
  if (l === "ambassador") return "Ambassador";

  return null;

}

function mapTypeToFormKey(appType) {

  if (!appType) return null;
  var l = String(appType).trim().toLowerCase();

  if (l === "pathfinder") return "Pathfinder";
  if (l === "pioneer" || l === "volunteer") return "Volunteer";
  if (l === "partner") return "partner";
  if (l === "ambassador") return "Ambassador";

  return null;

}

function getInitials(fullName) {

  if (!fullName || typeof fullName !== "string") return "XX";

  var names = fullName.trim().split(/\s+/);
  if (names.length === 1) {
    var n = names[0];
    return n.length >= 2 ? n.substring(0, 2).toUpperCase() : (n + "X").toUpperCase();
  }

  return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();

}

function generateAppId(formType, data) {

  var rand = Math.floor(Math.random() * 9000 + 1000);

  switch (formType) {
    case "Pathfinder":
      return "PF" + getInitials(data.full_name) + "-" + rand;
    case "Volunteer":
      return "TIS-OPX-" + rand;
    case "partner":
      return "TIS-PT-" + rand;
    case "Ambassador":
      return "AMB-X" + rand;
    default:
      return "ID-" + rand;
  }

}
