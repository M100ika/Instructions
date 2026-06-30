/**
 * VHP Decontamination Briefing — Acknowledgement Log
 * Paste this file into Google Apps Script, then deploy as a Web App.
 *
 * Columns written to the sheet:
 *   A  Timestamp (server)
 *   B  Full Name
 *   C  Position / Department
 *   D  Email
 *   E  Language
 *   F  Client Timestamp
 */

var SHEET_NAME = "Acknowledgements";

var HEADERS = [
  "Метка времени (сервер)",
  "ФИО",
  "Должность / отдел",
  "Email",
  "Язык",
  "Метка времени (клиент)",
];

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000); // wait up to 10 s

  try {
    var ss    = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
    }

    // Write headers if the sheet is empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      sheet.getRange(1, 1, 1, HEADERS.length)
           .setFontWeight("bold")
           .setBackground("#1a365d")
           .setFontColor("#ffffff");
      sheet.setFrozenRows(1);
    }

    var params = e.parameter;

    sheet.appendRow([
      new Date(),                        // server timestamp
      params.fullName   || "",
      params.position   || "",
      params.email      || "",
      params.lang       || "",
      params.clientTime || "",
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ result: "ok" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: "error", message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);

  } finally {
    lock.releaseLock();
  }
}
