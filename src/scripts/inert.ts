/**
 * While a full-screen layer (the menu, search) is open, the page behind it is made inert: it cannot be focused,
 * clicked or browsed with a screen reader, so the layer behaves as a true modal.
 */
const BEHIND = '#main, .site-header, .site-foot, [data-keep-root], #hud, .skip-link';

export function setPageInert(on: boolean) {
  document.querySelectorAll<HTMLElement>(BEHIND).forEach((el) => { el.inert = on; });
}
