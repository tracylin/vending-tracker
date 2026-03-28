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
    } else if (data.action === 'deleteTransactions') {
      deleteTransactionRows(data.ids);
    } else if (data.action === 'syncItems') {
      syncItemsSheet(data.items);
    } else if (data.action === 'updatePayment') {
      updatePaymentMethod(data.id, data.pay);
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
  const ss    = SpreadsheetApp.openById('1y5Iq5CWK4ZfdEOGApIwAhebuMwhnaEv-oHlw1n1e_dY');
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

// Run this manually once from the Apps Script editor to create the Sales tab
// and confirm the script has permission to access the spreadsheet.
function setup() {
  const ss = SpreadsheetApp.openById('1y5Iq5CWK4ZfdEOGApIwAhebuMwhnaEv-oHlw1n1e_dY');
  const sheet = getSheet(ss);
  Logger.log('Setup complete. Sheet: ' + sheet.getName() + ' in ' + ss.getName());
}

function syncItemsSheet(items) {
  const ss    = SpreadsheetApp.openById('1y5Iq5CWK4ZfdEOGApIwAhebuMwhnaEv-oHlw1n1e_dY');
  const sheet = getItemsSheet(ss);
  const last  = sheet.getLastRow();
  if (last > 1) sheet.getRange(2, 1, last - 1, 4).clearContent();
  if (items && items.length) {
    const vals = items.map(i => [i.name, i.price, i.stock !== null && i.stock !== undefined ? i.stock : '∞', new Date().toISOString()]);
    sheet.getRange(2, 1, vals.length, 4).setValues(vals);
  }
}

function getItemsSheet(ss) {
  let s = ss.getSheetByName('Items');
  if (!s) {
    s = ss.insertSheet('Items');
    const h = ['name', 'price', 'stock', 'updated_at'];
    s.appendRow(h);
    s.setFrozenRows(1);
    s.getRange(1, 1, 1, h.length).setFontWeight('bold').setBackground('#1a1a1a').setFontColor('#f2f2f2');
    s.setColumnWidth(1, 260);
    s.setColumnWidth(2, 80);
    s.setColumnWidth(3, 80);
    s.setColumnWidth(4, 180);
  }
  return s;
}

function updatePaymentMethod(id, pay) {
  const ss    = SpreadsheetApp.openById('1y5Iq5CWK4ZfdEOGApIwAhebuMwhnaEv-oHlw1n1e_dY');
  const sheet = getSheet(ss);
  const idStr = String(id);
  for (let r = 2; r <= sheet.getLastRow(); r++) {
    if (String(sheet.getRange(r, 1).getValue()) === idStr) {
      sheet.getRange(r, 7).setValue(pay); // column 7 = payment_method
    }
  }
}

function deleteTransactionRows(ids) {
  const ss    = SpreadsheetApp.openById('1y5Iq5CWK4ZfdEOGApIwAhebuMwhnaEv-oHlw1n1e_dY');
  const sheet = getSheet(ss);
  const idSet = new Set(ids.map(String));
  // iterate bottom-up so row deletion doesn't shift indices
  for (let r = sheet.getLastRow(); r >= 2; r--) {
    if (idSet.has(String(sheet.getRange(r, 1).getValue()))) {
      sheet.deleteRow(r);
    }
  }
}

function json(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
