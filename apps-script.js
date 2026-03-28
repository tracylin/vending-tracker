// ============================================================
//  VENDING TRACKER — Google Apps Script backend
//
//  SETUP:
//  1. Open your Google Sheet
//  2. Extensions → Apps Script
//  3. Paste this entire file, replacing any existing code
//  4. Deploy → New deployment → Web app
//     - Execute as: Me
//     - Who has access: Anyone
//  5. Copy the web app URL
//  6. In the app: Admin tab → paste URL → Save URL
// ============================================================

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.action === 'logTransaction') {
      logRows(data.rows);
    }
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: err.message });
  }
}

// Health check — open the URL in a browser to test connectivity
function doGet() {
  return json({ ok: true, status: 'connected', time: new Date().toISOString() });
}

function logRows(rows) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getSheet(ss);
  const vals  = rows.map(r => [
    r.transaction_id,
    r.timestamp,
    r.item_name,
    r.quantity,
    r.unit_price,
    r.line_total,
    r.payment_method,
    r.note || '',
    r.synced_at,
  ]);
  sheet.getRange(sheet.getLastRow() + 1, 1, vals.length, 9).setValues(vals);
}

function getSheet(ss) {
  let s = ss.getSheetByName('Sales');
  if (!s) {
    s = ss.insertSheet('Sales');
    const h = ['transaction_id','timestamp','item_name','quantity','unit_price','line_total','payment_method','note','synced_at'];
    s.appendRow(h);
    s.setFrozenRows(1);
    s.getRange(1,1,1,h.length).setFontWeight('bold').setBackground('#1a1a1a').setFontColor('#f2f2f2');
    s.setColumnWidths(1, 9, 140);
    s.setColumnWidth(2, 180);
    s.setColumnWidth(8, 220);
  }
  return s;
}

function json(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
