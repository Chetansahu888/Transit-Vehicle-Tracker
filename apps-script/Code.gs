/**
 * =========================================================================
 * TRANSIT VEHICLE TRACKER - UNIVERSAL DYNAMIC BACKEND (Code.gs)
 * =========================================================================
 * 
 * ZERO-MAINTENANCE / NO-REDEPLOY ARCHITECTURE:
 * 1. DYNAMIC TAB DISCOVERY: Automatically detects any firm tabs (PMMPL, RKL, PURAB, or new ones).
 * 2. DYNAMIC HEADER MAPPING: Intelligently identifies columns regardless of order or naming
 *    (e.g. "S No", "Sl.no", "Entry Date", "Created At", "Invoice No", "Vehicle No", etc.)
 * 3. LIVE 2-WAY onEdit TRIGGER: Editing directly in Google Sheets highlights status (#FFFF00)
 *    and auto-updates timestamps in real time.
 * 4. ONE-TIME DEPLOYMENT: Once deployed, you never have to re-deploy or change URLs!
 * 
 * HOW TO UPDATE WITHOUT CHANGING URL (IF EVER NEEDED):
 * Deploy -> Manage deployments -> Click Pencil (Edit) -> Version: "New version" -> Deploy.
 * =========================================================================
 */

// Target Google Drive Folder ID for Invoice PDFs and Images
// URL: https://drive.google.com/drive/u/0/folders/11maQRobfgJOa7b5_75kiuSkv0hQ7CE2w
var ATTACHMENT_FOLDER_ID = "11maQRobfgJOa7b5_75kiuSkv0hQ7CE2w";

// Default tabs & headers matching sheet columns
var DEFAULT_FIRMS = ["PMMPL", "RKL", "PURAB"];
var DEFAULT_HEADERS = [
  "Sl.no",
  "Invoice No.",
  "Vendor Name",
  "Material",
  "Vehicle status",
  "Vehicle no.",
  "Bill Copy",
  "Date Of Entry"
];

var HIGHLIGHT_COLOR = "#FFFF00"; // Yellow highlight for reached rows
var REACHED_STATUSES = ["has reached", "material has reached", "reached"];

/**
 * Handle GET requests
 * - action=list&firm=ALL|PMMPL|RKL|PURAB
 * - action=getByInvoice&invoice=XXX
 * - action=ping (healthcheck)
 */
function doGet(e) {
  try {
    var params = e ? e.parameter : {};
    var action = params.action || "list";

    if (action === "ping") {
      return jsonResponse({ success: true, message: "Transit Vehicle Tracker API is active", time: new Date() });
    }

    // Firm names defined directly by sheet tab names
    if (action === "getFirms") {
      var firms = getAllFirmNames();
      return jsonResponse({ success: true, count: firms.length, firms: firms });
    }

    if (action === "list") {
      var firm = (params.firm || "ALL").toUpperCase();
      var records = fetchRecords(firm);
      var firms = getAllFirmNames();
      return jsonResponse({ success: true, count: records.length, data: records, firms: firms });
    }

    if (action === "getByInvoice") {
      var invoiceNo = params.invoice || "";
      if (!invoiceNo) {
        return jsonResponse({ success: false, error: "Missing invoice parameter" });
      }
      var record = findRecordByInvoice(invoiceNo);
      if (record) {
        return jsonResponse({ success: true, data: record });
      } else {
        return jsonResponse({ success: false, error: "No record found for invoice: " + invoiceNo });
      }
    }

    return jsonResponse({ success: false, error: "Invalid GET action: " + action });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

/**
 * Handle POST requests
 * - action=add
 * - action=update
 * - action=delete
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    // Lock up to 30s to prevent concurrent write collisions
    lock.waitLock(30000);

    var rawPayload = (e && e.postData && e.postData.contents) ? e.postData.contents : "{}";
    var body = JSON.parse(rawPayload);
    var action = body.action || (e && e.parameter ? e.parameter.action : "");

    if (action === "add") {
      var newRecord = addEntry(body);
      return jsonResponse({ success: true, message: "Entry added successfully", data: newRecord });
    }

    if (action === "update") {
      var updatedRecord = updateEntry(body);
      return jsonResponse({ success: true, message: "Entry updated successfully", data: updatedRecord });
    }

    if (action === "delete") {
      var firm = body.firm;
      var slNo = body.slNo;
      if (!firm || slNo === undefined || slNo === null) {
        return jsonResponse({ success: false, error: "Firm and slNo are required for deletion" });
      }
      var deleted = deleteEntry(firm, slNo);
      return jsonResponse({ success: true, message: "Entry deleted successfully", deleted: deleted });
    }

    return jsonResponse({ success: false, error: "Invalid POST action: " + action });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Helper to build JSON ContentService response with proper CORS headers
 */
function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * DYNAMIC FIRM FETCHER FROM "MASTER" SHEET:
 * Scans the "Master" tab for firm names.
 * Canonicalizes names with existing sheet tabs to guarantee exact match.
 */
function getFirmsFromMasterSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  var masterSheet = null;

  // Search case-insensitively for "Master" or "Masters" sheet
  for (var i = 0; i < sheets.length; i++) {
    var name = sheets[i].getName().trim().toLowerCase();
    if (name === "master" || name === "masters") {
      masterSheet = sheets[i];
      break;
    }
  }

  var firms = [];
  var seen = {};

  if (masterSheet) {
    var lastRow = masterSheet.getLastRow();
    var lastCol = masterSheet.getLastColumn() || 1;

    if (lastRow >= 2) {
      var headerRow = masterSheet.getRange(1, 1, 1, lastCol).getValues()[0];
      var firmCol = 1; // Default to Column A

      // Check if any column header says "firm", "company", "unit"
      for (var c = 0; c < headerRow.length; c++) {
        var h = (headerRow[c] || "").toString().trim().toLowerCase();
        if (h.indexOf("firm") !== -1 || h.indexOf("unit") !== -1 || h.indexOf("company") !== -1) {
          firmCol = c + 1;
          break;
        }
      }

      var colValues = masterSheet.getRange(2, firmCol, lastRow - 1, 1).getValues();
      for (var r = 0; r < colValues.length; r++) {
        var rawVal = (colValues[r][0] || "").toString().trim();
        if (!rawVal) continue;

        // Canonicalize with actual tab name if tab exists (e.g. "Purab" -> "PURAB")
        var matchTab = findSheetCaseInsensitive(ss, rawVal);
        var canonical = matchTab ? matchTab.getName() : rawVal;

        if (!seen[canonical.toUpperCase()]) {
          seen[canonical.toUpperCase()] = true;
          firms.push(canonical);
        }
      }
    }
  }

  // If master sheet gave firms, return them!
  if (firms.length > 0) {
    return firms;
  }

  // Fallback: discover firm tabs directly from spreadsheet tabs
  return getAllFirmNames();
}

/**
 * CASE-INSENSITIVE SHEET FINDER:
 * Solves Google Apps Script case-sensitivity issues (e.g. "Purab" vs "PURAB").
 */
function findSheetCaseInsensitive(ss, name) {
  if (!name) return null;
  var target = name.toString().trim().toLowerCase();
  var sheets = ss.getSheets();

  // 1. Direct exact match
  var direct = ss.getSheetByName(name.toString().trim());
  if (direct) return direct;

  // 2. Case-insensitive exact match
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getName().trim().toLowerCase() === target) {
      return sheets[i];
    }
  }

  // 3. Substring / loose match (ignore helper tabs)
  for (var j = 0; j < sheets.length; j++) {
    var sName = sheets[j].getName().trim().toLowerCase();
    if (sName === "master" || sName === "masters" || sName === "settings" || sName === "summary") continue;
    if (sName.indexOf(target) !== -1 || target.indexOf(sName) !== -1) {
      return sheets[j];
    }
  }

  return null;
}

/**
 * DYNAMIC TAB DISCOVERY:
 * Finds all relevant firm tabs in the spreadsheet automatically.
 * Ignores system / helper tabs like 'Settings', 'Summary', or 'Master'.
 */
function getAllFirmNames() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  var names = [];
  var skipTabs = ["SETTINGS", "CONFIG", "SUMMARY", "TEMPLATE", "LOGS", "MASTER", "MASTERS"];

  for (var i = 0; i < sheets.length; i++) {
    var sName = sheets[i].getName().trim();
    if (skipTabs.indexOf(sName.toUpperCase()) === -1) {
      names.push(sName);
    }
  }

  return names.length > 0 ? names : DEFAULT_FIRMS;
}

/**
 * DYNAMIC HEADER MAPPING:
 * Intelligently maps columns: Sl.no, Invoice No., Vendor Name, Material, Vehicle status, Vehicle no., Bill Copy, Date Of Entry
 */
function getHeaderMap(sheet) {
  var lastCol = sheet.getLastColumn() || 8;
  var headerValues = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var map = {};

  for (var c = 0; c < headerValues.length; c++) {
    var raw = (headerValues[c] || "").toString().trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!raw) continue;

    var colIdx = c + 1; // 1-based index

    // Sl.no
    if (raw === "sno" || raw === "slno" || raw === "srno" || raw === "no") {
      map.slNo = colIdx;
    }
    // Bill Copy / Attachment Link (MUST BE CHECKED BEFORE invoice/bill to avoid "Bill Copy" matching invoice!)
    else if (raw.indexOf("copy") !== -1 || raw.indexOf("attachment") !== -1 || raw.indexOf("drive") !== -1 || raw.indexOf("link") !== -1 || raw === "billcopy") {
      map.attachmentLink = colIdx;
    }
    // Invoice No. (matches Invoice No, Inv No, Bill No)
    else if (raw.indexOf("invoice") !== -1 || raw === "billno" || raw === "billnumber" || raw === "invno" || raw === "invoiceno") {
      map.invoiceNo = colIdx;
    }
    // Vendor Name
    else if (raw.indexOf("vendor") !== -1 || raw.indexOf("party") !== -1 || raw.indexOf("supplier") !== -1) {
      map.vendorName = colIdx;
    }
    // Material
    else if (raw.indexOf("material") !== -1 || raw.indexOf("item") !== -1 || raw.indexOf("product") !== -1 || raw.indexOf("grade") !== -1) {
      map.material = colIdx;
    }
    // Vehicle status
    else if (raw.indexOf("status") !== -1) {
      map.vehicleStatus = colIdx;
    }
    // Vehicle no.
    else if (raw.indexOf("vehicle") !== -1 || raw.indexOf("truck") !== -1) {
      map.vehicleNo = colIdx;
    }
    // Date Of Entry / Entry Date / Created At
    else if (raw.indexOf("dateofentry") !== -1 || raw.indexOf("entrydate") !== -1 || raw.indexOf("date") !== -1 || raw.indexOf("created") !== -1) {
      if (!map.createdAt) map.createdAt = colIdx;
    }
    // Remark
    else if (raw.indexOf("remark") !== -1 || raw.indexOf("comment") !== -1 || raw.indexOf("note") !== -1) {
      map.remark = colIdx;
    }
    // Attachment Name
    else if (raw.indexOf("attachmentname") !== -1 || raw.indexOf("filename") !== -1) {
      map.attachmentName = colIdx;
    }
    // Firm
    else if (raw === "firm" || raw === "unit" || raw === "company") {
      map.firm = colIdx;
    }
    // Updated At
    else if (raw.indexOf("updated") !== -1) {
      map.updatedAt = colIdx;
    }
  }

  // Fallbacks strictly matching sheet column count
  if (!map.slNo && lastCol >= 1) map.slNo = 1;
  if (!map.invoiceNo && lastCol >= 2) map.invoiceNo = 2;
  if (!map.vendorName && lastCol >= 3) map.vendorName = 3;
  if (!map.material && lastCol >= 4) map.material = 4;
  if (!map.vehicleStatus && lastCol >= 5) map.vehicleStatus = 5;
  if (!map.vehicleNo && lastCol >= 6) map.vehicleNo = 6;
  if (!map.attachmentLink && lastCol >= 7) map.attachmentLink = 7;
  if (!map.createdAt && lastCol >= 8) map.createdAt = 8;

  return { map: map, headers: headerValues, lastCol: lastCol };
}

/**
 * Ensure a firm sheet exists with standard headers if empty
 */
function getOrCreateFirmSheet(firmName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var cleanName = (firmName || "PMMPL").toString().trim();
  
  var existing = findSheetCaseInsensitive(ss, cleanName);
  if (existing) {
    return existing;
  }

  // If sheet really doesn't exist, create it with standard headers
  var sheet = ss.insertSheet(cleanName);
  var standardHeaders = ["Sl.no", "Invoice No.", "Vendor Name", "Material", "Vehicle status", "Vehicle no.", "Bill Copy"];
  sheet.appendRow(standardHeaders);
  var hRange = sheet.getRange(1, 1, 1, standardHeaders.length);
  hRange.setFontWeight("bold");
  sheet.setFrozenRows(1);
  return sheet;
}

/**
 * Apply row background highlight if status is reached
 */
function formatRowStatus(sheet, rowIndex, status, totalCols) {
  var cols = totalCols || sheet.getLastColumn() || 7;
  var range = sheet.getRange(rowIndex, 1, 1, cols);
  var norm = (status || "").toString().trim().toLowerCase();
  
  var isReached = REACHED_STATUSES.some(function(s) {
    return norm.indexOf(s) !== -1;
  });

  if (isReached) {
    range.setBackground(HIGHLIGHT_COLOR);
  } else {
    range.setBackground("#FFFFFF");
  }
}

/**
 * DYNAMIC RECORD FETCHER:
 * Scans all matching tabs and extracts records using dynamic column mappings.
 */
function fetchRecords(firmFilter) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var allFirms = getAllFirmNames();
  var firmsToScan = [];

  if (!firmFilter || firmFilter.toUpperCase() === "ALL") {
    firmsToScan = allFirms;
  } else {
    var matchTab = findSheetCaseInsensitive(ss, firmFilter);
    if (matchTab) {
      firmsToScan = [matchTab.getName()];
    } else {
      firmsToScan = [firmFilter];
    }
  }

  var allRecords = [];

  firmsToScan.forEach(function(fName) {
    var sheet = findSheetCaseInsensitive(ss, fName);
    if (!sheet) return;

    var actualSheetName = sheet.getName();
    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) return; // Only header row

    var headerInfo = getHeaderMap(sheet);
    var map = headerInfo.map;
    var lastCol = headerInfo.lastCol;

    var values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

    for (var r = 0; r < values.length; r++) {
      var row = values[r];
      // Skip completely empty blank rows
      var hasData = row.some(function(cell) {
        return cell !== "" && cell !== null && cell !== undefined;
      });
      if (!hasData) continue;

      var slVal = (map.slNo && map.slNo <= row.length) ? row[map.slNo - 1] : (r + 1);
      var invVal = (map.invoiceNo && map.invoiceNo <= row.length) ? (row[map.invoiceNo - 1] || "").toString().trim() : "";
      var vendorVal = (map.vendorName && map.vendorName <= row.length) ? (row[map.vendorName - 1] || "").toString().trim() : "";
      var matVal = (map.material && map.material <= row.length) ? (row[map.material - 1] || "").toString().trim() : "";
      var statusVal = (map.vehicleStatus && map.vehicleStatus <= row.length) ? (row[map.vehicleStatus - 1] || "").toString().trim() : "";
      var vehVal = (map.vehicleNo && map.vehicleNo <= row.length) ? (row[map.vehicleNo - 1] || "").toString().trim() : "";
      var remarkVal = (map.remark && map.remark <= row.length) ? (row[map.remark - 1] || "").toString().trim() : "";
      var linkVal = (map.attachmentLink && map.attachmentLink <= row.length) ? (row[map.attachmentLink - 1] || "").toString().trim() : "";
      var nameVal = (map.attachmentName && map.attachmentName <= row.length) ? (row[map.attachmentName - 1] || "").toString().trim() : "";
      
      // Firm ALWAYS defaults to the actual sheet tab name (e.g. PMMPL, RKL, PURAB)
      var firmVal = (map.firm && map.firm <= row.length && row[map.firm - 1]) ? (row[map.firm - 1] || "").toString().trim() : actualSheetName;
      if (!firmVal) firmVal = actualSheetName;

      var createdAtRaw = (map.createdAt && map.createdAt <= row.length) ? row[map.createdAt - 1] : "";
      var createdAt = "";
      if (createdAtRaw instanceof Date) {
        createdAt = Utilities.formatDate(createdAtRaw, Session.getScriptTimeZone() || "GMT+5:30", "yyyy-MM-dd HH:mm:ss");
      } else {
        createdAt = createdAtRaw ? createdAtRaw.toString() : "";
      }

      var updatedAtRaw = (map.updatedAt && map.updatedAt <= row.length) ? row[map.updatedAt - 1] : "";
      var updatedAt = "";
      if (updatedAtRaw instanceof Date) {
        updatedAt = Utilities.formatDate(updatedAtRaw, Session.getScriptTimeZone() || "GMT+5:30", "yyyy-MM-dd HH:mm:ss");
      } else {
        updatedAt = updatedAtRaw ? updatedAtRaw.toString() : "";
      }

      allRecords.push({
        slNo: Number(slVal) || (r + 1),
        invoiceNo: invVal,
        vendorName: vendorVal,
        material: matVal,
        vehicleStatus: statusVal,
        vehicleNo: vehVal,
        remark: remarkVal,
        attachmentLink: linkVal,
        attachmentName: nameVal,
        firm: firmVal,
        createdAt: createdAt,
        updatedAt: updatedAt,
        rowIndex: r + 2
      });
    }
  });

  return allRecords;
}

/**
 * Find record by invoice across all tabs
 */
function findRecordByInvoice(invoiceNo) {
  var target = (invoiceNo || "").toString().trim().toLowerCase();
  var all = fetchRecords("ALL");
  for (var i = 0; i < all.length; i++) {
    if (all[i].invoiceNo && all[i].invoiceNo.trim().toLowerCase() === target) {
      return all[i];
    }
  }
  return null;
}

/**
 * Save attachment to Google Drive: Target Folder (11maQRobfgJOa7b5_75kiuSkv0hQ7CE2w)
 */
function saveAttachmentToDrive(firm, invoiceNo, vendorName, fileObj) {
  if (!fileObj || !fileObj.base64) return { link: "", name: "" };

  var targetFolder = null;
  try {
    if (ATTACHMENT_FOLDER_ID && ATTACHMENT_FOLDER_ID.trim() !== "") {
      targetFolder = DriveApp.getFolderById(ATTACHMENT_FOLDER_ID.trim());
    }
  } catch (err) {
    Logger.log("Could not find folder by ID: " + err.toString());
  }

  // Fallback to "Vendor Invoices" folder if ID is invalid or inaccessible
  if (!targetFolder) {
    var rootFolder = getOrCreateFolder(DriveApp.getRootFolder(), "Vendor Invoices");
    targetFolder = getOrCreateFolder(rootFolder, firm || "General");
  }

  var cleanInvoice = (invoiceNo || "NO_INV").replace(/[\/\\?%*:|"<>]/g, "-").trim();
  var cleanVendor = (vendorName || "VENDOR").replace(/[\/\\?%*:|"<>]/g, "_").trim();
  var cleanFirm = (firm || "").replace(/[\/\\?%*:|"<>]/g, "-").trim();

  var ext = "pdf";
  if (fileObj.mimeType) {
    if (fileObj.mimeType.indexOf("image/jpeg") !== -1 || fileObj.mimeType.indexOf("image/jpg") !== -1) ext = "jpg";
    else if (fileObj.mimeType.indexOf("image/png") !== -1) ext = "png";
    else if (fileObj.mimeType.indexOf("pdf") !== -1) ext = "pdf";
  }

  var finalName = (cleanFirm ? cleanFirm + "_" : "") + cleanInvoice + "_" + cleanVendor + "." + ext;
  
  var rawBase64 = (fileObj.base64 || "").toString();
  if (rawBase64.indexOf("base64,") !== -1) {
    rawBase64 = rawBase64.split("base64,")[1];
  }
  rawBase64 = rawBase64.replace(/\s+/g, "");

  var bytes = Utilities.base64Decode(rawBase64);
  var blob = Utilities.newBlob(bytes, fileObj.mimeType || "application/octet-stream", finalName);

  var file = targetFolder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return {
    link: file.getUrl(),
    name: finalName
  };
}

function getOrCreateFolder(parentFolder, folderName) {
  var folders = parentFolder.getFoldersByName(folderName);
  if (folders.hasNext()) return folders.next();
  return parentFolder.createFolder(folderName);
}

/**
 * Add entry dynamically into the correct firm tab
 */
function addEntry(data) {
  var firm = (data.firm || "PMMPL").toString().trim();
  var sheet = getOrCreateFirmSheet(firm);
  var actualFirmName = sheet.getName();

  var headerInfo = getHeaderMap(sheet);
  var map = headerInfo.map;
  var lastCol = headerInfo.lastCol;

  var lastRow = sheet.getLastRow();
  var nextSl = 1;

  if (lastRow > 1 && map.slNo) {
    var slValues = sheet.getRange(2, map.slNo, lastRow - 1, 1).getValues();
    var maxSl = 0;
    for (var i = 0; i < slValues.length; i++) {
      var n = Number(slValues[i][0]);
      if (!isNaN(n) && n > maxSl) maxSl = n;
    }
    nextSl = maxSl + 1;
  }

  var attachmentLink = data.attachmentLink || "";
  var attachmentName = data.attachmentName || "";

  if (data.file && data.file.base64) {
    try {
      var driveRes = saveAttachmentToDrive(actualFirmName, data.invoiceNo, data.vendorName, data.file);
      attachmentLink = driveRes.link;
      attachmentName = driveRes.name;
    } catch (driveErr) {
      Logger.log("Drive upload error: " + driveErr.toString());
      attachmentName = (data.file.fileName || "File") + " (Drive Error)";
    }
  }

  var now = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "GMT+5:30", "yyyy-MM-dd HH:mm:ss");

  // Construct row according to sheet's actual columns
  var newRow = new Array(lastCol).fill("");
  if (map.slNo && map.slNo <= lastCol) newRow[map.slNo - 1] = nextSl;
  if (map.invoiceNo && map.invoiceNo <= lastCol) newRow[map.invoiceNo - 1] = data.invoiceNo || "";
  if (map.vendorName && map.vendorName <= lastCol) newRow[map.vendorName - 1] = data.vendorName || "";
  if (map.material && map.material <= lastCol) newRow[map.material - 1] = data.material || "";
  if (map.vehicleStatus && map.vehicleStatus <= lastCol) newRow[map.vehicleStatus - 1] = data.vehicleStatus || "";
  if (map.vehicleNo && map.vehicleNo <= lastCol) newRow[map.vehicleNo - 1] = (data.vehicleNo || "").toString().toUpperCase();
  if (map.remark && map.remark <= lastCol) newRow[map.remark - 1] = data.remark || "";
  if (map.attachmentLink && map.attachmentLink <= lastCol) newRow[map.attachmentLink - 1] = attachmentLink;
  if (map.attachmentName && map.attachmentName <= lastCol) newRow[map.attachmentName - 1] = attachmentName;
  if (map.firm && map.firm <= lastCol) newRow[map.firm - 1] = actualFirmName;
  if (map.createdAt && map.createdAt <= lastCol) newRow[map.createdAt - 1] = now;
  if (map.updatedAt && map.updatedAt <= lastCol) newRow[map.updatedAt - 1] = now;

  sheet.appendRow(newRow);

  var newRowIndex = sheet.getLastRow();
  formatRowStatus(sheet, newRowIndex, data.vehicleStatus, lastCol);

  return {
    slNo: nextSl,
    invoiceNo: (map.invoiceNo && map.invoiceNo <= lastCol) ? newRow[map.invoiceNo - 1] : (data.invoiceNo || ""),
    vendorName: (map.vendorName && map.vendorName <= lastCol) ? newRow[map.vendorName - 1] : (data.vendorName || ""),
    material: (map.material && map.material <= lastCol) ? newRow[map.material - 1] : (data.material || ""),
    vehicleStatus: (map.vehicleStatus && map.vehicleStatus <= lastCol) ? newRow[map.vehicleStatus - 1] : (data.vehicleStatus || ""),
    vehicleNo: (map.vehicleNo && map.vehicleNo <= lastCol) ? newRow[map.vehicleNo - 1] : (data.vehicleNo || ""),
    remark: (map.remark && map.remark <= lastCol) ? newRow[map.remark - 1] : (data.remark || ""),
    attachmentLink: attachmentLink,
    attachmentName: attachmentName,
    firm: actualFirmName,
    createdAt: now,
    updatedAt: now,
    rowIndex: newRowIndex
  };
}

/**
 * Update entry dynamically in the correct firm tab
 */
function updateEntry(data) {
  var firm = (data.firm || "PMMPL").toString().trim();
  var sheet = getOrCreateFirmSheet(firm);
  var actualFirmName = sheet.getName();
  var headerInfo = getHeaderMap(sheet);
  var map = headerInfo.map;
  var lastCol = headerInfo.lastCol;

  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) throw new Error("No data in sheet: " + actualFirmName);

  var targetRowIndex = -1;

  if (data.slNo !== undefined && data.slNo !== null && map.slNo) {
    var slCol = sheet.getRange(2, map.slNo, lastRow - 1, 1).getValues();
    for (var i = 0; i < slCol.length; i++) {
      if (String(slCol[i][0]).trim() === String(data.slNo).trim()) {
        targetRowIndex = i + 2;
        break;
      }
    }
  }

  if (targetRowIndex === -1 && data.invoiceNo && map.invoiceNo) {
    var invCol = sheet.getRange(2, map.invoiceNo, lastRow - 1, 1).getValues();
    for (var j = 0; j < invCol.length; j++) {
      if (String(invCol[j][0]).trim().toLowerCase() === String(data.invoiceNo).trim().toLowerCase()) {
        targetRowIndex = j + 2;
        break;
      }
    }
  }

  if (targetRowIndex === -1) {
    throw new Error("Record not found for update in firm: " + actualFirmName);
  }

  var existingRow = sheet.getRange(targetRowIndex, 1, 1, lastCol).getValues()[0];
  var attachmentLink = (map.attachmentLink && map.attachmentLink <= lastCol) ? existingRow[map.attachmentLink - 1] || "" : "";
  var attachmentName = (map.attachmentName && map.attachmentName <= lastCol) ? existingRow[map.attachmentName - 1] || "" : "";
  var createdAt = (map.createdAt && map.createdAt <= lastCol) ? existingRow[map.createdAt - 1] || "" : "";

  if (data.file && data.file.base64) {
    try {
      var driveRes = saveAttachmentToDrive(actualFirmName, data.invoiceNo || (map.invoiceNo ? existingRow[map.invoiceNo - 1] : ""), data.vendorName || (map.vendorName ? existingRow[map.vendorName - 1] : ""), data.file);
      attachmentLink = driveRes.link;
      attachmentName = driveRes.name;
    } catch (driveErr) {
      Logger.log("Drive update error: " + driveErr.toString());
    }
  } else if (data.attachmentLink !== undefined) {
    attachmentLink = data.attachmentLink;
    attachmentName = data.attachmentName || attachmentName;
  }

  var now = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "GMT+5:30", "yyyy-MM-dd HH:mm:ss");

  var updatedRow = existingRow.slice();
  if (data.invoiceNo !== undefined && map.invoiceNo && map.invoiceNo <= lastCol) updatedRow[map.invoiceNo - 1] = data.invoiceNo;
  if (data.vendorName !== undefined && map.vendorName && map.vendorName <= lastCol) updatedRow[map.vendorName - 1] = data.vendorName;
  if (data.material !== undefined && map.material && map.material <= lastCol) updatedRow[map.material - 1] = data.material;
  if (data.vehicleStatus !== undefined && map.vehicleStatus && map.vehicleStatus <= lastCol) updatedRow[map.vehicleStatus - 1] = data.vehicleStatus;
  if (data.vehicleNo !== undefined && map.vehicleNo && map.vehicleNo <= lastCol) updatedRow[map.vehicleNo - 1] = data.vehicleNo.toString().toUpperCase();
  if (data.remark !== undefined && map.remark && map.remark <= lastCol) updatedRow[map.remark - 1] = data.remark;
  if (map.attachmentLink && map.attachmentLink <= lastCol) updatedRow[map.attachmentLink - 1] = attachmentLink;
  if (map.attachmentName && map.attachmentName <= lastCol) updatedRow[map.attachmentName - 1] = attachmentName;
  if (map.firm && map.firm <= lastCol) updatedRow[map.firm - 1] = actualFirmName;
  if (map.createdAt && map.createdAt <= lastCol) updatedRow[map.createdAt - 1] = createdAt || now;
  if (map.updatedAt && map.updatedAt <= lastCol) updatedRow[map.updatedAt - 1] = now;

  sheet.getRange(targetRowIndex, 1, 1, lastCol).setValues([updatedRow]);
  if (map.vehicleStatus) {
    formatRowStatus(sheet, targetRowIndex, updatedRow[map.vehicleStatus - 1], lastCol);
  }

  return {
    slNo: map.slNo ? updatedRow[map.slNo - 1] : (data.slNo || targetRowIndex - 1),
    invoiceNo: (map.invoiceNo && map.invoiceNo <= lastCol) ? updatedRow[map.invoiceNo - 1] : (data.invoiceNo || ""),
    vendorName: (map.vendorName && map.vendorName <= lastCol) ? updatedRow[map.vendorName - 1] : (data.vendorName || ""),
    material: (map.material && map.material <= lastCol) ? updatedRow[map.material - 1] : (data.material || ""),
    vehicleStatus: (map.vehicleStatus && map.vehicleStatus <= lastCol) ? updatedRow[map.vehicleStatus - 1] : (data.vehicleStatus || ""),
    vehicleNo: (map.vehicleNo && map.vehicleNo <= lastCol) ? updatedRow[map.vehicleNo - 1] : (data.vehicleNo || ""),
    remark: (map.remark && map.remark <= lastCol) ? updatedRow[map.remark - 1] : (data.remark || ""),
    attachmentLink: attachmentLink,
    attachmentName: attachmentName,
    firm: actualFirmName,
    createdAt: (map.createdAt && map.createdAt <= lastCol) ? updatedRow[map.createdAt - 1] : now,
    updatedAt: now,
    rowIndex: targetRowIndex
  };
}

/**
 * Delete entry
 */
function deleteEntry(firm, slNo) {
  var sheet = getOrCreateFirmSheet(firm);
  var headerInfo = getHeaderMap(sheet);
  var map = headerInfo.map;

  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) throw new Error("No data in firm sheet: " + sheet.getName());

  var slCol = sheet.getRange(2, map.slNo || 1, lastRow - 1, 1).getValues();
  var rowToDelete = -1;

  for (var i = 0; i < slCol.length; i++) {
    if (String(slCol[i][0]).trim() === String(slNo).trim()) {
      rowToDelete = i + 2;
      break;
    }
  }

  if (rowToDelete === -1) {
    throw new Error("Record with Sl.no " + slNo + " not found in firm " + sheet.getName());
  }

  sheet.deleteRow(rowToDelete);
  return { firm: sheet.getName(), slNo: slNo, deletedRow: rowToDelete };
}

/**
 * =========================================================================
 * SIMPLE TRIGGER: onEdit(e)
 * =========================================================================
 * Runs automatically when someone manually types or edits cells in Google Sheets!
 * 1. Highlights row yellow (#FFFF00) if status changes to reached.
 * 2. Auto-fills Sl.no, Firm, Created At, and Updated At on new rows.
 */
function onEdit(e) {
  try {
    if (!e || !e.range) return;
    var sheet = e.range.getSheet();
    var sheetName = sheet.getName();

    var skipTabs = ["SETTINGS", "CONFIG", "SUMMARY", "TEMPLATE", "LOGS"];
    if (skipTabs.indexOf(sheetName.toUpperCase()) !== -1) return;

    var row = e.range.getRow();
    if (row <= 1) return; // Skip header

    var headerInfo = getHeaderMap(sheet);
    var map = headerInfo.map;
    var lastCol = headerInfo.lastCol;

    var now = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "GMT+5:30", "yyyy-MM-dd HH:mm:ss");

    // Auto-fill Sl.no if missing
    var slCell = sheet.getRange(row, map.slNo);
    if (!slCell.getValue()) {
      var prevSl = row > 2 ? Number(sheet.getRange(row - 1, map.slNo).getValue()) || 0 : 0;
      slCell.setValue(prevSl + 1);
    }

    // Auto-fill Firm if missing and column exists
    if (map.firm && map.firm <= lastCol) {
      var firmCell = sheet.getRange(row, map.firm);
      if (!firmCell.getValue()) {
        firmCell.setValue(sheetName);
      }
    }

    // Auto-fill Date Of Entry / Created At if missing and column exists
    if (map.createdAt && map.createdAt <= lastCol) {
      var createdCell = sheet.getRange(row, map.createdAt);
      if (!createdCell.getValue()) {
        createdCell.setValue(now);
      }
    }

    // Always update Updated At if column exists
    if (map.updatedAt && map.updatedAt <= lastCol) {
      sheet.getRange(row, map.updatedAt).setValue(now);
    }

    // Re-check status highlight
    var statusVal = sheet.getRange(row, map.vehicleStatus).getValue();
    formatRowStatus(sheet, row, statusVal, lastCol);

  } catch (err) {
    console.warn("onEdit error:", err);
  }
}
