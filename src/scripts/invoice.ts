import qrcode from 'qrcode-generator';

/**
 * The invoice maker, for Sarvakali's own use. Fill in the client and the
 * work, and it lays out a branded invoice with the UPI ID and a UPI QR code
 * for the exact amount. Print it, or save it as a PDF from the print window.
 * Nothing leaves the browser; your own details can be remembered on this device.
 */
const THEMES: Record<string, { accent: string; soft: string; name: string }> = {
  devotion: { accent: '#8a5a12', soft: '#f6ead2', name: 'Devotion & the Unseen' },
  magic: { accent: '#1f6b52', soft: '#e3f3ec', name: 'Witchcraft & Magic' },
  healing: { accent: '#1e6e78', soft: '#e1f2f3', name: 'Healing & Inner Work' },
  identity: { accent: '#9c3a5a', soft: '#f8e6ec', name: 'Identity, Intimacy & the Body' },
  divination: { accent: '#3b4ea8', soft: '#e7eafb', name: 'Divination & Insight' },
  learning: { accent: '#7a4a24', soft: '#f3ebdf', name: 'Learning' },
  kali: { accent: '#8e1f18', soft: '#f6e4e0', name: 'Sarvakali' },
};

const MINE = ['bizName', 'upi', 'payee', 'myEmail', 'myPhone', 'myAddress'];
const rupees = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
const today = () => new Date().toISOString().slice(0, 10);
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/** a UPI payment link: opens any UPI app with the amount and note filled in */
export function upiLink(pa: string, pn: string, amount: number, note: string) {
  const q = new URLSearchParams({ pa, pn, cu: 'INR' });
  if (amount > 0) q.set('am', amount.toFixed(2));
  if (note) q.set('tn', note.slice(0, 80));
  // UPI apps expect the @ in the UPI ID as it is, not encoded
  return `upi://pay?${q.toString().replace(/\+/g, '%20').replace(/%40/g, '@')}`;
}

export function initInvoice() {
  const root = document.querySelector<HTMLElement>('[data-invoice]');
  if (!root) return;
  const form = root.querySelector<HTMLFormElement>('#inv-form')!;
  const rows = root.querySelector<HTMLElement>('[data-inv-rows]')!;
  const paper = root.querySelector<HTMLElement>('.inv-paper')!;
  const f = (n: string) => form.elements.namedItem(n) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;

  // remembered details and a sensible invoice number
  try {
    const saved = JSON.parse(localStorage.getItem('sk-inv-me') || '{}');
    MINE.forEach((k) => { if (saved[k] && f(k)) f(k)!.value = saved[k]; });
  } catch { /* fine */ }
  if (!f('date')!.value) f('date')!.value = today();
  if (!f('number')!.value) {
    let n = 1;
    try { n = Number(localStorage.getItem('sk-inv-n') || '0') + 1; } catch { /* fine */ }
    f('number')!.value = `SK-${today().replace(/-/g, '').slice(2)}-${String(n).padStart(2, '0')}`;
  }

  const addRow = (desc = '', qty = '1', amt = '') => {
    const row = document.createElement('div');
    row.className = 'inv-row';
    row.innerHTML = `
      <input name="desc" list="inv-services" placeholder="Service" aria-label="Service" />
      <input name="qty" type="number" min="1" step="1" inputmode="numeric" aria-label="Quantity" />
      <input name="amt" type="number" min="0" step="1" inputmode="decimal" placeholder="Amount" aria-label="Amount in rupees" />
      <button type="button" class="inv-x" aria-label="Remove this line">×</button>`;
    (row.querySelector('[name=desc]') as HTMLInputElement).value = desc;
    (row.querySelector('[name=qty]') as HTMLInputElement).value = qty;
    (row.querySelector('[name=amt]') as HTMLInputElement).value = amt;
    row.querySelector('.inv-x')!.addEventListener('click', () => { if (rows.children.length > 1) row.remove(); render(); });
    rows.appendChild(row);
  };
  addRow();
  root.querySelector('[data-inv-add]')!.addEventListener('click', () => { addRow(); render(); (rows.lastElementChild?.querySelector('input') as HTMLInputElement)?.focus(); });

  function lines() {
    return Array.from(rows.querySelectorAll('.inv-row')).map((r) => {
      const desc = (r.querySelector('[name=desc]') as HTMLInputElement).value.trim();
      const qty = Math.max(1, Number((r.querySelector('[name=qty]') as HTMLInputElement).value) || 1);
      const amt = Math.max(0, Number((r.querySelector('[name=amt]') as HTMLInputElement).value) || 0);
      return { desc, qty, amt, total: qty * amt };
    }).filter((l) => l.desc || l.amt);
  }

  function render() {
    const theme = THEMES[f('theme')!.value] ?? THEMES.kali;
    paper.style.setProperty('--inv-accent', theme.accent);
    paper.style.setProperty('--inv-soft', theme.soft);
    const ls = lines();
    const total = ls.reduce((a, l) => a + l.total, 0);
    const v = (n: string) => esc(f(n)?.value.trim() || '');
    const num = v('number');
    const upi = f('upi')!.value.trim();
    const payee = f('payee')!.value.trim() || f('bizName')!.value.trim() || 'Sarvakali';
    const link = upi ? upiLink(upi, payee, total, `Invoice ${f('number')!.value.trim()}`) : '';
    let qr = '<div class="inv-qr-empty">Add your UPI ID to show the QR code</div>';
    if (upi) {
      const q = qrcode(0, 'M');
      q.addData(link);
      q.make();
      qr = q.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
    }
    const dateFmt = (s: string) => (s ? new Date(`${s}T00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
    paper.innerHTML = `
      <header class="inv-head">
        <div><p class="inv-brand">${v('bizName') || 'Sarvakali'}</p><p class="inv-sub">${esc(theme.name === 'Sarvakali' ? 'Devotion, magic, healing and insight' : theme.name)}</p></div>
        <div class="inv-meta"><p class="inv-title">Invoice</p><p>${num}</p><p>${dateFmt(f('date')!.value)}</p>${f('due')!.value ? `<p>Due ${dateFmt(f('due')!.value)}</p>` : ''}</div>
      </header>
      <section class="inv-parties">
        <div><p class="inv-label">Billed to</p><p class="inv-strong">${v('client') || 'Client name'}</p>${v('clientEmail') ? `<p>${v('clientEmail')}</p>` : ''}</div>
        <div><p class="inv-label">From</p><p class="inv-strong">${v('bizName') || 'Sarvakali'}</p>${v('myEmail') ? `<p>${v('myEmail')}</p>` : ''}${v('myPhone') ? `<p>${v('myPhone')}</p>` : ''}${v('myAddress') ? `<p>${v('myAddress')}</p>` : ''}</div>
      </section>
      <table class="inv-table">
        <thead><tr><th>Service</th><th>Qty</th><th>Amount</th><th>Total</th></tr></thead>
        <tbody>${ls.length ? ls.map((l) => `<tr><td>${esc(l.desc) || '—'}</td><td>${l.qty}</td><td>${rupees(l.amt)}</td><td>${rupees(l.total)}</td></tr>`).join('') : '<tr><td colspan="4" class="inv-emptyrow">Add a line on the left</td></tr>'}</tbody>
        <tfoot><tr><td colspan="3">Total</td><td>${rupees(total)}</td></tr></tfoot>
      </table>
      <section class="inv-pay">
        <div class="inv-qr">${qr}</div>
        <div>
          <p class="inv-label">Pay by UPI</p>
          <p class="inv-upi">${esc(upi) || 'your-upi-id@bank'}</p>
          <p>Scan the code with any UPI app (Google Pay, PhonePe, Paytm, BHIM). The amount and invoice number are filled in for you.</p>
          ${v('notes') ? `<p class="inv-notes">${v('notes').replace(/\n/g, '<br>')}</p>` : ''}
        </div>
      </section>
      <footer class="inv-foot">Thank you. · ${v('bizName') || 'Sarvakali'}</footer>`;
    const copy = root!.querySelector<HTMLButtonElement>('[data-inv-copy]')!;
    copy.disabled = !link;
    copy.dataset.link = link;
  }

  form.addEventListener('input', render);
  form.addEventListener('change', render);
  root.querySelector('[data-inv-print]')!.addEventListener('click', () => {
    try { localStorage.setItem('sk-inv-n', String(Number(localStorage.getItem('sk-inv-n') || '0') + 1)); } catch { /* fine */ }
    window.print();
  });
  root.querySelector('[data-inv-save]')!.addEventListener('click', () => {
    const me: Record<string, string> = {};
    MINE.forEach((k) => { me[k] = f(k)?.value.trim() || ''; });
    const msg = root.querySelector('[data-inv-msg]')!;
    try { localStorage.setItem('sk-inv-me', JSON.stringify(me)); msg.textContent = 'Your details are remembered on this device.'; }
    catch { msg.textContent = 'This browser is not allowing storage here.'; }
  });
  root.querySelector('[data-inv-copy]')!.addEventListener('click', async (e) => {
    const link = (e.currentTarget as HTMLElement).dataset.link || '';
    const msg = root.querySelector('[data-inv-msg]')!;
    try { await navigator.clipboard.writeText(link); msg.textContent = 'Payment link copied. On a phone it opens a UPI app with everything filled in.'; }
    catch { msg.textContent = link; }
  });
  render();
}
