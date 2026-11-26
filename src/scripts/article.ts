/**
 * Articles: the filter by pillar on the front page; on an article, the line that shows how far you have read, and
 * sharing (the phone's own share sheet where there is one, otherwise the link is copied).
 */
export function initArticles() {
  const stops: (() => void)[] = [];
  const list = document.querySelector<HTMLElement>('[data-articles]');
  if (list) {
    const btns = Array.from(list.querySelectorAll<HTMLButtonElement>('[data-ar-filter]'));
    const items = Array.from(list.querySelectorAll<HTMLElement>('[data-ar]'));
    const none = list.querySelector<HTMLElement>('[data-ar-none]');
    const pick = (slug: string) => {
      btns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.arFilter === slug)));
      let shown = 0;
      items.forEach((el) => { const on = !slug || el.dataset.ar === slug; el.hidden = !on; if (on) shown++; });
      if (none) none.hidden = shown > 0;
    };
    const on = (e: Event) => { const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-ar-filter]'); if (b) pick(b.dataset.arFilter || ''); };
    list.addEventListener('click', on);
    stops.push(() => list.removeEventListener('click', on));
  }
  const art = document.querySelector<HTMLElement>('[data-article]');
  if (art) {
    const bar = document.querySelector<HTMLElement>('[data-ar-progress] span');
    const body = art.querySelector<HTMLElement>('.ar-body') ?? art;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = body.getBoundingClientRect();
      const total = r.height - innerHeight * 0.6;
      const done = Math.min(1, Math.max(0, (innerHeight * 0.4 - r.top) / Math.max(1, total)));
      if (bar) bar.style.transform = `scaleX(${done.toFixed(4)})`;
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    addEventListener('scroll', onScroll, { passive: true });
    update();
    stops.push(() => { removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); });
    const share = art.querySelector<HTMLButtonElement>('[data-ar-share]');
    const onShare = async () => {
      const data = { title: document.title, url: location.href };
      try {
        if (navigator.share) { await navigator.share(data); return; }
        await navigator.clipboard.writeText(location.href);
        share!.textContent = share!.dataset.done || 'Copied';
      } catch { /* closed, or not allowed: the address bar has it */ }
    };
    share?.addEventListener('click', onShare);
    stops.push(() => share?.removeEventListener('click', onShare));
  }
  return () => stops.forEach((s) => s());
}
