/**
 * Kullanıcının tarayıcı dil ayarını döner.
 * Tarihleri ve sayıları formatlarken tr-TR yerine bunu kullan.
 */
export const userLocale: string =
  (typeof navigator !== 'undefined' && navigator.language) || 'tr-TR';

/** Tarihi kısa formatta göster: "23 Nis" veya "Apr 23" */
export function fmtDate(date: Date | string, opts?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(userLocale, opts ?? { day: 'numeric', month: 'short' });
}

/** Saati kısa formatta göster: "13:30" */
export function fmtTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString(userLocale, { hour: '2-digit', minute: '2-digit' });
}

/** Tarih + saat */
export function fmtDateTime(date: Date | string, opts?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString(userLocale, opts);
}

/** Para birimi formatı — servisten currency bilgisi gelene kadar sayıyı formatlar */
export function fmtNumber(n: number, decimals = 2): string {
  return n.toLocaleString(userLocale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
