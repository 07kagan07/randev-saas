import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Globe } from 'lucide-react';

const LANGS = [
  { code: 'tr', abbr: 'TR', label: 'Türkçe' },
  { code: 'en', abbr: 'EN', label: 'English' },
  { code: 'de', abbr: 'DE', label: 'Deutsch' },
  { code: 'ru', abbr: 'RU', label: 'Русский' },
];

function LangBadge({ abbr, active, size = 'sm' }: { abbr: string; active?: boolean; size?: 'sm' | 'xs' }) {
  return (
    <span className={`inline-flex items-center justify-center font-bold rounded leading-none select-none ${
      size === 'xs' ? 'w-6 h-4 text-[9px]' : 'w-7 h-5 text-[10px]'
    } ${active ? 'bg-white text-indigo-700' : 'bg-indigo-100 text-indigo-700'}`}>
      {abbr}
    </span>
  );
}

interface Props {
  variant?: 'light' | 'dark' | 'sidebar';
  mutedTextClass?: string;
  hoverBgClass?: string;
}

export default function LanguageSwitcher({ variant = 'dark', mutedTextClass = 'text-indigo-200', hoverBgClass = 'hover:bg-white/10 hover:text-white' }: Props) {
  const { i18n } = useTranslation();
  const current = LANGS.find(l => l.code === i18n.language?.slice(0, 2)) ?? LANGS[0];
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const select = (code: string) => {
    i18n.changeLanguage(code);
    setOpen(false);
  };

  /* ── Sidebar variant ── */
  if (variant === 'sidebar') {
    return (
      <div ref={ref} className="px-3 pb-1">
        <button
          onClick={() => setOpen(o => !o)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${mutedTextClass} ${hoverBgClass} transition-colors`}
        >
          <Globe className="w-4 h-4 shrink-0" />
          <span className="flex-1 text-left flex items-center gap-2">
            <LangBadge abbr={current.abbr} active />
            {current.label}
          </span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div className="mt-1 rounded-lg overflow-hidden border border-white/15">
            {LANGS.map(lang => (
              <button
                key={lang.code}
                onClick={() => select(lang.code)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                  lang.code === current.code
                    ? 'bg-white/20 text-white font-medium'
                    : `${mutedTextClass} ${hoverBgClass}`
                }`}
              >
                <LangBadge abbr={lang.abbr} active={lang.code === current.code} />
                <span>{lang.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ── Light variant: dark bg (hero) ── */
  if (variant === 'light') {
    return (
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-sm font-medium transition-colors"
        >
          <span className="text-xs font-bold">{current.abbr}</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div className="absolute right-0 top-full mt-2 w-36 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
            {LANGS.map(lang => (
              <button
                key={lang.code}
                onClick={() => select(lang.code)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors ${
                  lang.code === current.code
                    ? 'bg-indigo-50 text-indigo-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <LangBadge abbr={lang.abbr} active={lang.code === current.code} />
                <span>{lang.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ── Dark variant: white bg (header) ── */
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium transition-colors"
      >
        <LangBadge abbr={current.abbr} />
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-36 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
          {LANGS.map(lang => (
            <button
              key={lang.code}
              onClick={() => select(lang.code)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors ${
                lang.code === current.code
                  ? 'bg-indigo-50 text-indigo-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <LangBadge abbr={lang.abbr} active={lang.code === current.code} />
              <span>{lang.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
