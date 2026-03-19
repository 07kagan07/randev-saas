import React, { useState, useRef, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import { format, parse, isValid } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface DatePickerProps {
  value: string;          // "YYYY-MM-DD"
  onChange: (v: string) => void;
  min?: string;           // "YYYY-MM-DD"
  placeholder?: string;
  className?: string;
}

export default function DatePicker({ value, onChange, min, placeholder = 'Tarih seçin', className }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Dışarı tıklanınca kapat
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = value ? parse(value, 'yyyy-MM-dd', new Date()) : undefined;
  const disabled  = min  ? { before: parse(min, 'yyyy-MM-dd', new Date()) } : undefined;

  const displayValue = selected && isValid(selected)
    ? format(selected, 'd MMMM yyyy', { locale: tr })
    : '';

  return (
    <div ref={ref} className={`relative ${className ?? ''}`}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-3 border rounded-xl px-3 py-2.5 text-sm bg-white transition-shadow ${
          open
            ? 'border-indigo-500 ring-2 ring-indigo-500'
            : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <div className="shrink-0 text-gray-400">
          <Calendar className="w-4 h-4" />
        </div>
        <span className={`flex-1 text-left ${displayValue ? 'text-gray-800' : 'text-gray-400'}`}>
          {displayValue || placeholder}
        </span>
        {value && (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onChange(''); setOpen(false); }}
            className="text-gray-300 hover:text-gray-500 shrink-0 text-base leading-none"
          >
            ×
          </button>
        )}
      </button>

      {/* Popover */}
      {open && (
        <div className="absolute z-50 mt-2 left-0 bg-white border border-gray-200 rounded-2xl shadow-xl p-3 min-w-[280px]">
          <DayPicker
            mode="single"
            selected={selected && isValid(selected) ? selected : undefined}
            onSelect={day => {
              onChange(day ? format(day, 'yyyy-MM-dd') : '');
              setOpen(false);
            }}
            locale={tr}
            disabled={disabled}
            showOutsideDays
            classNames={{
              months:        'flex flex-col',
              month:         'space-y-3',
              caption:       'flex justify-between items-center px-1 mb-1',
              caption_label: 'text-sm font-semibold text-gray-900',
              nav:           'flex items-center gap-1',
              nav_button:    'w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors',
              nav_button_previous: '',
              nav_button_next:     '',
              table:         'w-full border-collapse',
              head_row:      'flex mb-1',
              head_cell:     'text-gray-400 text-xs font-medium flex-1 text-center py-1',
              row:           'flex w-full',
              cell:          'flex-1 text-center py-0.5',
              day:           'w-8 h-8 mx-auto rounded-lg text-sm flex items-center justify-center hover:bg-indigo-50 hover:text-indigo-600 transition-colors cursor-pointer',
              day_selected:  '!bg-indigo-600 !text-white hover:!bg-indigo-700 font-semibold rounded-lg',
              day_today:     'font-bold text-indigo-500',
              day_outside:   'text-gray-300 hover:bg-gray-50 hover:text-gray-400',
              day_disabled:  'text-gray-200 cursor-not-allowed hover:bg-transparent hover:text-gray-200',
              day_hidden:    'invisible',
            }}
            components={{
              IconLeft:  () => <ChevronLeft className="w-4 h-4" />,
              IconRight: () => <ChevronRight className="w-4 h-4" />,
            }}
          />
        </div>
      )}
    </div>
  );
}
