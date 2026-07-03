const SPREADSHEET_ID = "1qcPhG5dCh-BS7NUsn15HIHxsMFGBt13PJleD9Y-bsR4";
const SHEET_NAME = "网页维护表";
const FIRST_DATA_ROW = 2;
const LINK_COLUMN = 15;

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents || "{}");
    const date = String(data.date || "").trim();
    const activityName = String(data.activityName || "").trim();
    const channel = String(data.channel || "").trim();
    const publishedUrl = String(data.publishedUrl || "").trim();

    if (!date || !activityName || !channel) {
      throw new Error("Missing required fields");
    }

    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error("Sheet not found: " + SHEET_NAME);

    const lastRow = sheet.getLastRow();
    if (lastRow < FIRST_DATA_ROW) throw new Error("No data rows");

    const rowCount = lastRow - FIRST_DATA_ROW + 1;
    const rows = sheet.getRange(FIRST_DATA_ROW, 1, rowCount, 3).getDisplayValues();
    const index = rows.findIndex((row) => {
      return row[0] === date && row[1] === activityName && row[2] === channel;
    });

    if (index < 0) throw new Error("Matching row not found");

    sheet.getRange(FIRST_DATA_ROW + index, LINK_COLUMN).setValue(publishedUrl);
    return jsonResponse({ ok: true, row: FIRST_DATA_ROW + index, sheetName: SHEET_NAME });
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error.message || error) });
  }
}

function doGet() {
  return jsonResponse({ ok: true, service: "XPIN calendar writeback" });
}

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
