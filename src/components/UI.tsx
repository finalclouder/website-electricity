import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown } from 'lucide-react';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AccordionProps {
  title: string;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  icon?: React.ReactNode;
  /** Optional section ID — when any input inside gains focus, activeSection is set so Preview scrolls */
  sectionId?: string;
  /** Called when user focuses any input inside this accordion — used to sync Preview scroll */
  onInputFocus?: () => void;
}

export const Accordion: React.FC<AccordionProps> = ({ title, children, isOpen, onToggle, icon, sectionId, onInputFocus }) => {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (isOpen && ref.current) {
      const timer = setTimeout(() => {
        ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 300); // Wait for animation
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // When user focuses any input/textarea inside this accordion,
  // notify parent so Preview panel can auto-scroll to the corresponding page.
  const handleFocusCapture = onInputFocus;

  return (
    <div
      ref={ref}
      className={cn(
      "border-b border-zinc-200 last:border-0 transition-all duration-300",
      isOpen ? "bg-blue-50/30" : "bg-transparent"
    )}>
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center justify-between p-4 transition-all text-left group",
          isOpen ? "bg-blue-50" : "hover:bg-zinc-50"
        )}
      >
        <div className="flex items-center gap-3">
          {icon && (
            <span className={cn(
              "transition-colors duration-300", 
              isOpen ? "text-blue-600" : "text-zinc-400 group-hover:text-zinc-600"
            )}>
              {icon}
            </span>
          )}
          <span className={cn(
            "font-semibold transition-colors duration-300", 
            isOpen ? "text-blue-700" : "text-zinc-700 group-hover:text-zinc-900"
          )}>
            {title}
          </span>
        </div>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className={cn(
            "transition-colors duration-300",
            isOpen ? "text-blue-600" : "text-zinc-400"
          )}
        >
          <ChevronDown size={20} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 space-y-4" onFocusCapture={handleFocusCapture}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string }> = ({ label, className, ...props }) => (
  <div className="space-y-1.5">
    {label && <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{label}</label>}
    <input
      className={cn(
        "w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all",
        className
      )}
      {...props}
    />
  </div>
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; options: { label: string; value: string }[] }> = ({ label, options, className, ...props }) => (
  <div className="space-y-1.5">
    {label && <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{label}</label>}
    <select
      className={cn(
        "w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none",
        className
      )}
      {...props}
    >
      {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
  </div>
);

export const Checkbox: React.FC<{ label: string; checked: boolean; onChange: (checked: boolean) => void }> = ({ label, checked, onChange }) => (
  <label className="flex items-center gap-2 cursor-pointer group">
    <div className={cn(
      "w-5 h-5 rounded border flex items-center justify-center transition-all",
      checked ? "bg-blue-600 border-blue-600" : "bg-white border-zinc-300 group-hover:border-blue-400"
    )} onClick={() => onChange(!checked)}>
      {checked && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>}
    </div>
    <span className="text-sm text-zinc-700">{label}</span>
  </label>
);

export const DateMaskInput: React.FC<{
  label?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}> = ({ label, value, onChange, className }) => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const pendingCursor = React.useRef<number | null>(null);

  const digits = (value || '').replace(/\D/g, '');

  const fmt = (d: string) => {
    const c = d.padEnd(8, '_').split('');
    return `${c[0]}${c[1]}/${c[2]}${c[3]}/${c[4]}${c[5]}${c[6]}${c[7]}`;
  };

  const toStored = (d: string) => {
    if (!d) return '';
    let r = '';
    for (let i = 0; i < d.length && i < 8; i++) {
      if (i === 2 || i === 4) r += '/';
      r += d[i];
    }
    return r;
  };

  const digitToChar = (n: number) => n <= 2 ? n : n <= 4 ? n + 1 : n + 2;
  const charToDigit = (n: number) => n <= 2 ? n : n <= 5 ? n - 1 : n - 2;

  const display = fmt(digits);

  const setCursor = (pos: number) => {
    pendingCursor.current = pos;
  };

  React.useLayoutEffect(() => {
    if (pendingCursor.current !== null && inputRef.current) {
      const p = pendingCursor.current;
      inputRef.current.setSelectionRange(p, p);
      pendingCursor.current = null;
    }
  });

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab' || e.key === 'Escape') return;
    if (e.key === 'a' && (e.ctrlKey || e.metaKey)) return;

    e.preventDefault();
    const el = inputRef.current;
    if (!el) return;

    const hasSelection = el.selectionStart !== el.selectionEnd;

    if (e.key === 'Backspace') {
      if (hasSelection) {
        onChange('');
        setCursor(0);
      } else if (digits.length > 0) {
        onChange(toStored(digits.slice(0, -1)));
        setCursor(digitToChar(digits.length - 1));
      }
      return;
    }

    if (e.key === 'Delete') {
      onChange('');
      setCursor(0);
      return;
    }

    if (e.key === 'ArrowLeft') {
      if (el.selectionStart != null && el.selectionStart > 0) {
        let p = el.selectionStart - 1;
        if (p === 2 || p === 5) p--;
        el.setSelectionRange(p, p);
      }
      return;
    }
    if (e.key === 'ArrowRight') {
      if (el.selectionStart != null && el.selectionStart < display.length) {
        let p = el.selectionStart + 1;
        if (p === 3 || p === 6) p++;
        el.setSelectionRange(p, p);
      }
      return;
    }

    if (!/^\d$/.test(e.key)) return;

    if (hasSelection) {
      onChange(toStored(e.key));
      setCursor(digitToChar(1));
      return;
    }

    if (digits.length >= 8) {
      const dIdx = charToDigit(el.selectionStart || 0);
      if (dIdx >= 0 && dIdx < 8) {
        const nd = digits.slice(0, dIdx) + e.key + digits.slice(dIdx + 1);
        onChange(toStored(nd));
        setCursor(digitToChar(Math.min(dIdx + 1, 7)));
      }
      return;
    }

    onChange(toStored(digits + e.key));
    setCursor(digitToChar(digits.length + 1));
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pd = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 8);
    if (pd) {
      onChange(toStored(pd));
      setCursor(digitToChar(pd.length));
    }
  };

  return (
    <div className="space-y-1.5">
      {label && <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{label}</label>}
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={display}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onChange={() => {}}
        className={cn(
          "w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono tracking-wider",
          className
        )}
        placeholder="__/__/____"
      />
    </div>
  );
};
