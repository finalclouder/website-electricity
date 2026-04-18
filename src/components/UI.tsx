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
}

export const Accordion: React.FC<AccordionProps> = ({ title, children, isOpen, onToggle, icon }) => {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (isOpen && ref.current) {
      const timer = setTimeout(() => {
        ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 300); // Wait for animation
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

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
            <div className="p-4 pt-0 space-y-4">
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

/**
 * DateMaskInput — masked input for dd/mm/yyyy format.
 * Displays "__/__/____" placeholder, user types digits left-to-right,
 * slashes are inserted automatically. Backspace removes digits right-to-left.
 */
export const DateMaskInput: React.FC<{
  label?: string;
  value: string;          // stored as "dd/mm/yyyy" or partial
  onChange: (value: string) => void;
  className?: string;
}> = ({ label, value, onChange, className }) => {
  // Extract only digits from value
  const digits = (value || '').replace(/\D/g, '');

  // Build display string with mask
  const formatDisplay = (d: string): string => {
    const chars = d.padEnd(8, '_').split('');
    return `${chars[0]}${chars[1]}/${chars[2]}${chars[3]}/${chars[4]}${chars[5]}${chars[6]}${chars[7]}`;
  };

  // Build stored value (dd/mm/yyyy) from digits
  const formatValue = (d: string): string => {
    if (d.length === 0) return '';
    let result = '';
    for (let i = 0; i < d.length && i < 8; i++) {
      if (i === 2 || i === 4) result += '/';
      result += d[i];
    }
    return result;
  };

  const display = formatDisplay(digits);

  // Calculate cursor position based on digit count
  const getCursorPos = (digitCount: number): number => {
    if (digitCount <= 2) return digitCount;
    if (digitCount <= 4) return digitCount + 1; // after first /
    return digitCount + 2; // after both /
  };

  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow: Tab, Escape
    if (e.key === 'Tab' || e.key === 'Escape') return;

    e.preventDefault();

    if (e.key === 'Backspace') {
      if (digits.length > 0) {
        const newDigits = digits.slice(0, -1);
        onChange(formatValue(newDigits));
      }
      return;
    }

    if (e.key === 'Delete') {
      onChange('');
      return;
    }

    // Only accept digits
    if (/^\d$/.test(e.key) && digits.length < 8) {
      const newDigits = digits + e.key;
      onChange(formatValue(newDigits));
    }
  };

  // Set cursor position after render
  React.useEffect(() => {
    if (inputRef.current && document.activeElement === inputRef.current) {
      const pos = getCursorPos(digits.length);
      inputRef.current.setSelectionRange(pos, pos);
    }
  });

  const handleFocus = () => {
    setTimeout(() => {
      if (inputRef.current) {
        const pos = getCursorPos(digits.length);
        inputRef.current.setSelectionRange(pos, pos);
      }
    }, 0);
  };

  // Prevent paste of non-digit content
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text');
    const pastedDigits = text.replace(/\D/g, '');
    if (pastedDigits) {
      const combined = (digits + pastedDigits).slice(0, 8);
      onChange(formatValue(combined));
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
        onFocus={handleFocus}
        onPaste={handlePaste}
        onChange={() => {}}  // controlled via onKeyDown
        className={cn(
          "w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono tracking-wider",
          className
        )}
        placeholder="__/__/____"
      />
    </div>
  );
};
