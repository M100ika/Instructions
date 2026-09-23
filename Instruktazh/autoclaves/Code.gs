/**
 * Autoclave Access Briefing — Acknowledgement Log
 * Paste this file into Google Apps Script, then deploy as a Web App.
 *
 * Columns written to the sheet:
 *   A  Timestamp (server)
 *   B  Full Name
 *   C  Position / Department
 *   D  Email
 *   E  Autoclave(s) requested
 *   F  Language
 *   G  Client Timestamp
 *   H  ID Card Number (or a new column after existing custom columns)
 */

var SHEET_NAME = "Acknowledgements";

var HEADERS = [
  "Метка времени (сервер)",
  "ФИО",
  "Должность / отдел",
  "Email",
  "Автоклав(ы)",
  "Язык",
  "Метка времени (клиент)",
  "Номер ID-карты",
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

    // Extend existing response sheets without shifting their previous columns.
    var existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var cardColumn = existingHeaders.indexOf("Номер ID-карты") + 1;
    if (!cardColumn) {
      cardColumn = Math.max(HEADERS.length, sheet.getLastColumn() + 1);
      sheet.getRange(1, cardColumn)
           .setValue("Номер ID-карты")
           .setFontWeight("bold")
           .setBackground("#1a365d")
           .setFontColor("#ffffff");
    }

    var params = e.parameter;
    // Keep the value as text, including leading zeroes and long card numbers.
    var cardId = String(params.cardId || "").trim();

    sheet.appendRow([
      new Date(),                        // server timestamp
      params.fullName   || "",
      params.position   || "",
      params.email      || "",
      params.equipment  || "",
      params.lang       || "",
      params.clientTime || "",
    ]);

    sheet.getRange(sheet.getLastRow(), cardColumn)
         .setNumberFormat("@")
         .setRichTextValue(SpreadsheetApp.newRichTextValue().setText(cardId).build());

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
