// The owner's customised dashboard, kept in this browser. Only the pages are saved: panels and the
// selected page are view state, and the data comes from PayPal on every load.
import type { AgPageState } from 'ag-studio';

const KEY = 'owed.dashboard.v1';

export function loadPages(): AgPageState[] | null {
  try {
    const raw = localStorage.getItem(KEY);
    const pages = raw ? JSON.parse(raw) : null;
    return Array.isArray(pages) && pages.length ? pages : null;
  } catch {
    return null;
  }
}

export function savePages(pages: AgPageState[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(pages));
  } catch {
    // Private windows and full storage: the layout lasts until reload, which is acceptable.
  }
}

export function clearPages() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}
