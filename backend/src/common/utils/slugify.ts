const CHAR_MAP: Record<string, string> = {
  ğ: 'g', ü: 'u', ş: 's', ı: 'i', ö: 'o', ç: 'c',
  â: 'a', î: 'i', û: 'u',
};

const CHAR_REGEX = new RegExp(Object.keys(CHAR_MAP).join('|'), 'g');

export function slugify(text: string): string {
  return text
    .normalize('NFC')
    .toLowerCase()
    .replace(CHAR_REGEX, (ch) => CHAR_MAP[ch] ?? ch)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
