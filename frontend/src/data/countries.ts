export interface Country {
  code: string;        // ISO 3166-1 alpha-2
  name: string;
  dialCode: string;
  flag: string;
  timezone: string;    // primary IANA timezone
  phoneLen: [number, number]; // [min, max] local digits (after dial code removed)
  phonePrefix?: string;       // required starting digit(s), e.g. '5' for Turkey
}

// phoneLen = local digit count (what user types in, no leading 0, no dial code)
export const COUNTRIES: Country[] = [
  // ── Europe ──────────────────────────────────────────────────────────────
  { code: 'TR', name: 'Türkiye',        dialCode: '+90',   flag: '🇹🇷', timezone: 'Europe/Istanbul',                phoneLen: [10, 10], phonePrefix: '5'  },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44',   flag: '🇬🇧', timezone: 'Europe/London',                  phoneLen: [10, 10]                    },
  { code: 'DE', name: 'Germany',        dialCode: '+49',   flag: '🇩🇪', timezone: 'Europe/Berlin',                  phoneLen: [3,  12]                    },
  { code: 'FR', name: 'France',         dialCode: '+33',   flag: '🇫🇷', timezone: 'Europe/Paris',                   phoneLen: [9,   9]                    },
  { code: 'IT', name: 'Italy',          dialCode: '+39',   flag: '🇮🇹', timezone: 'Europe/Rome',                    phoneLen: [6,  11]                    },
  { code: 'ES', name: 'Spain',          dialCode: '+34',   flag: '🇪🇸', timezone: 'Europe/Madrid',                  phoneLen: [9,   9]                    },
  { code: 'NL', name: 'Netherlands',    dialCode: '+31',   flag: '🇳🇱', timezone: 'Europe/Amsterdam',               phoneLen: [9,   9]                    },
  { code: 'BE', name: 'Belgium',        dialCode: '+32',   flag: '🇧🇪', timezone: 'Europe/Brussels',                phoneLen: [8,   9]                    },
  { code: 'AT', name: 'Austria',        dialCode: '+43',   flag: '🇦🇹', timezone: 'Europe/Vienna',                  phoneLen: [4,  13]                    },
  { code: 'CH', name: 'Switzerland',    dialCode: '+41',   flag: '🇨🇭', timezone: 'Europe/Zurich',                  phoneLen: [9,   9]                    },
  { code: 'PL', name: 'Poland',         dialCode: '+48',   flag: '🇵🇱', timezone: 'Europe/Warsaw',                  phoneLen: [9,   9]                    },
  { code: 'SE', name: 'Sweden',         dialCode: '+46',   flag: '🇸🇪', timezone: 'Europe/Stockholm',               phoneLen: [6,  13]                    },
  { code: 'NO', name: 'Norway',         dialCode: '+47',   flag: '🇳🇴', timezone: 'Europe/Oslo',                    phoneLen: [8,   8]                    },
  { code: 'DK', name: 'Denmark',        dialCode: '+45',   flag: '🇩🇰', timezone: 'Europe/Copenhagen',              phoneLen: [8,   8]                    },
  { code: 'FI', name: 'Finland',        dialCode: '+358',  flag: '🇫🇮', timezone: 'Europe/Helsinki',                phoneLen: [5,  12]                    },
  { code: 'PT', name: 'Portugal',       dialCode: '+351',  flag: '🇵🇹', timezone: 'Europe/Lisbon',                  phoneLen: [9,   9]                    },
  { code: 'GR', name: 'Greece',         dialCode: '+30',   flag: '🇬🇷', timezone: 'Europe/Athens',                  phoneLen: [10, 10]                    },
  { code: 'RO', name: 'Romania',        dialCode: '+40',   flag: '🇷🇴', timezone: 'Europe/Bucharest',               phoneLen: [9,  10]                    },
  { code: 'HU', name: 'Hungary',        dialCode: '+36',   flag: '🇭🇺', timezone: 'Europe/Budapest',                phoneLen: [8,   9]                    },
  { code: 'CZ', name: 'Czech Republic', dialCode: '+420',  flag: '🇨🇿', timezone: 'Europe/Prague',                  phoneLen: [9,   9]                    },
  { code: 'SK', name: 'Slovakia',       dialCode: '+421',  flag: '🇸🇰', timezone: 'Europe/Bratislava',              phoneLen: [9,   9]                    },
  { code: 'BG', name: 'Bulgaria',       dialCode: '+359',  flag: '🇧🇬', timezone: 'Europe/Sofia',                   phoneLen: [7,   9]                    },
  { code: 'HR', name: 'Croatia',        dialCode: '+385',  flag: '🇭🇷', timezone: 'Europe/Zagreb',                  phoneLen: [7,   9]                    },
  { code: 'RS', name: 'Serbia',         dialCode: '+381',  flag: '🇷🇸', timezone: 'Europe/Belgrade',                phoneLen: [7,   9]                    },
  { code: 'RU', name: 'Russia',         dialCode: '+7',    flag: '🇷🇺', timezone: 'Europe/Moscow',                  phoneLen: [10, 10]                    },
  { code: 'UA', name: 'Ukraine',        dialCode: '+380',  flag: '🇺🇦', timezone: 'Europe/Kiev',                    phoneLen: [9,   9]                    },
  { code: 'BY', name: 'Belarus',        dialCode: '+375',  flag: '🇧🇾', timezone: 'Europe/Minsk',                   phoneLen: [9,   9]                    },
  { code: 'AZ', name: 'Azerbaijan',     dialCode: '+994',  flag: '🇦🇿', timezone: 'Asia/Baku',                      phoneLen: [9,   9]                    },
  { code: 'GE', name: 'Georgia',        dialCode: '+995',  flag: '🇬🇪', timezone: 'Asia/Tbilisi',                   phoneLen: [9,   9]                    },
  { code: 'AM', name: 'Armenia',        dialCode: '+374',  flag: '🇦🇲', timezone: 'Asia/Yerevan',                   phoneLen: [8,   8]                    },
  // ── Middle East ─────────────────────────────────────────────────────────
  { code: 'SA', name: 'Saudi Arabia',   dialCode: '+966',  flag: '🇸🇦', timezone: 'Asia/Riyadh',                    phoneLen: [9,   9], phonePrefix: '5'  },
  { code: 'AE', name: 'UAE',            dialCode: '+971',  flag: '🇦🇪', timezone: 'Asia/Dubai',                     phoneLen: [9,   9], phonePrefix: '5'  },
  { code: 'QA', name: 'Qatar',          dialCode: '+974',  flag: '🇶🇦', timezone: 'Asia/Qatar',                     phoneLen: [8,   8]                    },
  { code: 'KW', name: 'Kuwait',         dialCode: '+965',  flag: '🇰🇼', timezone: 'Asia/Kuwait',                    phoneLen: [8,   8]                    },
  { code: 'BH', name: 'Bahrain',        dialCode: '+973',  flag: '🇧🇭', timezone: 'Asia/Bahrain',                   phoneLen: [8,   8]                    },
  { code: 'OM', name: 'Oman',           dialCode: '+968',  flag: '🇴🇲', timezone: 'Asia/Muscat',                    phoneLen: [8,   8]                    },
  { code: 'IL', name: 'Israel',         dialCode: '+972',  flag: '🇮🇱', timezone: 'Asia/Jerusalem',                 phoneLen: [8,   9]                    },
  { code: 'IR', name: 'Iran',           dialCode: '+98',   flag: '🇮🇷', timezone: 'Asia/Tehran',                    phoneLen: [10, 10], phonePrefix: '9'  },
  { code: 'IQ', name: 'Iraq',           dialCode: '+964',  flag: '🇮🇶', timezone: 'Asia/Baghdad',                   phoneLen: [9,  10]                    },
  { code: 'SY', name: 'Syria',          dialCode: '+963',  flag: '🇸🇾', timezone: 'Asia/Damascus',                  phoneLen: [9,   9]                    },
  { code: 'JO', name: 'Jordan',         dialCode: '+962',  flag: '🇯🇴', timezone: 'Asia/Amman',                     phoneLen: [9,   9]                    },
  { code: 'LB', name: 'Lebanon',        dialCode: '+961',  flag: '🇱🇧', timezone: 'Asia/Beirut',                    phoneLen: [7,   8]                    },
  { code: 'KZ', name: 'Kazakhstan',     dialCode: '+7',    flag: '🇰🇿', timezone: 'Asia/Almaty',                    phoneLen: [10, 10]                    },
  { code: 'UZ', name: 'Uzbekistan',     dialCode: '+998',  flag: '🇺🇿', timezone: 'Asia/Tashkent',                  phoneLen: [9,   9]                    },
  // ── Africa ───────────────────────────────────────────────────────────────
  { code: 'EG', name: 'Egypt',          dialCode: '+20',   flag: '🇪🇬', timezone: 'Africa/Cairo',                   phoneLen: [10, 10], phonePrefix: '1'  },
  { code: 'MA', name: 'Morocco',        dialCode: '+212',  flag: '🇲🇦', timezone: 'Africa/Casablanca',              phoneLen: [9,   9]                    },
  { code: 'TN', name: 'Tunisia',        dialCode: '+216',  flag: '🇹🇳', timezone: 'Africa/Tunis',                   phoneLen: [8,   8]                    },
  { code: 'DZ', name: 'Algeria',        dialCode: '+213',  flag: '🇩🇿', timezone: 'Africa/Algiers',                 phoneLen: [9,   9]                    },
  { code: 'LY', name: 'Libya',          dialCode: '+218',  flag: '🇱🇾', timezone: 'Africa/Tripoli',                 phoneLen: [9,   9]                    },
  { code: 'NG', name: 'Nigeria',        dialCode: '+234',  flag: '🇳🇬', timezone: 'Africa/Lagos',                   phoneLen: [10, 10]                    },
  { code: 'ZA', name: 'South Africa',   dialCode: '+27',   flag: '🇿🇦', timezone: 'Africa/Johannesburg',            phoneLen: [9,   9]                    },
  { code: 'KE', name: 'Kenya',          dialCode: '+254',  flag: '🇰🇪', timezone: 'Africa/Nairobi',                 phoneLen: [9,   9]                    },
  // ── Asia ─────────────────────────────────────────────────────────────────
  { code: 'IN', name: 'India',          dialCode: '+91',   flag: '🇮🇳', timezone: 'Asia/Kolkata',                   phoneLen: [10, 10]                    },
  { code: 'PK', name: 'Pakistan',       dialCode: '+92',   flag: '🇵🇰', timezone: 'Asia/Karachi',                   phoneLen: [10, 10], phonePrefix: '3'  },
  { code: 'BD', name: 'Bangladesh',     dialCode: '+880',  flag: '🇧🇩', timezone: 'Asia/Dhaka',                     phoneLen: [10, 10]                    },
  { code: 'LK', name: 'Sri Lanka',      dialCode: '+94',   flag: '🇱🇰', timezone: 'Asia/Colombo',                   phoneLen: [9,   9]                    },
  { code: 'NP', name: 'Nepal',          dialCode: '+977',  flag: '🇳🇵', timezone: 'Asia/Kathmandu',                 phoneLen: [10, 10]                    },
  { code: 'CN', name: 'China',          dialCode: '+86',   flag: '🇨🇳', timezone: 'Asia/Shanghai',                  phoneLen: [11, 11], phonePrefix: '1'  },
  { code: 'JP', name: 'Japan',          dialCode: '+81',   flag: '🇯🇵', timezone: 'Asia/Tokyo',                     phoneLen: [9,  10]                    },
  { code: 'KR', name: 'South Korea',    dialCode: '+82',   flag: '🇰🇷', timezone: 'Asia/Seoul',                     phoneLen: [9,  10]                    },
  { code: 'TH', name: 'Thailand',       dialCode: '+66',   flag: '🇹🇭', timezone: 'Asia/Bangkok',                   phoneLen: [9,   9]                    },
  { code: 'VN', name: 'Vietnam',        dialCode: '+84',   flag: '🇻🇳', timezone: 'Asia/Ho_Chi_Minh',               phoneLen: [9,  10]                    },
  { code: 'ID', name: 'Indonesia',      dialCode: '+62',   flag: '🇮🇩', timezone: 'Asia/Jakarta',                   phoneLen: [8,  12]                    },
  { code: 'MY', name: 'Malaysia',       dialCode: '+60',   flag: '🇲🇾', timezone: 'Asia/Kuala_Lumpur',              phoneLen: [7,  11]                    },
  { code: 'SG', name: 'Singapore',      dialCode: '+65',   flag: '🇸🇬', timezone: 'Asia/Singapore',                 phoneLen: [8,   8]                    },
  { code: 'PH', name: 'Philippines',    dialCode: '+63',   flag: '🇵🇭', timezone: 'Asia/Manila',                    phoneLen: [10, 10]                    },
  // ── Oceania ──────────────────────────────────────────────────────────────
  { code: 'AU', name: 'Australia',      dialCode: '+61',   flag: '🇦🇺', timezone: 'Australia/Sydney',               phoneLen: [9,   9]                    },
  { code: 'NZ', name: 'New Zealand',    dialCode: '+64',   flag: '🇳🇿', timezone: 'Pacific/Auckland',               phoneLen: [8,   9]                    },
  // ── Americas ─────────────────────────────────────────────────────────────
  { code: 'US', name: 'United States',  dialCode: '+1',    flag: '🇺🇸', timezone: 'America/New_York',               phoneLen: [10, 10]                    },
  { code: 'CA', name: 'Canada',         dialCode: '+1',    flag: '🇨🇦', timezone: 'America/Toronto',                phoneLen: [10, 10]                    },
  { code: 'MX', name: 'Mexico',         dialCode: '+52',   flag: '🇲🇽', timezone: 'America/Mexico_City',            phoneLen: [10, 10]                    },
  { code: 'BR', name: 'Brazil',         dialCode: '+55',   flag: '🇧🇷', timezone: 'America/Sao_Paulo',              phoneLen: [10, 11]                    },
  { code: 'AR', name: 'Argentina',      dialCode: '+54',   flag: '🇦🇷', timezone: 'America/Argentina/Buenos_Aires', phoneLen: [10, 10]                    },
  { code: 'CO', name: 'Colombia',       dialCode: '+57',   flag: '🇨🇴', timezone: 'America/Bogota',                 phoneLen: [10, 10]                    },
  { code: 'CL', name: 'Chile',          dialCode: '+56',   flag: '🇨🇱', timezone: 'America/Santiago',               phoneLen: [9,   9]                    },
  { code: 'PE', name: 'Peru',           dialCode: '+51',   flag: '🇵🇪', timezone: 'America/Lima',                   phoneLen: [9,   9]                    },
];

/**
 * Kullanıcının girdiği local numaranın ülke kurallarına uygun olup olmadığını doğrular.
 * local = dial code çıkarıldıktan sonraki rakamlar (başındaki 0 dahil edilmez).
 */
export function validateLocalPhone(local: string, country: Country): boolean {
  const len = local.length;
  if (len < country.phoneLen[0] || len > country.phoneLen[1]) return false;
  if (country.phonePrefix && !local.startsWith(country.phonePrefix)) return false;
  return true;
}

/** E.164 string'inden ülke + local numara parse et */
export function parsePhoneE164(e164: string): { country: Country; localNumber: string } | null {
  if (!e164.startsWith('+')) return null;
  // Uzun dial code'dan kısaya doğru sırala (+1868 önce +1'den dene)
  const sorted = [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
  for (const c of sorted) {
    if (e164.startsWith(c.dialCode)) {
      return { country: c, localNumber: e164.slice(c.dialCode.length) };
    }
  }
  return null;
}

/** E.164 numarasının geçerliliğini doğrular */
export function validateE164Phone(e164: string): boolean {
  const parsed = parsePhoneE164(e164);
  if (!parsed) return false;
  return validateLocalPhone(parsed.localNumber, parsed.country);
}

export const DEFAULT_COUNTRY = COUNTRIES.find(c => c.code === 'TR')!;
