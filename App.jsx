import { useState, useEffect, useCallback, useRef, useMemo } from "react";

// ── helpers ──────────────────────────────────────────────────────────────────
const fmt  = n => '$' + Number(n).toFixed(2);
const uid  = () => 't' + Date.now() + Math.random().toString(36).slice(2, 5);
const iid  = () => 'i' + Date.now();
const tstr = d => { const dt = new Date(d), h = dt.getHours(), m = String(dt.getMinutes()).padStart(2,'0'); return `${h%12||12}:${m}${h>=12?'pm':'am'}`; };
const ld   = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
const sv   = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const isToday = ts => new Date(ts).toDateString() === new Date().toDateString();
const inToday = (tx, eventDay) => eventDay > 0 ? tx.day === eventDay : isToday(tx.ts);
const inEvent = tx => tx.day > 0;
const getEventDays = txns => {
  const set = new Set();
  txns.forEach(tx => { if (tx.day) set.add(tx.day); });
  return [...set].sort((a, b) => a - b);
};
const PC = { venmo: 'var(--ve)', zelle: 'var(--ze)', cash: 'var(--ca)' };
const PAY_LABEL = { venmo: 'Venmo', zelle: 'Zelle', cash: 'Cash' };

const CATALOG_VERSION = 4;  // bump this to force-refresh items on all devices

const DEFAULTS = [
  { id: 'oa01', name: 'Three Stories 三个故事',                                                lang: 'CN/EN',    price: 22, stock: 10,   active: true },
  { id: 'oa02', name: '51人：第十一届上海双年展项目',                                            lang: 'CN/EN',    price: 16, stock: 10,   active: true },
  { id: 'oa03', name: 'The Village of Proof 证据村',                                           lang: 'CN/EN',    price: 15, stock: 10,   active: true },
  { id: 'oa05', name: 'Blue Jean Pocket Writers Handbook',                                    lang: 'EN',       price: 6,  stock: 10,   active: true },
  { id: 'oa06', name: '51 Personae: Tarwewijk',                                               lang: 'CN/EN/NL', price: 22, stock: 10,   active: true },
  { id: 'oa07', name: 'Seed of Memory',                                                       lang: 'EN',       price: 20, stock: 5,    active: true },
  { id: 'oa08', name: '温州记 Journey to Wenzhou',                                             lang: 'CN/EN',    price: 18, stock: 6,    active: true },
  { id: 'oa09', name: '墙洞 Hole in the Wall',                                                lang: 'CN/EN/JP', price: 12, stock: 8,    active: true },
  { id: 'oa10', name: '卡拉什尼科夫 Kalashnikov',                                              lang: 'CN/EN/JP', price: 22, stock: 8,    active: true },
  { id: 'oa04', name: '卡门 Carmen',                                                           lang: 'CN/EN/JP', price: 18, stock: 10,   active: true },
  { id: 'oa12', name: '乞丐漫画（1）',                                                          lang: 'CN',       price: 10, stock: 0,    active: true },
  { id: 'oa17', name: '乞丐漫画（2）',                                                          lang: 'CN',       price: 10, stock: 5,    active: true },
  { id: 'oa24', name: '乞丐漫画（3）',                                                          lang: 'CN',       price: 10, stock: 5,    active: true },
  { id: 'oa26', name: '拼贴',                                                                  lang: 'CN/EN',    price: 22, stock: 0,    active: true },
  { id: 'oa11', name: 'Of Birds and Factories',                                               lang: 'EN',       price: 25, stock: 10,   active: true },
  { id: 'oa13', name: '51摊 51 Tan (a set of three)',                                          lang: 'CN/EN',    price: 22, stock: 9,    active: true },
  { id: 'oa14', name: 'Stand With Her woodcut journal',                                       lang: 'EN',       price: 12, stock: 10,   active: true },
  { id: 'oa15', name: 'Deep Simulator 深渊模拟器',                                             lang: 'CN/EN',    price: 26, stock: 5,    active: true },
  { id: 'oa16', name: 'Beijing Underground 北京地下',                                          lang: 'EN/JP',    price: 15, stock: 6,    active: true },
  { id: 'oa18', name: 'Working Class History 2026 挂历',                                       lang: 'EN',       price: 10, stock: 1,    active: true },
  { id: 'oa19', name: '亚际木刻版画Inter Asia Woodcut Mapping 第四期',                          lang: 'CN/EN',    price: 20, stock: 3,    active: true },
  { id: 'oa20', name: '亚际木刻版画Inter Asia Woodcut Mapping 第五期',                          lang: 'CN/EN',    price: 20, stock: 3,    active: true },
  { id: 'oa31', name: '亚际木刻版画Inter Asia Woodcut Mapping 第六期',                          lang: 'CN/EN',    price: 20, stock: 0,    active: true },
  { id: 'oa21', name: '飞鸟与工厂 版画一套12张',                                                lang: 'CN/EN',    price: 9,  stock: 10,   active: true },
  { id: 'oa27', name: 'A3BC',                                                                 lang: 'EN/JP',    price: 15, stock: 3,    active: true },
  { id: 'oa28', name: '利雅得七天',                                                            lang: 'CN',       price: 10, stock: 5,    active: true },
  { id: 'oa29', name: '口袋里有个红街市',                                                       lang: 'CN',       price: 12, stock: 3,    active: true },
  { id: 'oa22', name: '洋槐树下的学堂',                                                        lang: 'CN',       price: 23, stock: 5,    active: true },
  { id: 'oa23', name: '别处的月光',                                                            lang: 'CN',       price: 22, stock: 5,    active: true },
  { id: 'oa25', name: '马来素描',                                                              lang: 'CN',       price: 23, stock: 5,    active: true },
  { id: 'oa34', name: '第十一号',                                                              lang: 'CN',       price: 18, stock: 0,    active: true },
  { id: 'oa33', name: '艺术档案库的可能与不可能',                                                lang: 'CN',       price: 28, stock: 0,    active: true },
  { id: 'oa30', name: "普氏野马Przewalski's Horse版画Riso海报",                                 lang: 'CN',       price: 12, stock: 0,    active: true },
];

const isENFirst = lang => !!lang && (lang === 'EN' || lang.startsWith('EN/'));

async function pushSheets(url, txn) {
  if (!url) return false;
  try {
    const rows = txn.items.map(i => ({
      transaction_id: txn.id, timestamp: new Date(txn.ts).toISOString(),
      item_name: i.name, quantity: i.qty, unit_price: i.up, line_total: i.lt,
      payment_method: txn.pay, note: txn.note || '', synced_at: new Date().toISOString(),
      day: txn.day || ''
    }));
    await fetch(url, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify({ action: 'logTransaction', rows })
    });
    return true;
  } catch { return false; }
}

const DEVICE_ID = ld('vt_device', '') || (() => { const d = 'device-' + Math.random().toString(36).slice(2, 6); sv('vt_device', d); return d; })();

function pushItemsSync(url, items, explicit) {
  if (!url) return;
  const payload = items.filter(i => i.active).map(i => ({ id: i.id, name: i.name, price: i.price, stock: i.stock }));
  fetch(url, {
    method: 'POST', mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body: JSON.stringify({ action: 'syncItems', items: payload, device: explicit ? DEVICE_ID : undefined })
  }).catch(() => {});
}

async function pullStockFromSheets(url) {
  if (!url) return null;
  try {
    const res = await fetch(url + '?action=getStock');
    const data = await res.json();
    if (data.ok) return data;
    return null;
  } catch { return null; }
}

function pushPaymentUpdate(url, id, pay) {
  if (!url) return;
  fetch(url, {
    method: 'POST', mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body: JSON.stringify({ action: 'updatePayment', id, pay })
  }).catch(() => {});
}

async function pushDeleteTransactions(url, ids) {
  if (!url || !ids.length) return false;
  try {
    await fetch(url, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify({ action: 'deleteTransactions', ids })
    });
    return true;
  } catch { return false; }
}

// ── SVG nav icons ─────────────────────────────────────────────────────────────
const Icon = {
  items: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
    </svg>
  ),
  log: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <line x1="8" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="20" y2="12"/><line x1="8" y1="18" x2="14" y2="18"/>
      <circle cx="4" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1" fill="currentColor" stroke="none"/>
    </svg>
  ),
  sum: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <line x1="6" y1="20" x2="6" y2="14"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="18" y1="20" x2="18" y2="10"/>
    </svg>
  ),
  admin: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <line x1="4" y1="8" x2="20" y2="8"/><circle cx="8" cy="8" r="2" fill="currentColor" stroke="none"/>
      <line x1="4" y1="16" x2="20" y2="16"/><circle cx="16" cy="16" r="2" fill="currentColor" stroke="none"/>
    </svg>
  ),
};

// ── ItemRow ───────────────────────────────────────────────────────────────────
function ItemRow({ item, cqty, onAdd, onSub }) {
  const [flash, setFlash] = useState(false);
  const prev = useRef(cqty);
  useEffect(() => {
    if (cqty > prev.current) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 380);
      prev.current = cqty;
      return () => clearTimeout(t);
    }
    prev.current = cqty;
  }, [cqty]);
  const oos = item.stock !== null && item.stock <= 0;
  const low = item.stock !== null && item.stock > 0 && item.stock <= 3;
  return (
    <div className={`item-row${flash ? ' flash' : ''}${oos ? ' oos' : ''}`}>
      <div className="ir-info">
        <div className="ir-name-row">
          <span className="ir-name">{item.name}</span>
          {item.lang && <span className={`lang-tag${item.lang.includes('EN') ? ' en' : ''}`}>{item.lang}</span>}
        </div>
        {item.stock !== null && (
          <span className={`ir-stock${oos ? ' oos-label' : low ? ' warn' : ''}`}>
            {oos ? 'sold out' : `${item.stock} left`}
          </span>
        )}
      </div>
      <span className="ir-price">{fmt(item.price)}</span>
      <div className="ir-ctrl">
        {cqty > 0
          ? <><button className="qbtn" onClick={onSub}>−</button><span className="qnum">×{cqty}</span><button className="qbtn" onClick={onAdd}>+</button></>
          : <button className="ir-add" onClick={onAdd} disabled={oos}>+</button>
        }
      </div>
    </div>
  );
}

// ── EditRow ───────────────────────────────────────────────────────────────────
function EditRow({ draft, onChange, onDelete, onMoveUp, onMoveDown, isFirst, isLast }) {
  return (
    <div className="edit-row">
      <div className="er-line1">
        <div className="er-moves">
          <button className="er-move" onClick={onMoveUp} disabled={isFirst}>↑</button>
          <button className="er-move" onClick={onMoveDown} disabled={isLast}>↓</button>
        </div>
        <input className="er-name" value={draft.name} onChange={e => onChange('name', e.target.value)} placeholder="Item name" />
        <button className="er-del" onClick={onDelete}>✕</button>
      </div>
      <div className="er-line2">
        <span className="er-lbl">$</span>
        <input className="er-price" type="number" value={draft.price} onChange={e => onChange('price', e.target.value)} inputMode="decimal" min="0" step="0.01" />
        <span className="er-lbl">stock</span>
        <input className="er-stock" type="number" value={draft.stock ?? ''} onChange={e => onChange('stock', e.target.value)} placeholder="∞" inputMode="numeric" min="0" />
      </div>
    </div>
  );
}

// ── CartPanel ─────────────────────────────────────────────────────────────────
function CartPanel({ cart, items, onQtyChange, onRemove, pay, setPay, note, setNote, onSold, busy, expanded, setExpanded, discount, setDiscount }) {
  const [listOpen, setListOpen] = useState(false);
  const count = cart.reduce((s, c) => s + c.qty, 0);
  const origTotal = cart.reduce((s, c) => { const it = items.find(i => i.id === c.id); return s + (it ? it.price * c.qty : 0); }, 0);
  const total = discount ? +(origTotal * 0.7).toFixed(2) : origTotal;
  if (!count) return null;
  return (
    <div className="cp">
      <div className="cp-handle" onClick={() => setExpanded(e => !e)}>
        <span className="cp-sum"><strong>{count} item{count !== 1 ? 's' : ''}</strong> · {fmt(total)}</span>
        <span className="cp-arrow">{expanded ? '↓' : '↑'}</span>
      </div>
      {expanded && (
        <div className="cp-body">
          <div className="cp-list-toggle" onClick={() => setListOpen(o => !o)}>
            <span>Items</span>
            <span className="cp-arrow">{listOpen ? '▲' : '▼'}</span>
          </div>
          {listOpen && (
            <div className="cl-list">
              {cart.map(c => {
                const it = items.find(i => i.id === c.id);
                if (!it) return null;
                const lineFull = it.price * c.qty;
                const lineDisc = +(lineFull * 0.7).toFixed(2);
                return (
                  <div className="cl" key={c.id}>
                    <span className="cl-name">{it.name}</span>
                    <div className="ir-ctrl">
                      <button className="qbtn" onClick={() => onQtyChange(c.id, -1)} disabled={c.qty <= 1}>−</button>
                      <span className="qnum">{c.qty}</span>
                      <button className="qbtn" onClick={() => onQtyChange(c.id, +1)}>+</button>
                    </div>
                    {discount
                      ? <><span className="cl-tot cl-orig">{fmt(lineFull)}</span><span className="cl-tot cl-disc">{fmt(lineDisc)}</span></>
                      : <span className="cl-tot">{fmt(lineFull)}</span>
                    }
                    <button className="cl-rm" onClick={() => onRemove(c.id)}>✕</button>
                  </div>
                );
              })}
            </div>
          )}
          <div className="pay-pills">
            {['venmo', 'zelle', 'cash'].map(m => (
              <button key={m} className={`ppill${pay === m ? ` s-${m}` : ''}`} onClick={() => setPay(p => p === m ? '' : m)}>
                {PAY_LABEL[m]}
              </button>
            ))}
            <button className={`ppill ppill-disc${discount ? ' s-disc' : ''}`} onClick={() => setDiscount(d => !d)}>-30%</button>
          </div>
          <input className="note-input" placeholder="Note (optional)" value={note} onChange={e => setNote(e.target.value)} />
          <button className="btn-sold" disabled={!pay || busy} onClick={onSold}>
            {busy ? 'Processing…' : discount
              ? <><span className="sold-orig">{fmt(origTotal)}</span> {fmt(total)}</>
              : `Sold  ${fmt(total)}`}
          </button>
        </div>
      )}
    </div>
  );
}

// ── UndoToast ─────────────────────────────────────────────────────────────────
function UndoToast({ txn, onUndo, onDone }) {
  const [s, setS] = useState(15);
  useEffect(() => {
    const t = setInterval(() => setS(v => { if (v <= 1) { clearInterval(t); onDone(); return 0; } return v - 1; }), 1000);
    return () => clearInterval(t);
  }, []);
  const sum = txn.items.map(i => `${i.name}${i.qty > 1 ? ` ×${i.qty}` : ''}`).join(', ');
  return (
    <div className="undo show">
      <span className="u-text">Sold: {sum}</span>
      <span className="u-sec">{s}s</span>
      <button className="u-btn" onClick={onUndo}>Undo</button>
    </div>
  );
}

// ── ConfirmOverlay ────────────────────────────────────────────────────────────
function ConfirmOverlay({ title, body, cancelLabel, confirmLabel, onCancel, onConfirm }) {
  return (
    <div className="overlay">
      <div className="confirm-box">
        <div className="confirm-title">{title}</div>
        <div className="confirm-body">{body}</div>
        <div className="confirm-btns">
          <button className="btn-confirm-cancel" onClick={onCancel}>{cancelLabel || 'Keep Editing'}</button>
          <button className="btn-confirm-discard" onClick={onConfirm}>{confirmLabel || 'Discard'}</button>
        </div>
      </div>
    </div>
  );
}

// ── Header ────────────────────────────────────────────────────────────────────
function Header({ txns, eventDay, sync, onRetry, editMode, onEdit, onDone, onCancel }) {
  const t = useMemo(() => txns.filter(x => inToday(x, eventDay)).reduce(
    (a, x) => { a.tot += x.total; a[x.pay] = (a[x.pay] || 0) + x.total; return a; },
    { tot: 0, venmo: 0, zelle: 0, cash: 0 }
  ), [txns, eventDay]);
  const eventTot = useMemo(() => eventDay > 0
    ? txns.filter(inEvent).reduce((s, x) => s + x.total, 0)
    : 0, [txns, eventDay]);
  const showEventTot = eventDay > 1 && eventTot !== t.tot;
  return (
    <div className="hdr">
      <div className="hdr-top">
        {editMode
          ? <>
              <button className="btn-cancel" onClick={onCancel}>Cancel</button>
              <span className="hdr-edit-title">Edit Items</span>
              <button className="btn-done" onClick={onDone}>Done</button>
            </>
          : <>
              <span className="hdr-title">Book Table{eventDay > 0 ? ` · Day ${eventDay}` : ''}</span>
              <div className="hdr-edit-btns">
                <button className="btn-edit" onClick={onEdit}>Edit</button>
                <button className={`sync sync-${sync}`} onClick={sync === 'error' ? onRetry : undefined}>
                  <span className="dot" /><span>{sync === 'syncing' ? 'syncing' : sync === 'error' ? 'failed' : sync === 'offline' ? 'offline' : 'synced'}</span>
                </button>
              </div>
            </>
        }
      </div>
      {!editMode && (
        <div className="hdr-totals">
          <span className="grand">{fmt(t.tot)}</span>
          {showEventTot && <span className="grand-total">/ {fmt(eventTot)}</span>}
          <div className="chips">
            {t.venmo > 0 && <span className="chip chip-ve">{PAY_LABEL.venmo} {fmt(t.venmo)}</span>}
            {t.zelle > 0 && <span className="chip chip-ze">{PAY_LABEL.zelle} {fmt(t.zelle)}</span>}
            {t.cash  > 0 && <span className="chip chip-ca">{PAY_LABEL.cash} {fmt(t.cash)}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── LogView ───────────────────────────────────────────────────────────────────
function LogView({ txns, eventDay, onEditTxn, onDeleteTxn }) {
  const [dayFilter,   setDayFilter]   = useState('today'); // 'today' | 'all' | day number
  const [payFilter,   setPayFilter]   = useState('all');
  const [exp,         setExp]         = useState(null);
  const [editingNote, setEditingNote] = useState('');

  const eventDays = useMemo(() => getEventDays(txns), [txns]);
  const showAllPill = eventDay > 0 && (eventDays.length > 1 || (eventDays.length >= 1 && !eventDays.includes(eventDay)));

  const rows = useMemo(() => {
    let f;
    if (dayFilter === 'today') f = txns.filter(x => inToday(x, eventDay));
    else if (dayFilter === 'all') f = txns.filter(inEvent);
    else f = txns.filter(x => x.day === dayFilter);
    if (payFilter !== 'all') f = f.filter(x => x.pay === payFilter);
    return f.sort((a, b) => {
      const ad = a.day || 0, bd = b.day || 0;
      if (bd !== ad) return bd - ad;
      return b.ts - a.ts;
    });
  }, [txns, eventDay, dayFilter, payFilter]);

  const toggle = tx => {
    if (exp === tx.id) { setExp(null); }
    else { setExp(tx.id); setEditingNote(tx.note || ''); }
  };

  const dayPills = eventDay > 0;

  return (
    <div>
      <div className="fbar">
        {dayPills && (
          <>
            <button className={`fchip${dayFilter === 'today' ? ' on' : ''}`} onClick={() => setDayFilter('today')}>Today</button>
            {eventDays.filter(d => d !== eventDay).map(dn => (
              <button key={dn} className={`fchip${dayFilter === dn ? ' on' : ''}`} onClick={() => setDayFilter(dn)}>Day {dn}</button>
            ))}
            {showAllPill && (
              <button className={`fchip${dayFilter === 'all' ? ' on' : ''}`} onClick={() => setDayFilter('all')}>All</button>
            )}
            <div className="fbar-sep" />
          </>
        )}
        {['all', 'venmo', 'zelle', 'cash'].map(f => (
          <button key={f} className={`fchip${payFilter === f ? ' on' : ''}`} onClick={() => setPayFilter(f)}>
            {f === 'all' ? 'All' : PAY_LABEL[f]}
          </button>
        ))}
      </div>
      {!rows.length && (
        <div className="empty">
          <div className="empty-icon">—</div>
          <div>
            No sales
            {dayFilter === 'today' ? (eventDay > 0 ? ` on Day ${eventDay}` : ' today')
              : dayFilter === 'all' ? ''
              : ` on Day ${dayFilter}`}
            {payFilter !== 'all' ? ` · ${PAY_LABEL[payFilter]}` : ''}
          </div>
        </div>
      )}
      {dayFilter === 'all'
        ? (() => {
            let lastDay = 0;
            return rows.map(tx => {
              const showDivider = tx.day !== lastDay;
              lastDay = tx.day;
              return (
                <div key={tx.id}>
                  {showDivider && <div className="date-divider">— Day {tx.day} —</div>}
                  {renderTxRow(tx, exp, toggle, editingNote, setEditingNote, onEditTxn, onDeleteTxn, setExp)}
                </div>
              );
            });
          })()
        : rows.map(tx => renderTxRow(tx, exp, toggle, editingNote, setEditingNote, onEditTxn, onDeleteTxn, setExp))
      }
    </div>
  );
}

function renderTxRow(tx, exp, toggle, editingNote, setEditingNote, onEditTxn, onDeleteTxn, setExp) {
  const open = exp === tx.id;
  const sum  = tx.items.map(i => `${i.name}${i.qty > 1 ? ` ×${i.qty}` : ''}`).join(', ');
  return (
    <div className="txrow" key={tx.id}>
      <div className="txmain" onClick={() => toggle(tx)}>
        <span className="txtime">{tstr(tx.ts)}</span>
        <div className="txinfo">
          <div className="txsum">{sum}</div>
          {tx.note && <div className="txnote">"{tx.note}"</div>}
        </div>
        <div className="txr">
          <span className="txtot">{fmt(tx.total)}</span>
          <span className="tx-pay" style={{ color: PC[tx.pay] }}>{PAY_LABEL[tx.pay]}</span>
        </div>
      </div>
      {open && (
        <div className="tx-edit">
          <div className="tx-edit-lines">
            {tx.items.map((it, i) => (
              <div className="txli" key={i}>
                <span>{it.name} ×{it.qty}</span>
                <span>{fmt(it.lt)}</span>
              </div>
            ))}
          </div>
          <div className="pay-pills tx-edit-pay">
            {['venmo', 'zelle', 'cash'].map(m => (
              <button key={m} className={`ppill${tx.pay === m ? ` s-${m}` : ''}`}
                onClick={() => onEditTxn(tx.id, { pay: m })}>
                {PAY_LABEL[m]}
              </button>
            ))}
          </div>
          <input
            className="note-input"
            placeholder="Note (optional)"
            value={editingNote}
            onChange={e => setEditingNote(e.target.value)}
            onBlur={() => onEditTxn(tx.id, { note: editingNote })}
          />
          <button className="tx-delete-btn" onClick={() => { onDeleteTxn(tx.id); setExp(null); }}>
            Delete Transaction
          </button>
        </div>
      )}
    </div>
  );
}

// ── SummaryView ───────────────────────────────────────────────────────────────
function SummaryView({ txns, eventDay }) {
  const [scope, setScope] = useState('today'); // 'today' | 'total'
  const showScope = eventDay > 0 && txns.some(x => x.day && x.day !== eventDay);
  const effectiveScope = showScope ? scope : 'today';
  const rows = effectiveScope === 'total' ? txns.filter(inEvent) : txns.filter(x => inToday(x, eventDay));
  const d = useMemo(() => rows.reduce((a, x) => {
    a.rev += x.total; a[x.pay] = (a[x.pay] || 0) + x.total;
    x.items.forEach(it => { if (!a.im[it.name]) a.im[it.name] = { c: 0, r: 0 }; a.im[it.name].c += it.qty; a.im[it.name].r += it.lt; });
    return a;
  }, { rev: 0, venmo: 0, zelle: 0, cash: 0, im: {} }), [rows]);
  const top = Object.entries(d.im).sort((a, b) => b[1].r - a[1].r).slice(0, 5);
  const avg = rows.length ? d.rev / rows.length : 0;
  const pct = n => d.rev > 0 ? Math.round(n / d.rev * 100) + '%' : '—';
  const bw  = n => d.rev > 0 ? Math.round(n / d.rev * 100) + '%' : '0%';
  const revLabel = effectiveScope === 'total' ? 'Event Revenue' : (eventDay > 0 ? `Day ${eventDay} Revenue` : 'Total Revenue');
  return (
    <div className="sw">
      {showScope && (
        <div className="scope-toggle">
          <button className={`scope-btn${scope === 'today' ? ' on' : ''}`} onClick={() => setScope('today')}>Today</button>
          <button className={`scope-btn${scope === 'total' ? ' on' : ''}`} onClick={() => setScope('total')}>Total</button>
        </div>
      )}
      <div className="totcard">
        <div className="totlbl">{revLabel}</div>
        <div className="totamt">{fmt(d.rev)}</div>
      </div>
      <div className="statrow">
        <div className="statcard"><div className="statval">{rows.length}</div><div className="statlbl">Transactions</div></div>
        <div className="statcard"><div className="statval">{fmt(avg)}</div><div className="statlbl">Avg Sale</div></div>
      </div>
      {effectiveScope === 'total' && (() => {
        const dayMap = {};
        rows.forEach(x => { const dn = x.day || 0; if (!dayMap[dn]) dayMap[dn] = { rev: 0, n: 0 }; dayMap[dn].rev += x.total; dayMap[dn].n++; });
        const dayList = Object.entries(dayMap).map(([dn, v]) => [Number(dn), v]).sort((a, b) => a[0] - b[0]);
        if (dayList.length < 2) return null;
        return (
          <div className="sumsec">
            <div className="seclbl">By Day</div>
            {dayList.map(([dn, v]) => (
              <div className="mrow" key={dn}>
                <span className="mname">{dn === 0 ? 'Untagged' : `Day ${dn}`}</span>
                <div className="mbg"><div className="mbar" style={{ width: bw(v.rev), background: dn === eventDay ? 'var(--ac)' : 'var(--t3)' }} /></div>
                <span className="mamt">{fmt(v.rev)}</span>
                <span className="mpct">{v.n}tx</span>
              </div>
            ))}
          </div>
        );
      })()}
      <div className="sumsec">
        <div className="seclbl">By Payment</div>
        {[['venmo', d.venmo, 've'], ['zelle', d.zelle, 'ze'], ['cash', d.cash, 'ca']].map(([m, amt, k]) => (
          <div className="mrow" key={m}>
            <span className="mname" style={{ color: `var(--${k})` }}>{PAY_LABEL[m]}</span>
            <div className="mbg"><div className={`mbar mbar-${k}`} style={{ width: bw(amt) }} /></div>
            <span className="mamt">{fmt(amt)}</span>
            <span className="mpct">{pct(amt)}</span>
          </div>
        ))}
      </div>
      {top.length > 0 && (
        <div className="sumsec">
          <div className="seclbl">Top Items</div>
          {top.map(([name, data], i) => (
            <div className="toprow" key={name}>
              <span className="toprank">{i + 1}</span>
              <span className="topname">{name}</span>
              <span className="topcnt">×{data.c}</span>
              <span className="toprev">{fmt(data.r)}</span>
            </div>
          ))}
        </div>
      )}
      {!rows.length && <div className="empty"><div className="empty-icon">—</div><div>No sales yet today</div></div>}
    </div>
  );
}

// ── AdminView ─────────────────────────────────────────────────────────────────
function AdminView({ sheetsUrl, setSheetsUrl, txns, eventDay, onReset, onRestoreStock, onLoadDefaults, onUpload, onDownload, syncLog, onStartEvent, onAddNewDay, onEndEvent, onRestoreSnapshot }) {
  const [url, setUrl] = useState(sheetsUrl);
  const [expandedHist, setExpandedHist] = useState(-1);
  const todayN = txns.filter(x => inToday(x, eventDay)).length;
  const todayLabel = eventDay > 0 ? `Day ${eventDay}` : "Today";

  return (
    <div className="aw">
      <div className="asec-hdr"><span className="asec-lbl">Multi-Day Event</span></div>
      {eventDay === 0 ? (
        <div className="srow">
          <span className="srow-label">No event active<br /><span className="srow-sub">Tap Start to begin tracking by day</span></span>
          <button className="sbtn" onClick={onStartEvent}>Start</button>
        </div>
      ) : (
        <>
          <div className="srow">
            <span className="srow-day"><span className="srow-dot" />Day {eventDay}</span>
            <span style={{ flex: 1 }} />
            <button className="sbtn" onClick={onAddNewDay}>+ New Day</button>
          </div>
          <div className="srow" style={{ marginTop: 8 }}>
            <span className="srow-label">End event<br /><span className="srow-sub">Clears day tags. Sales kept by timestamp.</span></span>
            <button className="sbtn sbtn-dn" onClick={onEndEvent}>End</button>
          </div>
        </>
      )}

      <div className="asec-hdr"><span className="asec-lbl">Device Sync</span></div>
      <div className="abox">
        <div className="albl" style={{marginBottom:8,opacity:.7,fontSize:11}}>Device: {DEVICE_ID}</div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn-restore" style={{flex:1}} onClick={onUpload}>Upload</button>
          <button className="btn-restore" style={{flex:1}} onClick={onDownload}>Download</button>
        </div>
        <div className="albl" style={{marginTop:6,opacity:.6,fontSize:11}}>Upload sends your stock to Sheets (transactions auto-push on every sale). Download pulls latest stock + missing transactions; sets eventDay to the latest day found, so a Day 3 staffer joining fresh lands on Day 3 with full history.</div>
      </div>

      {syncLog.length > 0 && (
        <>
          <div className="asec-hdr"><span className="asec-lbl">Sync History</span></div>
          <div className="shist">
            {syncLog.slice(0, 10).map((e, i) => {
              const open = expandedHist === i;
              const hasSnap = !!(e.txns || e.itemsSnap);
              const snapTxns = e.txns || [];
              const snapItems = e.itemsSnap || [];
              const snapTot = snapTxns.reduce((s, x) => s + x.total, 0);
              const snapStock = snapItems.reduce((s, x) => s + (x.stock ?? 0), 0);
              return (
                <div key={i}>
                  <div className="shist-row" onClick={() => hasSnap && setExpandedHist(open ? -1 : i)} style={{ cursor: hasSnap ? 'pointer' : 'default' }}>
                    <span className={`shist-dir ${e.dir}`}>{e.dir.toUpperCase()}</span>
                    <span className="shist-time">{tstr(e.ts)}</span>
                    <span className="shist-dev">{e.device}</span>
                    {hasSnap ? (
                      <>
                        <span style={{ fontSize: 11, color: 'var(--t3)', marginLeft: 'auto' }}>
                          {e.eventDay > 0 ? `Day ${e.eventDay} · ` : ''}{snapTxns.length}tx · {fmt(snapTot)}
                        </span>
                        <span className="shist-restore">{open ? '▴' : '▾'}</span>
                      </>
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--t3)', marginLeft: 'auto', opacity: .5 }}>(legacy)</span>
                    )}
                  </div>
                  {open && hasSnap && (
                    <div className="shist-detail">
                      <div className="shist-detail-hdr"><span>Sales ({snapTxns.length})</span><span>{fmt(snapTot)}</span></div>
                      {(() => {
                        const sorted = [...snapTxns].sort((a, b) => {
                          const ad = a.day || 0, bd = b.day || 0;
                          if (bd !== ad) return bd - ad;
                          return b.ts - a.ts;
                        });
                        let lastDay = -1;
                        return sorted.map((tx, idx) => {
                          const div = tx.day !== lastDay && tx.day;
                          lastDay = tx.day;
                          return (
                            <div key={tx.id || idx}>
                              {div && <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--t3)', padding: '5px 0 2px', letterSpacing: '.3px' }}>— Day {tx.day} —</div>}
                              <div className="shist-detail-row">
                                <span className="shist-detail-name">
                                  <span style={{ color: 'var(--t3)', marginRight: 4 }}>{tstr(tx.ts)}</span>
                                  {tx.items.map(i => `${i.name}${i.qty > 1 ? ` ×${i.qty}` : ''}`).join(', ')}
                                </span>
                                <span className="shist-detail-stock" style={{ color: PC[tx.pay] }}>{fmt(tx.total)}</span>
                              </div>
                            </div>
                          );
                        });
                      })()}
                      <div className="shist-detail-hdr" style={{ marginTop: 8 }}><span>Stock ({snapStock} copies)</span></div>
                      {snapItems.map((s, idx) => (
                        <div key={idx} className="shist-detail-row">
                          <span className="shist-detail-name">{s.name}</span>
                          <span className={`shist-detail-stock${(s.stock ?? 0) === 0 ? ' zero' : ''}`}>{s.stock ?? '∞'}</span>
                        </div>
                      ))}
                      <div className="shist-detail-actions">
                        <button className="sbtn" onClick={ev => { ev.stopPropagation(); onRestoreSnapshot(i); }}>Restore to this</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className="asec-hdr"><span className="asec-lbl">Stock</span></div>
      <div className="abox">
        <button className="btn-restore" onClick={onRestoreStock}>Restore Original Stock Counts</button>
      </div>
      <div className="asec-hdr"><span className="asec-lbl">Items</span></div>
      <div className="abox">
        <button className="btn-restore" onClick={onLoadDefaults}>Load Default Item List</button>
        <div className="albl" style={{marginTop:6,opacity:.6,fontSize:11}}>Replaces all items with the baked-in list. Sales history kept.</div>
      </div>
      <div className="asec-hdr"><span className="asec-lbl">Google Sheets</span></div>
      <div className="abox">
        <div className="albl">Apps Script Web App URL</div>
        <input className="aurl" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://script.google.com/macros/s/…/exec" />
        <div className="aacts"><button className="btn-sm" onClick={() => setSheetsUrl(url)}>Save</button></div>
      </div>
      <div className="asec-hdr"><span className="asec-lbl">Danger Zone</span></div>
      <div className="abox">
        <button className="btn-danger" onClick={onReset}>
          Reset {todayLabel}'s Sales + Restock ({todayN} transaction{todayN !== 1 ? 's' : ''})
        </button>
      </div>
    </div>
  );
}

// ── Nav ───────────────────────────────────────────────────────────────────────
function Nav({ tab, set }) {
  const tabs = [
    { id: 'items', lbl: 'Items',   Ic: Icon.items },
    { id: 'log',   lbl: 'Log',     Ic: Icon.log   },
    { id: 'sum',   lbl: 'Summary', Ic: Icon.sum   },
    { id: 'admin', lbl: 'Settings',Ic: Icon.admin  },
  ];
  return (
    <nav className="nav">
      {tabs.map(({ id, lbl, Ic }) => (
        <button key={id} className={`ntab${tab === id ? ' on' : ''}`} onClick={() => set(id)}>
          <span className="nicon"><Ic /></span>
          <span>{lbl}</span>
        </button>
      ))}
    </nav>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [items,      setItems]      = useState(() => {
    const savedVer = ld('vt_catalog_ver', 0);
    if (savedVer < CATALOG_VERSION) { sv('vt_catalog_ver', CATALOG_VERSION); return DEFAULTS; }
    return ld('vt_items', DEFAULTS);
  });
  const [txns,       setTxns]       = useState(() => ld('vt_txns', []));
  const [cart,       setCart]       = useState([]);
  const [tab,        setTab]        = useState('items');
  const [eventDay,   setEventDay]   = useState(() => ld('vt_eventday', 0));

  // edit mode
  const [editMode,         setEditMode]         = useState(false);
  const [editDraft,        setEditDraft]        = useState(null);
  const [isDirty,          setIsDirty]          = useState(false);
  const [showCancelConfirm,setShowCancelConfirm]= useState(false);

  // cart panel
  const [cartExpanded, setCartExpanded] = useState(false);
  const [cartPay,      setCartPay]      = useState('');
  const [cartNote,     setCartNote]     = useState('');
  const [cartBusy,     setCartBusy]     = useState(false);
  const [cartDiscount, setCartDiscount] = useState(false);

  // sync
  const [undoTxn,   setUndoTxn]     = useState(null);
  const [sync,      setSync]        = useState('synced');
  const [syncLog,   setSyncLog]     = useState(() => ld('vt_synclog', []));
  const [sheetsUrl, setSheetsUrl]  = useState(() => ld('vt_url', 'https://script.google.com/macros/s/AKfycbzypD6gRdRlx1JV-upbp8K1HBAa6LSDR4HOc7pRCvb7C5ZVJMzuS_39IHho9VEtr9pAsQ/exec'));
  const [queue,     setQueue]      = useState(() => ld('vt_q', []));
  const [lastPay,   setLastPay]    = useState(() => ld('vt_lastpay', ''));

  useEffect(() => sv('vt_items',    items),    [items]);
  useEffect(() => sv('vt_txns',     txns),     [txns]);
  useEffect(() => sv('vt_url',      sheetsUrl),[sheetsUrl]);
  useEffect(() => sv('vt_synclog',  syncLog),  [syncLog]);
  useEffect(() => sv('vt_q',        queue),    [queue]);
  useEffect(() => sv('vt_eventday', eventDay), [eventDay]);

  // flush sync queue
  useEffect(() => {
    if (!sheetsUrl || !queue.length) return;
    let live = true;
    (async () => {
      setSync('syncing');
      const fail = [];
      for (const txn of queue) {
        const ok = await pushSheets(sheetsUrl, txn);
        if (ok) setTxns(p => p.map(t => t.id === txn.id ? { ...t, synced: true } : t));
        else fail.push(txn);
      }
      if (!live) return;
      setQueue(fail);
      setSync(fail.length ? 'error' : 'synced');
      if (!fail.length) pushItemsSync(sheetsUrl, items);
    })();
    return () => { live = false; };
  }, [sheetsUrl, queue.length]);

  // ── edit mode ────────────────────────────────────────────────────────────────
  const buildDraft = () => items.filter(i => i.active).map(i => ({
    ...i, price: String(i.price), stock: i.stock !== null ? String(i.stock) : ''
  }));

  const enterEdit = () => {
    setEditDraft(buildDraft());
    setIsDirty(false);
    setEditMode(true);
  };

  const enterEditWithNew = () => {
    const newItem = { id: iid(), name: '', price: '0', stock: '', active: true };
    setEditDraft([...buildDraft(), newItem]);
    setIsDirty(true);
    setEditMode(true);
  };

  const draftChange = (id, field, val) => {
    setIsDirty(true);
    setEditDraft(p => p.map(it => it.id === id ? { ...it, [field]: val } : it));
  };

  const draftDelete = id => {
    setIsDirty(true);
    setEditDraft(p => p.filter(it => it.id !== id));
  };

  const draftAddNew = () => {
    setIsDirty(true);
    setEditDraft(p => [...p, { id: iid(), name: '', price: '0', stock: '', active: true }]);
  };

  const draftMoveUp = id => {
    setEditDraft(p => {
      const i = p.findIndex(it => it.id === id);
      if (i <= 0) return p;
      const n = [...p];
      [n[i - 1], n[i]] = [n[i], n[i - 1]];
      return n;
    });
    setIsDirty(true);
  };

  const draftMoveDown = id => {
    setEditDraft(p => {
      const i = p.findIndex(it => it.id === id);
      if (i >= p.length - 1) return p;
      const n = [...p];
      [n[i], n[i + 1]] = [n[i + 1], n[i]];
      return n;
    });
    setIsDirty(true);
  };

  const commitEdit = () => {
    const committed = editDraft
      .filter(d => d.name.trim())
      .map(d => ({
        ...d,
        name:   d.name.trim(),
        price:  parseFloat(d.price) || 0,
        stock:  d.stock !== '' ? Math.max(0, parseInt(d.stock, 10) || 0) : null,
        active: true,
      }));
    setItems(committed);
    setEditMode(false);
    setEditDraft(null);
    setIsDirty(false);
    pushItemsSync(sheetsUrl, committed);
  };

  const cancelEdit = () => {
    if (isDirty) setShowCancelConfirm(true);
    else { setEditMode(false); setEditDraft(null); }
  };

  const discardEdit = () => {
    setEditMode(false);
    setEditDraft(null);
    setIsDirty(false);
    setShowCancelConfirm(false);
  };

  // pre-select last payment when first item added to empty cart
  useEffect(() => {
    if (cart.length > 0 && !cartPay && lastPay) setCartPay(lastPay);
  }, [cart.length]);

  // ── cart ─────────────────────────────────────────────────────────────────────
  const addToCart = useCallback(id => {
    setCart(p => {
      const i = p.findIndex(c => c.id === id);
      if (i >= 0) { const n = [...p]; n[i] = { ...n[i], qty: n[i].qty + 1 }; return n; }
      return [...p, { id, qty: 1 }];
    });
    setCartExpanded(true);
  }, []);

  const subFromCart = useCallback(id => {
    setCart(p => {
      const i = p.findIndex(c => c.id === id);
      if (i < 0) return p;
      const n = [...p];
      if (n[i].qty <= 1) return p.filter(c => c.id !== id);
      n[i] = { ...n[i], qty: n[i].qty - 1 };
      return n;
    });
  }, []);

  const cartQtyChange = (id, delta) => { if (delta > 0) addToCart(id); else subFromCart(id); };
  const cartRemove    = id => setCart(p => p.filter(c => c.id !== id));

  const sellCart = async () => {
    if (!cartPay || cartBusy) return;
    setCartBusy(true);
    const factor = cartDiscount ? 0.7 : 1;
    const discNote = cartDiscount ? (cartNote ? cartNote + ' | 30% off' : '30% off') : cartNote;
    const txn = {
      id:    uid(),
      ts:    Date.now(),
      day:   eventDay > 0 ? eventDay : undefined,
      items: cart.map(c => {
        const it = items.find(i => i.id === c.id);
        const up = +(it.price * factor).toFixed(2);
        return { id: c.id, name: it.name, up, qty: c.qty, lt: +(up * c.qty).toFixed(2) };
      }),
      total: +cart.reduce((s, c) => { const it = items.find(i => i.id === c.id); return s + (it ? +(it.price * factor).toFixed(2) * c.qty : 0); }, 0).toFixed(2),
      pay:   cartPay,
      note:  discNote,
      synced: false,
    };
    const newItems = items.map(it => {
      const s = txn.items.find(i => i.id === it.id);
      if (s && it.stock !== null) return { ...it, stock: Math.max(0, it.stock - s.qty) };
      return it;
    });
    setItems(newItems);
    setTxns(p => [txn, ...p]);
    setLastPay(cartPay);
    sv('vt_lastpay', cartPay);
    setCart([]);
    setCartPay('');
    setCartNote('');
    setCartDiscount(false);
    setCartExpanded(false);
    setCartBusy(false);
    setUndoTxn(txn);
    pushItemsSync(sheetsUrl, newItems);
    if (sheetsUrl) {
      setSync('syncing');
      const ok = await pushSheets(sheetsUrl, txn);
      if (ok) { setTxns(p => p.map(t => t.id === txn.id ? { ...t, synced: true } : t)); setSync('synced'); }
      else    { setQueue(p => [...p, txn]); setSync(navigator.onLine ? 'error' : 'offline'); }
    }
  };

  const undo = () => {
    if (!undoTxn) return;
    const txn = undoTxn;
    const newItems = items.map(it => {
      const s = txn.items.find(i => i.id === it.id);
      if (s && it.stock !== null) return { ...it, stock: it.stock + s.qty };
      return it;
    });
    setItems(newItems);
    setTxns(p  => p.filter(t => t.id !== txn.id));
    setQueue(p => p.filter(t => t.id !== txn.id));
    setUndoTxn(null);
    pushItemsSync(sheetsUrl, newItems);
    pushDeleteTransactions(sheetsUrl, [txn.id]);
  };

  const editTxn = (id, changes) => {
    setTxns(p => p.map(t => t.id === id ? { ...t, ...changes } : t));
    if (changes.pay) pushPaymentUpdate(sheetsUrl, id, changes.pay);
  };

  const deleteTxn = id => {
    if (!confirm('Delete this transaction and restore its stock?')) return;
    const txn = txns.find(t => t.id === id);
    if (!txn) return;
    const newItems = items.map(it => {
      const s = txn.items.find(i => i.id === it.id);
      if (s && it.stock !== null) return { ...it, stock: it.stock + s.qty };
      return it;
    });
    setItems(newItems);
    setTxns(p  => p.filter(t => t.id !== id));
    setQueue(p => p.filter(t => t.id !== id));
    pushItemsSync(sheetsUrl, newItems);
    pushDeleteTransactions(sheetsUrl, [id]);
  };

  const resetToday = async () => {
    const label = eventDay > 0 ? `Day ${eventDay}` : "today";
    if (!confirm(`Reset ${label}'s sales and restore stock?`)) return;
    const todayTxns = txns.filter(x => inToday(x, eventDay));
    const sold = {};
    todayTxns.forEach(txn => txn.items.forEach(it => {
      sold[it.id] = (sold[it.id] || 0) + it.qty;
    }));
    const newItems = items.map(it => {
      const qty = sold[it.id] || 0;
      if (qty > 0 && it.stock !== null) return { ...it, stock: it.stock + qty };
      return it;
    });
    setItems(newItems);
    setTxns(p => p.filter(x => !inToday(x, eventDay)));
    setQueue(p => p.filter(x => !todayTxns.find(t => t.id === x.id)));
    setUndoTxn(null);
    pushItemsSync(sheetsUrl, newItems);
    if (sheetsUrl && todayTxns.length) {
      setSync('syncing');
      const ok = await pushDeleteTransactions(sheetsUrl, todayTxns.map(t => t.id));
      setSync(ok ? 'synced' : 'error');
    }
  };

  const startEvent = () => {
    const untagged = txns.filter(t => !t.day).length;
    const msg = untagged > 0
      ? `Start multi-day event? ${untagged} existing sale${untagged !== 1 ? 's' : ''} will be tagged as Day 1.`
      : "Start multi-day event? New sales will be tagged Day 1.";
    if (!confirm(msg)) return;
    setEventDay(1);
    setTxns(p => p.map(t => t.day ? t : { ...t, day: 1 }));
  };

  const addNewDay = () => {
    const next = eventDay + 1;
    if (!confirm(`Start Day ${next}? All new sales will be tagged Day ${next}.\n\n(You cannot undo this.)`)) return;
    setEventDay(next);
  };

  const endEvent = () => {
    if (!confirm("End the event? Day tags will be cleared from all sales (history is kept by timestamp). You can start a new event later.")) return;
    setEventDay(0);
    setTxns(p => p.map(t => {
      if (t.day) { const { day, ...rest } = t; return rest; }
      return t;
    }));
  };

  const restoreOriginalStock = () => {
    if (!confirm("Restore all stock to original counts from the spreadsheet?")) return;
    const newItems = items.map(it => {
      const def = DEFAULTS.find(d => d.id === it.id);
      return def ? { ...it, stock: def.stock } : it;
    });
    setItems(newItems);
    pushItemsSync(sheetsUrl, newItems);
  };

  const snapshot = (newItems, newTxns) => ({
    eventDay,
    txns: newTxns.map(t => ({
      id: t.id, ts: t.ts, day: t.day,
      items: t.items.map(i => ({ id: i.id, name: i.name, up: i.up, qty: i.qty, lt: i.lt })),
      total: t.total, pay: t.pay, note: t.note || '',
    })),
    itemsSnap: newItems.filter(i => i.active).map(i => ({ id: i.id, name: i.name, price: i.price, stock: i.stock })),
  });

  const downloadFromSheets = async () => {
    if (!sheetsUrl) { alert('Set Google Sheets URL first.'); return; }
    if (!confirm("Download stock + last 7 days of transactions?\n\nLocal stock will be overwritten by Sheets. Existing local sales kept.")) return;
    const daysBack = 7;
    setSync('syncing');
    try {
      // 1. Stock
      const stockData = await pullStockFromSheets(sheetsUrl);
      if (!stockData || !stockData.items) {
        setSync('error');
        alert('Failed to fetch stock. Check connection or Apps Script deployment.');
        return;
      }
      const remote = stockData.items;
      const newItems = items.map(it => {
        let match = remote.find(r => r.id && r.id === it.id);
        if (!match) match = remote.find(r => r.name && r.name === it.name);
        if (match) return { ...it, stock: match.stock };
        return it;
      });
      setItems(newItems);

      // 2. Transactions
      const res = await fetch(sheetsUrl + '?action=getTransactions');
      const txData = await res.json();
      if (!txData || !txData.transactions) {
        setSync('error');
        alert(`Stock synced for ${remote.length} items, but the transactions endpoint isn't deployed yet. Update Apps Script to the latest apps-script.js and redeploy to enable transaction sync.`);
        return;
      }
      const cutoff = Date.now() - daysBack * 24 * 3600 * 1000;
      const recent = txData.transactions.filter(t => t.ts >= cutoff);
      const localIds = new Set(txns.map(t => t.id));
      const fresh = recent.filter(t => !localIds.has(t.id));
      let untagged = 0;
      fresh.forEach(t => {
        if (t.day === null || t.day === undefined || t.day === 0) { t.day = 1; untagged++; }
        t.synced = true;
      });
      const merged = [...fresh, ...txns].sort((a, b) => b.ts - a.ts);
      setTxns(merged);
      const maxDay = merged.reduce((m, t) => Math.max(m, t.day || 0), 0);
      if (maxDay > 0 && maxDay !== eventDay) setEventDay(maxDay);

      const entry = { ts: Date.now(), dir: 'pull', device: DEVICE_ID, ...snapshot(newItems, merged) };
      setSyncLog(log => [entry, ...log].slice(0, 10));

      setSync('synced');
      const sum = fresh.reduce((s, t) => s + t.total, 0);
      const noteParts = [
        `Stock: ${remote.length} items`,
        `Transactions: ${fresh.length} new${fresh.length ? ` ($${sum.toFixed(2)})` : ''}`,
      ];
      if (maxDay > 0) noteParts.push(`eventDay: ${maxDay}`);
      if (untagged > 0) noteParts.push(`${untagged} legacy untagged rows defaulted to Day 1`);
      alert('Downloaded.\n• ' + noteParts.join('\n• '));
    } catch (e) {
      setSync('error');
      alert('Failed: ' + e.message);
    }
  };

  const uploadToSheets = () => {
    if (!sheetsUrl) { alert('Set Google Sheets URL first.'); return; }
    if (!confirm("Upload your current stock to Sheets? This overwrites the shared stock counts.")) return;
    pushItemsSync(sheetsUrl, items, true);
    const entry = { ts: Date.now(), dir: 'push', device: DEVICE_ID, ...snapshot(items, txns) };
    setSyncLog(log => [entry, ...log].slice(0, 10));
    alert('Uploaded stock to Sheets. (Transactions auto-push on each sale, no manual upload needed.)');
  };

  const restoreSnapshot = idx => {
    const entry = syncLog[idx];
    if (!entry || (!entry.txns && !entry.itemsSnap)) return;
    if (!confirm(`Restore to this snapshot? Local sales and stock will be replaced with the snapshot from ${tstr(entry.ts)}.\n\n(This is local only — Google Sheets is not changed.)`)) return;
    if (entry.itemsSnap) {
      const stockMap = new Map(entry.itemsSnap.map(s => [s.id, s.stock]));
      setItems(prev => prev.map(it => stockMap.has(it.id) ? { ...it, stock: stockMap.get(it.id) } : it));
    }
    if (entry.txns) {
      setTxns(entry.txns.map(t => ({
        id: t.id, ts: t.ts, day: t.day,
        items: t.items.map(i => ({ id: i.id, name: i.name, up: i.up, qty: i.qty, lt: i.lt })),
        total: t.total, pay: t.pay, note: t.note || '',
        synced: true,
      })));
    }
    if (typeof entry.eventDay === 'number') setEventDay(entry.eventDay);
  };

  const loadDefaultItems = () => {
    if (!confirm("Replace all items with the default list? Your sales history is kept.")) return;
    setItems(DEFAULTS);
    pushItemsSync(sheetsUrl, DEFAULTS);
  };

  // ── derived item lists ───────────────────────────────────────────────────────
  const [sortLang,  setSortLang]  = useState(false);
  const [sortStock, setSortStock] = useState(false);

  const applySort = arr => {
    if (!sortLang && !sortStock) return arr;
    return [...arr].sort((a, b) => {
      if (sortLang) {
        const ae = a.lang?.includes('EN'), be = b.lang?.includes('EN');
        if (ae !== be) return ae ? -1 : 1;
      }
      if (sortStock) {
        const an = a.stock === null, bn = b.stock === null;
        if (an !== bn) return an ? 1 : -1;       // unlimited goes after tracked
        if (!an && !bn) return a.stock - b.stock; // low stock first
      }
      return 0;
    });
  };

  const activeItems  = items.filter(i => i.active);
  const inStockItems = applySort(activeItems.filter(i => i.stock === null || i.stock > 0));
  const oosItems     = applySort(activeItems.filter(i => i.stock !== null && i.stock <= 0));

  return (
    <>
      <Header
        txns={txns} eventDay={eventDay} sync={sync} onRetry={() => setQueue(q => [...q])}
        editMode={editMode}
        onEdit={enterEdit} onDone={commitEdit} onCancel={cancelEdit}
      />

      <div className="main">
        {tab === 'items' && (
          <div className="items-list">
            {editMode ? (
              <>
                {editDraft.map((item, idx) => (
                  <EditRow
                    key={item.id} draft={item}
                    onChange={(f, v) => draftChange(item.id, f, v)}
                    onDelete={() => draftDelete(item.id)}
                    onMoveUp={() => draftMoveUp(item.id)}
                    onMoveDown={() => draftMoveDown(item.id)}
                    isFirst={idx === 0}
                    isLast={idx === editDraft.length - 1}
                  />
                ))}
                <button className="btn-add-item" onClick={draftAddNew}>+ Add Item</button>
              </>
            ) : (
              <>
                <div className="sort-bar">
                  <button className={`sort-btn${sortLang  ? ' on' : ''}`} onClick={() => setSortLang(v => !v)}>EN</button>
                  <button className={`sort-btn${sortStock ? ' on' : ''}`} onClick={() => setSortStock(v => !v)}>Stock</button>
                </div>
                {inStockItems.map(item => (
                  <ItemRow
                    key={item.id} item={item}
                    cqty={cart.find(c => c.id === item.id)?.qty || 0}
                    onAdd={() => addToCart(item.id)}
                    onSub={() => subFromCart(item.id)}
                  />
                ))}
                {oosItems.length > 0 && (
                  <>
                    <div className="section-divider">Sold Out</div>
                    {oosItems.map(item => (
                      <ItemRow key={item.id} item={item} cqty={0} onAdd={() => {}} onSub={() => {}} />
                    ))}
                  </>
                )}
                <button className="btn-add-item" onClick={enterEditWithNew}>+ Add item</button>
              </>
            )}
          </div>
        )}
        {tab === 'log'   && <LogView txns={txns} eventDay={eventDay} onEditTxn={editTxn} onDeleteTxn={deleteTxn} />}
        {tab === 'sum'   && <SummaryView txns={txns} eventDay={eventDay} />}
        {tab === 'admin' && (
          <AdminView
            sheetsUrl={sheetsUrl} setSheetsUrl={setSheetsUrl}
            txns={txns} eventDay={eventDay}
            onReset={resetToday} onRestoreStock={restoreOriginalStock} onLoadDefaults={loadDefaultItems}
            onUpload={uploadToSheets} onDownload={downloadFromSheets} syncLog={syncLog}
            onStartEvent={startEvent} onAddNewDay={addNewDay} onEndEvent={endEvent}
            onRestoreSnapshot={restoreSnapshot}
          />
        )}
      </div>

      {!editMode && (
        <CartPanel
          cart={cart} items={items}
          onQtyChange={cartQtyChange} onRemove={cartRemove}
          pay={cartPay} setPay={setCartPay}
          note={cartNote} setNote={setCartNote}
          onSold={sellCart} busy={cartBusy}
          expanded={cartExpanded} setExpanded={setCartExpanded}
          discount={cartDiscount} setDiscount={setCartDiscount}
        />
      )}

      <Nav tab={tab} set={t => { if (!editMode) setTab(t); }} />

      {undoTxn && <UndoToast txn={undoTxn} onUndo={undo} onDone={() => setUndoTxn(null)} />}

      {showCancelConfirm && (
        <ConfirmOverlay
          title="Discard changes?"
          body="You have unsaved edits. Discard them?"
          cancelLabel="Keep Editing"
          confirmLabel="Discard"
          onCancel={() => setShowCancelConfirm(false)}
          onConfirm={discardEdit}
        />
      )}
    </>
  );
}
