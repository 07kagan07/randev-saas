import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { COUNTRIES, Country, DEFAULT_COUNTRY, parsePhoneE164, validateLocalPhone } from '../../data/countries';

interface Props {
  /** E.164 formatında tam numara: "+905551234567" */
  value: string;
  onChange: (e164: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

function buildHint(country: Country): string {
  const [min, max] = country.phoneLen;
  const lenPart = min === max ? `${min}` : `${min}-${max}`;
  const prefixPart = country.phonePrefix ? ` / ${country.phonePrefix}xxx` : '';
  return `${lenPart}${prefixPart}`;
}

export default function PhoneInput({ value, onChange, placeholder, disabled, className }: Props) {
  const { t } = useTranslation();
  const parsed = value ? parsePhoneE164(value) : null;
  const [country, setCountry] = useState<Country>(parsed?.country ?? DEFAULT_COUNTRY);
  const [local, setLocal]     = useState<string>(parsed?.localNumber ?? '');
  const [open, setOpen]       = useState(false);
  const [search, setSearch]   = useState('');
  const [dirty, setDirty]     = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!value) { setLocal(''); return; }
    const p = parsePhoneE164(value);
    if (p) { setCountry(p.country); setLocal(p.localNumber); }
  }, [value]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false); setSearch('');
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleCountrySelect = (c: Country) => {
    const trimmed = local.slice(0, c.phoneLen[1]);
    setCountry(c);
    setLocal(trimmed);
    setOpen(false);
    setSearch('');
    setDirty(false);
    onChange(c.dialCode + trimmed);
  };

  const handleLocalChange = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, country.phoneLen[1]);
    setLocal(digits);
    setDirty(true);
    onChange(country.dialCode + digits);
  };

  const isValid   = local.length === 0 ? true : validateLocalPhone(local, country);
  const showError = dirty && local.length > 0 && !isValid;

  const filtered = search.trim()
    ? COUNTRIES.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.dialCode.includes(search) ||
        c.code.toLowerCase().includes(search.toLowerCase())
      )
    : COUNTRIES;

  return (
    <div ref={dropRef} className={`relative ${className ?? ''}`}>
      <div className={`flex rounded-xl overflow-hidden transition-all ${
        showError
          ? 'ring-2 ring-red-400'
          : 'ring-1 ring-gray-300 focus-within:ring-2 focus-within:ring-indigo-500'
      }`}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => { setOpen(v => !v); setSearch(''); }}
          className={`flex items-center gap-1.5 px-3 py-3 border-r text-sm text-gray-700 hover:bg-gray-100 transition-colors shrink-0 disabled:opacity-60 focus:outline-none ${
            showError ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
          }`}
        >
          <span className="text-base leading-none">{country.flag}</span>
          <span className="font-medium tabular-nums">{country.dialCode}</span>
          <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        <input
          type="tel"
          value={local}
          onChange={e => handleLocalChange(e.target.value)}
          onBlur={() => { if (local.length > 0) setDirty(true); }}
          placeholder={placeholder ?? country.phonePrefix
            ? `${country.phonePrefix}xx xxx xxxx`
            : `xxx xxx xxxx`}
          disabled={disabled}
          className="flex-1 px-3 py-3 text-base outline-none border-0 bg-white disabled:opacity-60"
        />
      </div>

      {showError && (
        <p className="mt-1 text-xs text-red-500">
          {t('phone.invalid', { hint: buildHint(country) })}
        </p>
      )}

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-lg w-72 max-h-64 flex flex-col">
          <div className="p-2 border-b border-gray-100">
            <input
              autoFocus
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('phone.searchCountry')}
              className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <ul className="overflow-y-auto flex-1">
            {filtered.map(c => (
              <li key={c.code}>
                <button
                  type="button"
                  onClick={() => handleCountrySelect(c)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-indigo-50 transition-colors ${
                    c.code === country.code ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700'
                  }`}
                >
                  <span className="text-base w-6 shrink-0">{c.flag}</span>
                  <span className="flex-1 text-left truncate">{c.name}</span>
                  <span className="tabular-nums text-gray-400 shrink-0">{c.dialCode}</span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-4 text-sm text-gray-400 text-center">{t('phone.countryNotFound')}</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
