import { useState, useEffect, useCallback, useRef, useMemo } from "react";

// ── helpers ──────────────────────────────────────────────────────────────────
const fmt = n => '$' + Number(n).toFixed(2);
const uid = () => 't' + Date.now() + Math.random().toString(36).slice(2, 5);
const iid = () => 'i' + Date.now();
const tstr = d => { const dt = new Date(d), h = dt.getHours(), m = String(dt.getMinutes()).padStart(2,'0'); return `${h%12||12}:${m}${h>=12?'pm':'am'}`; };
const ld = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
const sv = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const isToday = ts => new Date(ts).toDateString() === new Date().toDateString();
const PE = { venmo: '💜', zelle: '🟩', cash: '💵' };
const PC = { venmo: 'var(--ve)', zelle: 'var(--ze)', cash: 'var(--ca)' };

const DEFAULTS = [
  { id:  '1', name: 'Three Stories',                              emoji: '📚', price: 22, stock: 6,    active: true },
  { id:  '2', name: '51人：第十一届上海双年展项目',                    emoji: '📚', price: 16, stock: null, active: true },
  { id:  '3', name: 'The Village of Proof 证据村',                  emoji: '📚', price: 15, stock: null, active: true },
  { id:  '4', name: 'Blue Jean Pocket Writers Handbook',           emoji: '📚', price: 6,  stock: null, active: true },
  { id:  '5', name: '51 Personae: Tarwewijk',                      emoji: '📚', price: 22, stock: 4,    active: true },
  { id:  '6', name: 'Seed of Memory',                              emoji: '📚', price: 20, stock: 6,    active: true },
  { id:  '7', name: '温州记 Journey to Wenzhou',                    emoji: '📚', price: 17, stock: 5,    active: true },
  { id:  '8', name: '墙洞 Hole in the Wall',                       emoji: '📚', price: 12, stock: 6,    active: true },
  { id:  '9', name: '卡拉什尼科夫 Kalashnikov',                     emoji: '📚', price: 22, stock: 5,    active: true },
  { id: '10', name: '飞鸟与工厂',                                   emoji: '📚', price: 25, stock: null, active: true },
  { id: '11', name: '51摊 51 Tan (a set of three)',                 emoji: '📚', price: 22, stock: 5,    active: true },
  { id: '12', name: 'Stand With Her woodcut journal',              emoji: '📚', price: 12, stock: null, active: true },
  { id: '13', name: 'Deep Simulator 深渊模拟器',                    emoji: '📚', price: 26, stock: 4,    active: true },
  { id: '14', name: 'Beijing Underground',                         emoji: '📚', price: 15, stock: 6,    active: true },
  { id: '15', name: '无苦无忧 No Misery',                           emoji: '📚', price: 42, stock: null, active: true },
  { id: '16', name: 'Working Class History 2026 挂历',              emoji: '📚', price: 12, stock: null, active: true },
  { id: '17', name: '亚际木刻版画 Inter Asia Woodcut Mapping 第四期', emoji: '📚', price: 20, stock: null, active: true },
  { id: '18', name: '飞鸟与工厂 版画一套12张',                       emoji: '📚', price: 9,  stock: null, active: true },
  { id: '19', name: '洋槐树下的学堂',                               emoji: '📚', price: 23, stock: 3,    active: true },
  { id: '20', name: '别处的月光',                                   emoji: '📚', price: 22, stock: 2,    active: true },
  { id: '21', name: '旅行者的欲望',                                  emoji: '📚', price: 18, stock: null, active: true },
  { id: '22', name: '马来素描',                                     emoji: '📚', price: 23, stock: 2,    active: true },
  { id: '23', name: '碧曲口述',                                     emoji: '📚', price: 13, stock: null, active: true },
  { id: '24', name: 'A3BC',                                        emoji: '📚', price: 15, stock: null, active: true },
  { id: '25', name: '利雅得七天',                                   emoji: '📚', price: 10, stock: 3,    active: true },
  { id: '26', name: '口袋里有个红街市',                              emoji: '📚', price: 12, stock: null, active: true },
  { id: '27', name: '每日的工人阶级史',                              emoji: '📚', price: 22, stock: 1,    active: true },
  { id: '28', name: '新加坡华族木偶戏',                              emoji: '📚', price: 48, stock: 2,    active: true },
  { id: '29', name: '艺术档案（库）的可能与不可能',                    emoji: '📚', price: 30, stock: 3,    active: true },
  { id: '30', name: '第十一号',                                     emoji: '📚', price: 18, stock: 2,    active: true },
];

async function pushSheets(url, txn) {
  if (!url) return false;
  try {
    const rows = txn.items.map(i => ({
      transaction_id: txn.id, timestamp: new Date(txn.ts).toISOString(),
      item_name: i.name, quantity: i.qty, unit_price: i.up, line_total: i.lt,
      payment_method: txn.pay, note: txn.note || '', synced_at: new Date().toISOString()
    }));
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logTransaction', rows }) });
    return r.ok;
  } catch { return false; }
}

// ── ItemRow ───────────────────────────────────────────────────────────────────
function ItemRow({ item, cqty, onAdd, onSub }) {
  const [flash, setFlash] = useState(false);
  const prev = useRef(cqty);
  useEffect(() => {
    if (cqty > prev.current) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 400);
      prev.current = cqty;
      return () => clearTimeout(t);
    }
    prev.current = cqty;
  }, [cqty]);
  const oos = item.stock !== null && item.stock <= 0;
  const low = item.stock !== null && item.stock > 0 && item.stock <= 3;
  return (
    <div className={`item-row${flash ? ' flash' : ''}${oos ? ' oos' : ''}`}>
      <span className="ir-emoji">{item.emoji}</span>
      <div className="ir-info">
        <span className="ir-name">{item.name}</span>
        {item.stock !== null && <span className={`ir-stock${low ? ' warn' : ''}`}>{oos ? 'sold out' : `${item.stock} left`}</span>}
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
function EditRow({ draft, onChange, onDelete }) {
  return (
    <div className="edit-row">
      <div className="er-line1">
        <input className="er-emoji" value={draft.emoji} onChange={e => onChange('emoji', e.target.value)} maxLength={2} />
        <input className="er-name" value={draft.name} onChange={e => onChange('name', e.target.value)} placeholder="Name" />
      </div>
      <div className="er-line2">
        <span className="er-lbl">$</span>
        <input className="er-price" type="number" value={draft.price} onChange={e => onChange('price', e.target.value)} inputMode="decimal" min="0" step="0.01" />
        <span className="er-lbl">stock</span>
        <input className="er-stock" type="number" value={draft.stock ?? ''} onChange={e => onChange('stock', e.target.value)} placeholder="∞" inputMode="numeric" min="0" />
        <button className="er-del" onClick={onDelete}>🗑️</button>
      </div>
    </div>
  );
}

// ── CartPanel ─────────────────────────────────────────────────────────────────
function CartPanel({ cart, items, onQtyChange, onRemove, pay, setPay, note, setNote, onSold, busy, expanded, setExpanded }) {
  const count = cart.reduce((s, c) => s + c.qty, 0);
  const total = cart.reduce((s, c) => { const it = items.find(i => i.id === c.id); return s + (it ? it.price * c.qty : 0); }, 0);
  if (!count) return null;
  return (
    <div className="cp">
      <div className="cp-handle" onClick={() => setExpanded(e => !e)}>
        <span className="cp-sum"><strong>{count} item{count !== 1 ? 's' : ''}</strong> · {fmt(total)}</span>
        <span className="cp-arrow">{expanded ? '▼' : '▲'}</span>
      </div>
      {expanded && (
        <div className="cp-body">
          {cart.map(c => {
            const it = items.find(i => i.id === c.id);
            if (!it) return null;
            return (
              <div className="cl" key={c.id}>
                <span className="cl-emoji">{it.emoji}</span>
                <span className="cl-name">{it.name}</span>
                <div className="ir-ctrl">
                  <button className="qbtn" onClick={() => onQtyChange(c.id, -1)} disabled={c.qty <= 1}>−</button>
                  <span className="qnum">{c.qty}</span>
                  <button className="qbtn" onClick={() => onQtyChange(c.id, +1)}>+</button>
                </div>
                <span className="cl-tot">{fmt(it.price * c.qty)}</span>
                <button className="cl-rm" onClick={() => onRemove(c.id)}>×</button>
              </div>
            );
          })}
          <div className="cp-total"><span>Total</span><span>{fmt(total)}</span></div>
          <div className="pay-pills">
            {['venmo', 'zelle', 'cash'].map(m => (
              <button key={m} className={`ppill${pay === m ? ` s-${m}` : ''}`} onClick={() => setPay(p => p === m ? '' : m)}>
                {PE[m]} {m[0].toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
          <input className="note-input" placeholder="Note (optional)" value={note} onChange={e => setNote(e.target.value)} />
          <button className="btn-sold" disabled={!pay || busy} onClick={onSold}>
            {busy ? '…' : `✓ SOLD — ${fmt(total)}`}
          </button>
        </div>
      )}
    </div>
  );
}

// ── UndoToast ─────────────────────────────────────────────────────────────────
function UndoToast({ txn, onUndo, onDone }) {
  const [s, setS] = useState(30);
  useEffect(() => {
    const t = setInterval(() => setS(v => { if (v <= 1) { clearInterval(t); onDone(); return 0; } return v - 1; }), 1000);
    return () => clearInterval(t);
  }, []);
  const sum = txn.items.map(i => `${i.name}${i.qty > 1 ? ` ×${i.qty}` : ''}`).join(', ');
  return (
    <div className="undo show">
      <span className="u-text">Sold: {sum}</span>
      <span className="u-sec">{s}s</span>
      <button className="u-btn" onClick={onUndo}>UNDO</button>
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
function Header({ txns, sync, onRetry, editMode, onEdit, onDone, onCancel }) {
  const t = useMemo(() => txns.filter(x => isToday(x.ts)).reduce((a, x) => { a.tot += x.total; a[x.pay] = (a[x.pay] || 0) + x.total; return a; }, { tot: 0, venmo: 0, zelle: 0, cash: 0 }), [txns]);
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
              <span className="hdr-title">🛍️ Vending Tracker</span>
              <div className="hdr-edit-btns">
                <button className="btn-edit" onClick={onEdit}>Edit</button>
                <button className={`sync sync-${sync}`} onClick={sync === 'error' ? onRetry : undefined}>
                  <span className="dot" /><span>{sync === 'syncing' ? 'syncing…' : sync === 'error' ? 'failed' : sync === 'offline' ? 'offline' : 'synced'}</span>
                </button>
              </div>
            </>
        }
      </div>
      {!editMode && (
        <div className="hdr-totals">
          <span className="grand">{fmt(t.tot)}</span>
          <div className="chips">
            {t.venmo > 0 && <span className="chip chip-ve">💜{fmt(t.venmo)}</span>}
            {t.zelle > 0 && <span className="chip chip-ze">🟩{fmt(t.zelle)}</span>}
            {t.cash > 0 && <span className="chip chip-ca">💵{fmt(t.cash)}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── LogView ───────────────────────────────────────────────────────────────────
function LogView({ txns }) {
  const [filter, setFilter] = useState('all');
  const [exp, setExp] = useState(null);
  const rows = useMemo(() => txns.filter(x => isToday(x.ts) && (filter === 'all' || x.pay === filter)).sort((a, b) => b.ts - a.ts), [txns, filter]);
  return (
    <div>
      <div className="fbar">
        {['all', 'venmo', 'zelle', 'cash'].map(f => (
          <button key={f} className={`fchip${filter === f ? ' on' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : PE[f] + ' ' + f[0].toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>
      {!rows.length && <div className="empty"><div className="empty-icon">📋</div><div>No sales yet{filter !== 'all' ? ' for ' + filter : ' today'}</div></div>}
      {rows.map(tx => {
        const open = exp === tx.id;
        const sum = tx.items.map(i => `${i.name}${i.qty > 1 ? ` ×${i.qty}` : ''}`).join(', ');
        return (
          <div className="txrow" key={tx.id} onClick={() => setExp(open ? null : tx.id)}>
            <div className="txmain">
              <span className="txtime">{tstr(tx.ts)}</span>
              <div className="txinfo">
                <div className="txsum">{sum}</div>
                {tx.note && <div className="txnote">"{tx.note}"</div>}
              </div>
              <div className="txr">
                <span className="txtot">{fmt(tx.total)}</span>
                <span style={{ fontSize: 12, color: PC[tx.pay] }}>{PE[tx.pay]} {tx.pay}</span>
              </div>
            </div>
            <div className={`txlines${open ? ' open' : ''}`}>
              {tx.items.map((it, i) => <div className="txli" key={i}><span>{it.emoji} {it.name} ×{it.qty}</span><span>{fmt(it.lt)}</span></div>)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── SummaryView ───────────────────────────────────────────────────────────────
function SummaryView({ txns }) {
  const rows = txns.filter(x => isToday(x.ts));
  const d = useMemo(() => rows.reduce((a, x) => {
    a.rev += x.total; a[x.pay] = (a[x.pay] || 0) + x.total;
    x.items.forEach(it => { if (!a.im[it.name]) a.im[it.name] = { c: 0, r: 0, e: it.emoji }; a.im[it.name].c += it.qty; a.im[it.name].r += it.lt; });
    return a;
  }, { rev: 0, venmo: 0, zelle: 0, cash: 0, im: {} }), [rows]);
  const top = Object.entries(d.im).sort((a, b) => b[1].r - a[1].r).slice(0, 5);
  const avg = rows.length ? d.rev / rows.length : 0;
  const pct = n => d.rev > 0 ? Math.round(n / d.rev * 100) + '%' : '—';
  const bw = n => d.rev > 0 ? Math.round(n / d.rev * 100) + '%' : '0%';
  return (
    <div className="sw">
      <div className="totcard"><div className="totlbl">Total Revenue</div><div className="totamt">{fmt(d.rev)}</div></div>
      <div className="statrow">
        <div className="statcard"><div className="statval">{rows.length}</div><div className="statlbl">Transactions</div></div>
        <div className="statcard"><div className="statval">{fmt(avg)}</div><div className="statlbl">Avg Transaction</div></div>
      </div>
      <div className="sumsec">
        <div className="seclbl">By Payment</div>
        {[['venmo', d.venmo, 've'], ['zelle', d.zelle, 'ze'], ['cash', d.cash, 'ca']].map(([m, amt, k]) => (
          <div className="mrow" key={m}>
            <span className="mname" style={{ color: `var(--${k})` }}>{PE[m]} {m[0].toUpperCase() + m.slice(1)}</span>
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
              <span className="toprank">{i + 1}.</span>
              <span className="topname">{data.e} {name}</span>
              <span className="topcnt">×{data.c}</span>
              <span className="toprev">{fmt(data.r)}</span>
            </div>
          ))}
        </div>
      )}
      {!rows.length && <div className="empty"><div className="empty-icon">📊</div><div>No sales yet today</div></div>}
    </div>
  );
}

// ── AdminView ─────────────────────────────────────────────────────────────────
function AdminView({ items, sheetsUrl, setSheetsUrl, txns, onReset }) {
  const [url, setUrl] = useState(sheetsUrl);
  const todayN = txns.filter(x => isToday(x.ts)).length;
  return (
    <div className="aw">
      <div className="asec-hdr"><span className="asec-lbl">Items</span></div>
      <div className="alist">
        {items.filter(i => i.active).map(it => (
          <div className="arow" key={it.id}>
            <span className="aemoji">{it.emoji}</span>
            <div className="ainfo">
              <div className="aname">{it.name}</div>
              <div className="asub">{fmt(it.price)}{it.stock != null ? ` · ${it.stock} left${it.stock <= 3 ? ' ⚠' : ''}` : ' · unlimited'}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="asec-hdr"><span className="asec-lbl">Google Sheets</span></div>
      <div className="abox">
        <div className="albl">Apps Script Web App URL</div>
        <input className="aurl" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://script.google.com/macros/s/…/exec" />
        <div className="aacts"><button className="btn-sm" onClick={() => setSheetsUrl(url)}>Save URL</button></div>
      </div>
      <div className="asec-hdr"><span className="asec-lbl">Danger</span></div>
      <div className="abox">
        <button className="btn-danger" onClick={onReset}>Reset Today's Sales ({todayN} transaction{todayN !== 1 ? 's' : ''})</button>
      </div>
    </div>
  );
}

// ── Nav ───────────────────────────────────────────────────────────────────────
function Nav({ tab, set }) {
  const tabs = [{ id: 'items', icon: '🛍️', lbl: 'Items' }, { id: 'log', icon: '📋', lbl: 'Log' }, { id: 'sum', icon: '📊', lbl: 'Summary' }, { id: 'admin', icon: '⚙️', lbl: 'Admin' }];
  return (
    <nav className="nav">
      {tabs.map(t => (
        <button key={t.id} className={`ntab${tab === t.id ? ' on' : ''}`} onClick={() => set(t.id)}>
          <span className="nicon">{t.icon}</span><span>{t.lbl}</span>
        </button>
      ))}
    </nav>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [items, setItems] = useState(() => ld('vt_items', DEFAULTS));
  const [txns, setTxns] = useState(() => ld('vt_txns', []));
  const [cart, setCart] = useState([]);
  const [tab, setTab] = useState('items');

  // edit mode
  const [editMode, setEditMode] = useState(false);
  const [editDraft, setEditDraft] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // cart panel
  const [cartExpanded, setCartExpanded] = useState(false);
  const [cartPay, setCartPay] = useState('');
  const [cartNote, setCartNote] = useState('');
  const [cartBusy, setCartBusy] = useState(false);

  // other
  const [undoTxn, setUndoTxn] = useState(null);
  const [sync, setSync] = useState('synced');
  const [sheetsUrl, setSheetsUrl] = useState(() => ld('vt_url', ''));
  const [queue, setQueue] = useState(() => ld('vt_q', []));

  useEffect(() => sv('vt_items', items), [items]);
  useEffect(() => sv('vt_txns', txns), [txns]);
  useEffect(() => sv('vt_url', sheetsUrl), [sheetsUrl]);
  useEffect(() => sv('vt_q', queue), [queue]);

  // sync queue
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
    })();
    return () => { live = false; };
  }, [sheetsUrl, queue.length]);

  // ── edit mode ───────────────────────────────────────────────────────────────
  const enterEdit = () => {
    setEditDraft(items.filter(i => i.active).map(i => ({ ...i, price: String(i.price), stock: i.stock !== null ? String(i.stock) : '' })));
    setIsDirty(false);
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
    setEditDraft(p => [...p, { id: iid(), emoji: '📦', name: '', price: '0', stock: '', active: true }]);
  };

  const commitEdit = () => {
    const committed = editDraft
      .filter(d => d.name.trim())
      .map(d => ({ ...d, name: d.name.trim(), price: parseFloat(d.price) || 0, stock: d.stock !== '' ? Math.max(0, parseInt(d.stock, 10) || 0) : null, active: true }));
    setItems(committed);
    setEditMode(false);
    setEditDraft(null);
    setIsDirty(false);
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

  // ── cart ────────────────────────────────────────────────────────────────────
  const addToCart = useCallback(id => {
    setCart(p => { const i = p.findIndex(c => c.id === id); if (i >= 0) { const n = [...p]; n[i] = { ...n[i], qty: n[i].qty + 1 }; return n; } return [...p, { id, qty: 1 }]; });
  }, []);

  const subFromCart = useCallback(id => {
    setCart(p => { const i = p.findIndex(c => c.id === id); if (i < 0) return p; const n = [...p]; if (n[i].qty <= 1) return p.filter(c => c.id !== id); n[i] = { ...n[i], qty: n[i].qty - 1 }; return n; });
  }, []);

  const cartQtyChange = (id, delta) => { if (delta > 0) addToCart(id); else subFromCart(id); };
  const cartRemove = id => setCart(p => p.filter(c => c.id !== id));

  const sellCart = async () => {
    if (!cartPay || cartBusy) return;
    setCartBusy(true);
    const txn = {
      id: uid(), ts: Date.now(),
      items: cart.map(c => { const it = items.find(i => i.id === c.id); return { id: c.id, name: it.name, emoji: it.emoji, up: it.price, qty: c.qty, lt: +(it.price * c.qty).toFixed(2) }; }),
      total: +cart.reduce((s, c) => { const it = items.find(i => i.id === c.id); return s + (it ? it.price * c.qty : 0); }, 0).toFixed(2),
      pay: cartPay, note: cartNote, synced: false
    };
    setItems(p => p.map(it => { const s = txn.items.find(i => i.id === it.id); if (s && it.stock !== null) return { ...it, stock: Math.max(0, it.stock - s.qty) }; return it; }));
    setTxns(p => [txn, ...p]);
    setCart([]);
    setCartPay('');
    setCartNote('');
    setCartExpanded(false);
    setCartBusy(false);
    setUndoTxn(txn);
    if (sheetsUrl) {
      setSync('syncing');
      const ok = await pushSheets(sheetsUrl, txn);
      if (ok) { setTxns(p => p.map(t => t.id === txn.id ? { ...t, synced: true } : t)); setSync('synced'); }
      else { setQueue(p => [...p, txn]); setSync(navigator.onLine ? 'error' : 'offline'); }
    }
  };

  const undo = () => {
    if (!undoTxn) return;
    const txn = undoTxn;
    setItems(p => p.map(it => { const s = txn.items.find(i => i.id === it.id); if (s && it.stock !== null) return { ...it, stock: it.stock + s.qty }; return it; }));
    setTxns(p => p.filter(t => t.id !== txn.id));
    setQueue(p => p.filter(t => t.id !== txn.id));
    setUndoTxn(null);
  };

  const resetToday = () => {
    if (!confirm("Reset all of today's sales?")) return;
    setTxns(p => p.filter(x => !isToday(x.ts)));
    setUndoTxn(null);
  };

  const activeItems = editMode ? editDraft : items.filter(i => i.active);

  return (
    <>
      <Header
        txns={txns} sync={sync} onRetry={() => setQueue(q => [...q])}
        editMode={editMode}
        onEdit={enterEdit} onDone={commitEdit} onCancel={cancelEdit}
      />
      <div className="main">
        {tab === 'items' && (
          <div className="items-list">
            {activeItems.map(item => (
              editMode
                ? <EditRow key={item.id} draft={item} onChange={(f, v) => draftChange(item.id, f, v)} onDelete={() => draftDelete(item.id)} />
                : <ItemRow key={item.id} item={item} cqty={cart.find(c => c.id === item.id)?.qty || 0} onAdd={() => addToCart(item.id)} onSub={() => subFromCart(item.id)} />
            ))}
            {editMode && <button className="btn-add-item" onClick={draftAddNew}>+ Add Item</button>}
          </div>
        )}
        {tab === 'log' && <LogView txns={txns} />}
        {tab === 'sum' && <SummaryView txns={txns} />}
        {tab === 'admin' && <AdminView items={items} sheetsUrl={sheetsUrl} setSheetsUrl={setSheetsUrl} txns={txns} onReset={resetToday} />}
      </div>

      {!editMode && (
        <CartPanel
          cart={cart} items={items}
          onQtyChange={cartQtyChange} onRemove={cartRemove}
          pay={cartPay} setPay={setCartPay}
          note={cartNote} setNote={setCartNote}
          onSold={sellCart} busy={cartBusy}
          expanded={cartExpanded} setExpanded={setCartExpanded}
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
