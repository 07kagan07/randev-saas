export interface Country {
  code: string;   // ISO 3166-1 alpha-2
  name: string;
  dialCode: string;
  flag: string;
  timezone: string; // primary IANA timezone
}

export const COUNTRIES: Country[] = [
  { code: 'TR', name: 'Türkiye',              dialCode: '+90',   flag: '🇹🇷', timezone: 'Europe/Istanbul' },
  { code: 'US', name: 'United States',        dialCode: '+1',    flag: '🇺🇸', timezone: 'America/New_York' },
  { code: 'GB', name: 'United Kingdom',       dialCode: '+44',   flag: '🇬🇧', timezone: 'Europe/London' },
  { code: 'DE', name: 'Germany',              dialCode: '+49',   flag: '🇩🇪', timezone: 'Europe/Berlin' },
  { code: 'FR', name: 'France',               dialCode: '+33',   flag: '🇫🇷', timezone: 'Europe/Paris' },
  { code: 'IT', name: 'Italy',                dialCode: '+39',   flag: '🇮🇹', timezone: 'Europe/Rome' },
  { code: 'ES', name: 'Spain',                dialCode: '+34',   flag: '🇪🇸', timezone: 'Europe/Madrid' },
  { code: 'NL', name: 'Netherlands',          dialCode: '+31',   flag: '🇳🇱', timezone: 'Europe/Amsterdam' },
  { code: 'BE', name: 'Belgium',              dialCode: '+32',   flag: '🇧🇪', timezone: 'Europe/Brussels' },
  { code: 'AT', name: 'Austria',              dialCode: '+43',   flag: '🇦🇹', timezone: 'Europe/Vienna' },
  { code: 'CH', name: 'Switzerland',          dialCode: '+41',   flag: '🇨🇭', timezone: 'Europe/Zurich' },
  { code: 'PL', name: 'Poland',               dialCode: '+48',   flag: '🇵🇱', timezone: 'Europe/Warsaw' },
  { code: 'SE', name: 'Sweden',               dialCode: '+46',   flag: '🇸🇪', timezone: 'Europe/Stockholm' },
  { code: 'NO', name: 'Norway',               dialCode: '+47',   flag: '🇳🇴', timezone: 'Europe/Oslo' },
  { code: 'DK', name: 'Denmark',              dialCode: '+45',   flag: '🇩🇰', timezone: 'Europe/Copenhagen' },
  { code: 'FI', name: 'Finland',              dialCode: '+358',  flag: '🇫🇮', timezone: 'Europe/Helsinki' },
  { code: 'PT', name: 'Portugal',             dialCode: '+351',  flag: '🇵🇹', timezone: 'Europe/Lisbon' },
  { code: 'GR', name: 'Greece',               dialCode: '+30',   flag: '🇬🇷', timezone: 'Europe/Athens' },
  { code: 'RO', name: 'Romania',              dialCode: '+40',   flag: '🇷🇴', timezone: 'Europe/Bucharest' },
  { code: 'HU', name: 'Hungary',              dialCode: '+36',   flag: '🇭🇺', timezone: 'Europe/Budapest' },
  { code: 'CZ', name: 'Czech Republic',       dialCode: '+420',  flag: '🇨🇿', timezone: 'Europe/Prague' },
  { code: 'SK', name: 'Slovakia',             dialCode: '+421',  flag: '🇸🇰', timezone: 'Europe/Bratislava' },
  { code: 'BG', name: 'Bulgaria',             dialCode: '+359',  flag: '🇧🇬', timezone: 'Europe/Sofia' },
  { code: 'HR', name: 'Croatia',              dialCode: '+385',  flag: '🇭🇷', timezone: 'Europe/Zagreb' },
  { code: 'RS', name: 'Serbia',               dialCode: '+381',  flag: '🇷🇸', timezone: 'Europe/Belgrade' },
  { code: 'RU', name: 'Russia',               dialCode: '+7',    flag: '🇷🇺', timezone: 'Europe/Moscow' },
  { code: 'UA', name: 'Ukraine',              dialCode: '+380',  flag: '🇺🇦', timezone: 'Europe/Kiev' },
  { code: 'BY', name: 'Belarus',              dialCode: '+375',  flag: '🇧🇾', timezone: 'Europe/Minsk' },
  { code: 'AZ', name: 'Azerbaijan',           dialCode: '+994',  flag: '🇦🇿', timezone: 'Asia/Baku' },
  { code: 'GE', name: 'Georgia',              dialCode: '+995',  flag: '🇬🇪', timezone: 'Asia/Tbilisi' },
  { code: 'AM', name: 'Armenia',              dialCode: '+374',  flag: '🇦🇲', timezone: 'Asia/Yerevan' },
  { code: 'SA', name: 'Saudi Arabia',         dialCode: '+966',  flag: '🇸🇦', timezone: 'Asia/Riyadh' },
  { code: 'AE', name: 'UAE',                  dialCode: '+971',  flag: '🇦🇪', timezone: 'Asia/Dubai' },
  { code: 'QA', name: 'Qatar',                dialCode: '+974',  flag: '🇶🇦', timezone: 'Asia/Qatar' },
  { code: 'KW', name: 'Kuwait',               dialCode: '+965',  flag: '🇰🇼', timezone: 'Asia/Kuwait' },
  { code: 'BH', name: 'Bahrain',              dialCode: '+973',  flag: '🇧🇭', timezone: 'Asia/Bahrain' },
  { code: 'OM', name: 'Oman',                 dialCode: '+968',  flag: '🇴🇲', timezone: 'Asia/Muscat' },
  { code: 'EG', name: 'Egypt',                dialCode: '+20',   flag: '🇪🇬', timezone: 'Africa/Cairo' },
  { code: 'MA', name: 'Morocco',              dialCode: '+212',  flag: '🇲🇦', timezone: 'Africa/Casablanca' },
  { code: 'TN', name: 'Tunisia',              dialCode: '+216',  flag: '🇹🇳', timezone: 'Africa/Tunis' },
  { code: 'DZ', name: 'Algeria',              dialCode: '+213',  flag: '🇩🇿', timezone: 'Africa/Algiers' },
  { code: 'LY', name: 'Libya',                dialCode: '+218',  flag: '🇱🇾', timezone: 'Africa/Tripoli' },
  { code: 'NG', name: 'Nigeria',              dialCode: '+234',  flag: '🇳🇬', timezone: 'Africa/Lagos' },
  { code: 'ZA', name: 'South Africa',         dialCode: '+27',   flag: '🇿🇦', timezone: 'Africa/Johannesburg' },
  { code: 'KE', name: 'Kenya',                dialCode: '+254',  flag: '🇰🇪', timezone: 'Africa/Nairobi' },
  { code: 'IN', name: 'India',                dialCode: '+91',   flag: '🇮🇳', timezone: 'Asia/Kolkata' },
  { code: 'PK', name: 'Pakistan',             dialCode: '+92',   flag: '🇵🇰', timezone: 'Asia/Karachi' },
  { code: 'BD', name: 'Bangladesh',           dialCode: '+880',  flag: '🇧🇩', timezone: 'Asia/Dhaka' },
  { code: 'LK', name: 'Sri Lanka',            dialCode: '+94',   flag: '🇱🇰', timezone: 'Asia/Colombo' },
  { code: 'NP', name: 'Nepal',                dialCode: '+977',  flag: '🇳🇵', timezone: 'Asia/Kathmandu' },
  { code: 'CN', name: 'China',                dialCode: '+86',   flag: '🇨🇳', timezone: 'Asia/Shanghai' },
  { code: 'JP', name: 'Japan',                dialCode: '+81',   flag: '🇯🇵', timezone: 'Asia/Tokyo' },
  { code: 'KR', name: 'South Korea',          dialCode: '+82',   flag: '🇰🇷', timezone: 'Asia/Seoul' },
  { code: 'TH', name: 'Thailand',             dialCode: '+66',   flag: '🇹🇭', timezone: 'Asia/Bangkok' },
  { code: 'VN', name: 'Vietnam',              dialCode: '+84',   flag: '🇻🇳', timezone: 'Asia/Ho_Chi_Minh' },
  { code: 'ID', name: 'Indonesia',            dialCode: '+62',   flag: '🇮🇩', timezone: 'Asia/Jakarta' },
  { code: 'MY', name: 'Malaysia',             dialCode: '+60',   flag: '🇲🇾', timezone: 'Asia/Kuala_Lumpur' },
  { code: 'SG', name: 'Singapore',            dialCode: '+65',   flag: '🇸🇬', timezone: 'Asia/Singapore' },
  { code: 'PH', name: 'Philippines',          dialCode: '+63',   flag: '🇵🇭', timezone: 'Asia/Manila' },
  { code: 'AU', name: 'Australia',            dialCode: '+61',   flag: '🇦🇺', timezone: 'Australia/Sydney' },
  { code: 'NZ', name: 'New Zealand',          dialCode: '+64',   flag: '🇳🇿', timezone: 'Pacific/Auckland' },
  { code: 'CA', name: 'Canada',               dialCode: '+1',    flag: '🇨🇦', timezone: 'America/Toronto' },
  { code: 'MX', name: 'Mexico',               dialCode: '+52',   flag: '🇲🇽', timezone: 'America/Mexico_City' },
  { code: 'BR', name: 'Brazil',               dialCode: '+55',   flag: '🇧🇷', timezone: 'America/Sao_Paulo' },
  { code: 'AR', name: 'Argentina',            dialCode: '+54',   flag: '🇦🇷', timezone: 'America/Argentina/Buenos_Aires' },
  { code: 'CO', name: 'Colombia',             dialCode: '+57',   flag: '🇨🇴', timezone: 'America/Bogota' },
  { code: 'CL', name: 'Chile',                dialCode: '+56',   flag: '🇨🇱', timezone: 'America/Santiago' },
  { code: 'PE', name: 'Peru',                 dialCode: '+51',   flag: '🇵🇪', timezone: 'America/Lima' },
  { code: 'IL', name: 'Israel',               dialCode: '+972',  flag: '🇮🇱', timezone: 'Asia/Jerusalem' },
  { code: 'IR', name: 'Iran',                 dialCode: '+98',   flag: '🇮🇷', timezone: 'Asia/Tehran' },
  { code: 'IQ', name: 'Iraq',                 dialCode: '+964',  flag: '🇮🇶', timezone: 'Asia/Baghdad' },
  { code: 'SY', name: 'Syria',                dialCode: '+963',  flag: '🇸🇾', timezone: 'Asia/Damascus' },
  { code: 'JO', name: 'Jordan',               dialCode: '+962',  flag: '🇯🇴', timezone: 'Asia/Amman' },
  { code: 'LB', name: 'Lebanon',              dialCode: '+961',  flag: '🇱🇧', timezone: 'Asia/Beirut' },
  { code: 'KZ', name: 'Kazakhstan',           dialCode: '+7',    flag: '🇰🇿', timezone: 'Asia/Almaty' },
  { code: 'UZ', name: 'Uzbekistan',           dialCode: '+998',  flag: '🇺🇿', timezone: 'Asia/Tashkent' },
];

/** Telefon numarasındaki dial code'u çıkarıp ülkeyi bul */
export function parsePhoneE164(e164: string): { country: Country; localNumber: string } | null {
  if (!e164.startsWith('+')) return null;
  // Uzun dial code'dan kısaya doğru sırala (örn. +1868 önce +1'den dene)
  const sorted = [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
  for (const c of sorted) {
    if (e164.startsWith(c.dialCode)) {
      return { country: c, localNumber: e164.slice(c.dialCode.length) };
    }
  }
  return null;
}

export const DEFAULT_COUNTRY = COUNTRIES.find(c => c.code === 'TR')!;
