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
