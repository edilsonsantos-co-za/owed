// Display helpers shared by the client components.

export const money = (n: number, currency = 'USD', cents = false) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: cents ? 2 : 0, minimumFractionDigits: cents ? 2 : 0 }).format(n);

export const shortDate = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

export const longDate = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

export const ago = (iso: string) => {
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  return hours < 24 ? `${hours}h ago` : `${Math.round(hours / 24)}d ago`;
};

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');

/** A stable soft colour per client, so the same client looks the same everywhere. */
const AVATAR_COLOURS = ['#e0e7ff', '#dcfce7', '#fef3c7', '#fce7f3', '#e0f2fe', '#ede9fe', '#ffedd5'];
const AVATAR_INK = ['#3730a3', '#166534', '#92400e', '#9d174d', '#075985', '#5b21b6', '#9a3412'];
export function avatarColours(key: string) {
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const i = h % AVATAR_COLOURS.length;
  return { background: AVATAR_COLOURS[i], color: AVATAR_INK[i] };
}
