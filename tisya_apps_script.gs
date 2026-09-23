/**
 * ================================================================
 *  TISYA Unified Intake System — Google Apps Script
 *  Handles: Pathfinder | Pioneer | Partner | Ambassador
 *
 *  Deploy as: Web App
 *    • Execute as: Me
 *    • Who has access: Anyone
 * ================================================================
 */

/* ================================================================
   SHEET CONFIGURATION
   Each entry maps a formType key to:
     tab    → exact Google Sheet tab name
     prefix → app_id prefix
     fields → ordered array of data keys sent by the frontend
   The first row of every sheet will be: submitted_at | app_id | <fields...>

   IMPORTANT: The formType keys here MUST exactly match the `formType`
   value sent by the frontend in submitToAppsScript(formType, fields).
     Pathfinder  → PathfinderForm.tsx sends "Pathfinder"
     Volunteer   → PioneerForm.tsx sends "Volunteer"
     partner     → PartnerSponsorForm.tsx sends "partner"
     Ambassador  → AmbassadorForm.tsx sends "Ambassador"
================================================================ */
const FORM_CONFIG = {

  // ── Pathfinder ───────────────────────────────────────────────
  Pathfinder: {
    tab: 'Pathfinders',
    prefix: 'PF',
    fields: [
      'source_form_version',
      'full_name',
      'email',
      'contact_number',
      'city',
      'nationality',
      'university',
      'department_of_study',
      'interests',
      'attention_reason',
      'social_level',
      'acquisition_channel',
      'consent_data_storage',
      'consent_updates'
    ]
  },

  // ── Pioneer (Volunteer) ───────────────────────────────────
  Volunteer: {
    tab: 'Pioneers',
    prefix: 'OP',
    fields: [
      'full_name',
      'email',
      'contact_number',
      'whatsapp_number',
      'city',
      'nationality',
      'university',
      'department_of_study',
      'education_level',
      'gender',
      'referral_source',
      'primary_impact_zone',
      'impact_zones',
      'open_to_other_roles',
      'event_roles',
      'media_design_skills',
      'tech_skills',
      'outreach_skills',
      'education_project_skills',
      'research_policy_roles',
      'operations_roles',
      'languages_known',
      'primary_language',
      'language_proficiency',
      'skills',
      'social_energy',
      'planning_style',
      'visibility_preference',
      'work_preference',
      'commitment_duration',
      'hours_per_week',
      'previous_volunteering',
      'previous_volunteering_experience',
      'portfolio_links',
      'fun_tags',
      'consent_commitment',
      'consent_data_storage',
      'consent_updates'
    ]
  },

  // ── Partner / Sponsor ─────────────────────────────────────────
  // NOTE: key is lowercase "partner" — must match frontend call exactly
  partner: {
    tab: 'Partners',
    prefix: 'PT',
    fields: [
      'org_name',
      'org_type',
      'contact_name',
      'role_title',
      'contact_email',
      'contact_phone',
      'website',
      'contribution_types',
      'fin_budget',
      'fin_visibility',
      'fin_visibility_other',
      'event_types',
      'event_involvement',
      'mentor_roles',
      'mentor_topics',
      'intern_types',
      'intern_fields',
      'intern_positions',
      'resource_support',
      'strategic_idea',
      'audiences',
      'audience_fields',
      'collab_vision',
      'why_tisya',
      'prior_partnership',
      'prior_description',
      'additional_details',
      'consent'
    ]
  },

  // ── Ambassador ────────────────────────────────────────────────
  Ambassador: {
    tab: 'Ambassadors',
    prefix: 'AM',
    fields: [
      'ambassador_type',
      'full_name',
      'email',
      'phone',
      'country',
      'city',
      'institution',
      'linkedin',
      'previous_involvement',
      'involvement_details',
      'reach_network',
      'presence',
      'why_ambassador',
      'experience',
      'consent_commitment',
      'consent'
    ]
  }

};

/* ================================================================
   MAIN ENTRY POINT
================================================================ */
function doPost(e) {
  try {
    // ── 1. Parse incoming JSON ───────────────────────────────────
    var body;
    try {
      body = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return respond({ success: false, error: 'Invalid JSON body.' });
    }

    // ── 1.5 Handle Status Synchronization from Supabase ─────────
    if (body.action === "sync_status" || body.action === "update_application") {
      return handleStatusSync(body);
    }

    var formType = body.formType;
    var data     = body.data || {};

    // ── 2. Validate formType ─────────────────────────────────────
    if (!formType || !FORM_CONFIG[formType]) {
      return respond({
        success: false,
        error: 'Unknown formType: "' + formType + '". Expected one of: ' + Object.keys(FORM_CONFIG).join(', ')
      });
    }

    var cfg = FORM_CONFIG[formType];

    // ── 2.5 Strict Data Validation ───────────────────────────────
    var validationError = validateDataTypes(cfg.fields, data);
    if (validationError) {
      return respond({ success: false, error: validationError });
    }

    // ── 3. Get or create the destination sheet ───────────────────
    var sheet = getOrCreateSheet(cfg.tab, cfg.fields);

    // ── 4. Build the row ─────────────────────────────────────────
    var app_id       = generateAppId(formType, data);
    var submitted_at = Utilities.formatDate(new Date(), 'GMT+3', 'yyyy-MM-dd HH:mm:ss');

    var row = [submitted_at, app_id];
    cfg.fields.forEach(function(field) {
      row.push(formatValue(data[field]));
    });

    // ── 5. Append row ────────────────────────────────────────────
    sheet.appendRow(row);

    // ── 5.5 Forward to Supabase DEV Ingest Endpoint ──────────────
    if (formType === 'Pathfinder' || formType === 'Volunteer') {
      try {
        var supabaseUrl = 'https://edsxgjdgqdiffhbeavah.supabase.co/functions/v1/ingest-application';
        var secret = 'tisya_dev_ingest_sec_8849b2c3a5e142f7908b61c947d3e521';
        var ingestPayload = {
          formType: formType,
          originalApplicationId: app_id,
          submittedAt: new Date().toISOString(),
          applicant: {
            fullName: data.full_name || '',
            email: data.email || '',
            phone: data.contact_number || data.whatsapp_number || ''
          },
          data: data
        };

        var forwardRes = UrlFetchApp.fetch(supabaseUrl, {
          method: 'post',
          contentType: 'application/json',
          headers: { 'x-ingest-secret': secret },
          payload: JSON.stringify(ingestPayload),
          muteHttpExceptions: true
        });

        var fText = forwardRes.getContentText();
        var fJson = JSON.parse(fText);
        if (fJson && fJson.applicationId) {
          updateRowSyncColumns(sheet, sheet.getLastRow(), {
            supabase_application_id: fJson.applicationId,
            supabase_sync_status: fJson.created ? 'synced' : 'already_synced',
            application_status: fJson.status || 'submitted',
            tisya_id: '',
            synced_at: submitted_at
          });
        }
      } catch (fErr) {
        console.warn('Supabase forward warning: ' + fErr);
      }
    }

    // ── 6. Return success ─────────────────────────────────────────
    return respond({ success: true, app_id: app_id });

  } catch (err) {
    return respond({ success: false, error: String(err.message || err) });
  }
}

/**
 * Handles incoming status updates from Supabase approval/rejection.
 */
function handleStatusSync(body) {
  var targetAppId = body.originalApplicationId;
  var targetSupabaseId = body.supabaseApplicationId;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tabs = ['Pathfinders', 'Pioneers'];

  for (var t = 0; t < tabs.length; t++) {
    var sheet = ss.getSheetByName(tabs[t]);
    if (!sheet) continue;

    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastRow < 2) continue;

    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var colMap = {};
    for (var h = 0; h < headers.length; h++) {
      colMap[headers[h]] = h + 1;
    }

    var appIdCol = colMap['app_id'] || 2;
    var supabaseIdCol = colMap['supabase_application_id'];

    var idRange = sheet.getRange(2, appIdCol, lastRow - 1, 1).getValues();
    var supabaseIdRange = supabaseIdCol ? sheet.getRange(2, supabaseIdCol, lastRow - 1, 1).getValues() : null;

    for (var r = 0; r < idRange.length; r++) {
      var rowAppId = String(idRange[r][0] || '').trim();
      var rowSupabaseId = supabaseIdRange ? String(supabaseIdRange[r][0] || '').trim() : '';

      if ((targetAppId && rowAppId === targetAppId) || (targetSupabaseId && rowSupabaseId === targetSupabaseId)) {
        var rowIndex = r + 2;

        if (colMap['application_status']) {
          sheet.getRange(rowIndex, colMap['application_status']).setValue(body.status || 'submitted');
        }
        if (colMap['tisya_id']) {
          sheet.getRange(rowIndex, colMap['tisya_id']).setValue(body.tisyaId || '');
        }
        if (colMap['supabase_sync_status']) {
          sheet.getRange(rowIndex, colMap['supabase_sync_status']).setValue('synced');
        }
        if (colMap['synced_at']) {
          sheet.getRange(rowIndex, colMap['synced_at']).setValue(body.syncedAt || Utilities.formatDate(new Date(), 'GMT+3', 'yyyy-MM-dd HH:mm:ss'));
        }

        return respond({
          success: true,
          message: 'Sheet updated successfully',
          tab: tabs[t],
          row: rowIndex,
          status: body.status,
          tisya_id: body.tisyaId
        });
      }
    }
  }

  return respond({
    success: false,
    error: 'Application ID not found in sheet tabs: ' + (targetAppId || targetSupabaseId)
  });
}

function updateRowSyncColumns(sheet, rowIndex, values) {
  try {
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var colMap = {};
    for (var i = 0; i < headers.length; i++) {
      colMap[headers[i]] = i + 1;
    }
    for (var key in values) {
      if (colMap[key]) {
        sheet.getRange(rowIndex, colMap[key]).setValue(values[key]);
      }
    }
  } catch (e) {
    console.warn('updateRowSyncColumns error: ' + e);
  }
}

/* Health-check for GET requests */
function doGet() {
  return respond({ success: true, message: 'TISYA Intake API is live.' });
}

/* ================================================================
   HELPERS
================================================================ */

/**
 * Returns the sheet by name, creating it with headers if it doesn't exist.
 * Headers: submitted_at | app_id | <field1> | <field2> | ...
 */
function getOrCreateSheet(tab_name, fields) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(tab_name);

  if (!sheet) {
    sheet = ss.insertSheet(tab_name);

    // Build header row — all snake_case to match sheet column headers
    var headers = ['submitted_at', 'app_id'].concat(fields);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

    // Style the header row
    var header_range = sheet.getRange(1, 1, 1, headers.length);
    header_range.setFontWeight('bold');
    header_range.setBackground('#1a1a2e');
    header_range.setFontColor('#ffffff');
    header_range.setHorizontalAlignment('center');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 160); // submitted_at
    sheet.setColumnWidth(2, 150); // app_id
  }

  return sheet;
}

/**
 * Extracts initials from a full name.
 */
function getInitials(fullName) {
  if (!fullName || typeof fullName !== 'string') return 'XX';
  var names = fullName.trim().split(/\s+/);
  if (names.length === 1) {
    var name = names[0];
    return name.length >= 2 ? name.substring(0, 2).toUpperCase() : (name + 'X').toUpperCase();
  }
  var first = names[0];
  var last = names[names.length - 1];
  return (first.charAt(0) + last.charAt(0)).toUpperCase();
}

/**
 * Generates a unique application ID based on form type.
 */
function generateAppId(formType, data) {
  var rand = Math.floor(Math.random() * 9000 + 1000); // 4-digit number
  
  switch (formType) {
    case 'Pathfinder':
      var initials = getInitials(data.full_name);
      return 'PF' + initials + '-' + rand;
      
    case 'Volunteer':
      return 'TIS-OPX-' + rand;
      
    case 'partner':
      return 'TIS-PT-' + rand;
      
    case 'Ambassador':
      return 'AMB-X' + rand;
      
    default:
      return 'ID-' + rand;
  }
}

/**
 * Formats a field value for Google Sheets:
 *   - Arrays       → joined with ', '
 *   - true/false   → 'Yes' / 'No'
 *   - null/undef   → ''
 *   - Everything else → as-is
 */
function formatValue(v) {
  if (v === null || v === undefined) return '';
  if (Array.isArray(v))             return v.join(', ');
  if (v === true)                   return 'Yes';
  if (v === false)                  return 'No';
  return v;
}

/**
 * Returns a JSON ContentService response.
 */
function respond(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Validates incoming form data.
 * - Checks email fields for valid format.
 * - Ensures required fields are not empty/null/undefined.
 * Type-checking is intentionally NOT done here — JSON.parse already
 * guarantees that booleans, numbers, and arrays arrive as the correct types.
 */
function validateDataTypes(fields, data) {
  var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  for (var i = 0; i < fields.length; i++) {
    var field = fields[i];
    var val = data[field];

    // Email format check
    if (field.indexOf('email') !== -1 && val !== undefined && val !== null && val !== '') {
      if (typeof val !== 'string' || !emailRegex.test(val.trim())) {
        return 'Invalid email format for field: ' + field;
      }
    }
  }

  return null; // All valid
}
