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
      syncItemsSheet(data.items, data.device);
    } else if (data.action === 'updatePayment') {
      updatePaymentMethod(data.id, data.pay);
    }
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: err.message });
  }
}

function doGet(e) {
  const action = e && e.parameter && e.parameter.action;
  if (action === 'getStock') return getStockData();
  if (action === 'getTransactions') return getTransactionsData();
  return json({ ok: true, status: 'connected', time: new Date().toISOString() });
}

function getTransactionsData() {
  const ss = SpreadsheetApp.openById('1y5Iq5CWK4ZfdEOGApIwAhebuMwhnaEv-oHlw1n1e_dY');
  const sheet = getSheet(ss);
  const last = sheet.getLastRow();
  if (last <= 1) return json({ ok: true, transactions: [], time: new Date().toISOString() });
  const lastCol = Math.max(sheet.getLastColumn(), 10);
  const data = sheet.getRange(2, 1, last - 1, lastCol).getValues();
  const byId = {};
  data.forEach(r => {
    const tid = r[0];
    if (!tid) return;
    const id = String(tid);
    if (!byId[id]) {
      byId[id] = {
        id: id,
        ts: new Date(r[1]).getTime(),
        items: [],
        total: 0,
        pay: r[6] || '',
        note: r[7] || '',
        day: r[9] !== '' && r[9] !== null && r[9] !== undefined ? Number(r[9]) || null : null,
      };
    }
    const qty = Number(r[3]) || 0;
    const up  = Number(r[4]) || 0;
    const lt  = Number(r[5]) || 0;
    byId[id].items.push({ name: r[2], qty: qty, up: up, lt: lt });
    byId[id].total += lt;
  });
  const transactions = Object.values(byId).map(t => ({ ...t, total: Math.round(t.total * 100) / 100 }));
  return json({ ok: true, transactions: transactions, time: new Date().toISOString() });
}

function getStockData() {
  const ss = SpreadsheetApp.openById('1y5Iq5CWK4ZfdEOGApIwAhebuMwhnaEv-oHlw1n1e_dY');
  const sheet = getItemsSheet(ss);
  const last = sheet.getLastRow();
  if (last <= 1) return json({ ok: true, items: [], time: new Date().toISOString() });
  const lastCol = Math.max(sheet.getLastColumn(), 5);
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim().toLowerCase());
  const ix = {
    id:         headers.indexOf('id'),
    name:       headers.indexOf('name'),
    price:      headers.indexOf('price'),
    stock:      headers.indexOf('stock'),
    updated_at: headers.indexOf('updated_at'),
  };
  const data = sheet.getRange(2, 1, last - 1, lastCol).getValues();
  const items = data.filter(r => r.some(v => v !== '' && v !== null && v !== undefined)).map(r => {
    const stockRaw = ix.stock >= 0 ? r[ix.stock] : '';
    const isUnlim = stockRaw === '∞' || stockRaw === '' || stockRaw === null || stockRaw === undefined;
    return {
      id:         ix.id         >= 0 ? String(r[ix.id]) : '',
      name:       ix.name       >= 0 ? r[ix.name] : '',
      price:      ix.price      >= 0 ? Number(r[ix.price]) || 0 : 0,
      stock:      isUnlim ? null : Number(stockRaw),
      updated_at: ix.updated_at >= 0 ? r[ix.updated_at] : '',
    };
  });
  return json({ ok: true, items, time: new Date().toISOString() });
}

function logRows(rows) {
  const ss    = SpreadsheetApp.openById('1y5Iq5CWK4ZfdEOGApIwAhebuMwhnaEv-oHlw1n1e_dY');
  const sheet = getSheet(ss);
  // Ensure the day column exists on legacy 9-column sheets
  if (sheet.getLastColumn() < 10) {
    sheet.getRange(1, 10).setValue('day').setFontWeight('bold').setBackground('#1a1a1a').setFontColor('#f2f2f2');
    sheet.setColumnWidth(10, 60);
  }
  // Dedup: skip rows whose transaction_id already exists in column A
  const last = sheet.getLastRow();
  const existing = new Set();
  if (last > 1) {
    sheet.getRange(2, 1, last - 1, 1).getValues().forEach(r => {
      if (r[0]) existing.add(String(r[0]));
    });
  }
  const filtered = rows.filter(r => !existing.has(String(r.transaction_id)));
  if (!filtered.length) return;
  const vals = filtered.map(r => [
    r.transaction_id,
    r.timestamp,
    r.item_name,
    r.quantity,
    r.unit_price,
    r.line_total,
    r.payment_method,
    r.note || '',
    r.synced_at,
    r.day || '',
  ]);
  sheet.getRange(sheet.getLastRow() + 1, 1, vals.length, 10).setValues(vals);
}

function getSheet(ss) {
  let s = ss.getSheetByName('Sales');
  if (!s) {
    s = ss.insertSheet('Sales');
    const h = ['transaction_id','timestamp','item_name','quantity','unit_price','line_total','payment_method','note','synced_at','day'];
    s.appendRow(h);
    s.setFrozenRows(1);
    s.getRange(1,1,1,h.length).setFontWeight('bold').setBackground('#1a1a1a').setFontColor('#f2f2f2');
    s.setColumnWidths(1, h.length, 140);
    s.setColumnWidth(2, 180);
    s.setColumnWidth(8, 220);
    s.setColumnWidth(10, 60);
  }
  return s;
}

// Run this manually once from the Apps Script editor to create both tabs
// and confirm the script has permission to access the spreadsheet.
function setup() {
  const ss     = SpreadsheetApp.openById('1y5Iq5CWK4ZfdEOGApIwAhebuMwhnaEv-oHlw1n1e_dY');
  const sales  = getSheet(ss);
  const items  = getItemsSheet(ss);
  Logger.log('Setup complete. Sales: ' + sales.getName() + ', Items: ' + items.getName() + ' in ' + ss.getName());
}

function syncItemsSheet(items, device) {
  const ss    = SpreadsheetApp.openById('1y5Iq5CWK4ZfdEOGApIwAhebuMwhnaEv-oHlw1n1e_dY');
  const sheet = getItemsSheet(ss);
  // Always rewrite header row to canonical layout (self-heals any column drift)
  const headers = ['id', 'name', 'price', 'stock', 'updated_at'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  // Clear the entire data range, including any stale columns past col E
  const last    = sheet.getLastRow();
  const lastCol = Math.max(sheet.getLastColumn(), headers.length);
  if (last > 1) sheet.getRange(2, 1, last - 1, lastCol).clearContent();
  if (items && items.length) {
    const vals = items.map(i => [
      i.id || '',
      i.name,
      i.price,
      i.stock !== null && i.stock !== undefined ? i.stock : '∞',
      new Date().toISOString(),
    ]);
    sheet.getRange(2, 1, vals.length, headers.length).setValues(vals);
  }
  if (device) logStockHistory(ss, items, device);
}

function logStockHistory(ss, items, device) {
  let s = ss.getSheetByName('StockHistory');
  if (!s) {
    s = ss.insertSheet('StockHistory');
    s.appendRow(['timestamp', 'device', 'snapshot']);
    s.setFrozenRows(1);
    s.getRange(1,1,1,3).setFontWeight('bold').setBackground('#1a1a1a').setFontColor('#f2f2f2');
    s.setColumnWidth(1, 180); s.setColumnWidth(2, 120); s.setColumnWidth(3, 600);
  }
  const snapshot = (items || []).map(i => i.name + ':' + (i.stock !== null && i.stock !== undefined ? i.stock : '∞')).join(', ');
  s.appendRow([new Date().toISOString(), device, snapshot]);
}

function getItemsSheet(ss) {
  let s = ss.getSheetByName('Items');
  if (!s) {
    s = ss.insertSheet('Items');
    const h = ['id', 'name', 'price', 'stock', 'updated_at'];
    s.appendRow(h);
    s.setFrozenRows(1);
    s.getRange(1, 1, 1, h.length).setFontWeight('bold').setBackground('#1a1a1a').setFontColor('#f2f2f2');
    s.setColumnWidth(1, 60);
    s.setColumnWidth(2, 260);
    s.setColumnWidth(3, 80);
    s.setColumnWidth(4, 80);
    s.setColumnWidth(5, 180);
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
