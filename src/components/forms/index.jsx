import { cn } from '../../utils/helpers';
import { Search, ChevronDown } from 'lucide-react';

// ─── FormField ────────────────────────────────────────────────────────────────
export function FormField({ label, error, required, children, hint, className }) {
  return (
    <div className={cn('flex flex-col', className)}>
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="text-danger-500 ml-0.5">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-surface-400 dark:text-surface-500 mt-1">{hint}</p>}
      {error && <p className="form-error"><span>⚠</span>{error}</p>}
    </div>
  );
}

// ─── Input ───────────────────────────────────────────────────────────────────
export function Input({ className, label, error, required, hint, ...props }) {
  const el = (
    <input
      className={cn('form-input', error && 'border-danger-400 focus:border-danger-400 focus:ring-danger-300/40', className)}
      {...props}
    />
  );
  if (label) return <FormField label={label} error={error} required={required} hint={hint}>{el}</FormField>;
  return el;
}

// ─── Textarea ─────────────────────────────────────────────────────────────────
export function Textarea({ className, rows = 4, label, error, required, hint, ...props }) {
  const el = (
    <textarea
      className={cn('form-input resize-none', error && 'border-danger-400 focus:border-danger-400 focus:ring-danger-300/40', className)}
      rows={rows}
      {...props}
    />
  );
  if (label) return <FormField label={label} error={error} required={required} hint={hint}>{el}</FormField>;
  return el;
}

// ─── Select ───────────────────────────────────────────────────────────────────
export function Select({ children, options, className, label, error, required, hint, ...props }) {
  const el = (
    <div className="relative">
      <select
        className={cn('form-select pr-8', error && 'border-danger-400 focus:border-danger-400 focus:ring-danger-300/40', className)}
        {...props}
      >
        {options
          ? options.map((opt, i) => <option key={i} value={opt.value}>{opt.label}</option>)
          : children}
      </select>
      <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-surface-400" />
    </div>
  );
  if (label) return <FormField label={label} error={error} required={required} hint={hint}>{el}</FormField>;
  return el;
}

export { FileUpload } from './FileUpload.jsx';

// ─── Switch ───────────────────────────────────────────────────────────────────
export function Switch({ checked, onChange, label, size = 'md', disabled = false }) {
  const track = { sm: 'w-8 h-4', md: 'w-10 h-5', lg: 'w-12 h-6' };
  const knob  = { sm: 'w-3 h-3 top-0.5', md: 'w-3.5 h-3.5 top-[3px]', lg: 'w-4.5 h-4.5 top-[3px]' };
  const on    = { sm: 'translate-x-4', md: 'translate-x-5', lg: 'translate-x-6' };
  const off   = { sm: 'translate-x-0.5', md: 'translate-x-0.5', lg: 'translate-x-0.5' };

  return (
    <label className={cn('flex items-center gap-2.5 cursor-pointer', disabled && 'opacity-50 cursor-not-allowed')}>
      <div
        className={cn('relative rounded-full transition-colors duration-200', track[size], checked ? 'bg-primary' : 'bg-surface-300 dark:bg-surface-600')}
        onClick={!disabled ? onChange : undefined}
        role="switch"
        aria-checked={checked}
      >
        <div className={cn('absolute left-0 bg-white rounded-full shadow transition-transform duration-200', knob[size], checked ? on[size] : off[size])} />
      </div>
      {label && <span className="text-sm text-surface-700 dark:text-surface-300">{label}</span>}
    </label>
  );
}

// ─── RadioGroup ───────────────────────────────────────────────────────────────
export function RadioGroup({ options, value, onChange, name }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <label
          key={opt.value}
          className={cn(
            'flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-lg border transition-all text-sm font-medium',
            value === opt.value
              ? 'border-primary bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300'
              : 'border-surface-200 dark:border-surface-600 text-surface-600 dark:text-surface-400 hover:border-surface-300 hover:bg-surface-50'
          )}
        >
          <input type="radio" name={name} value={opt.value} checked={value === opt.value} onChange={() => onChange(opt.value)} className="sr-only" />
          <div className={cn('w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center', value === opt.value ? 'border-primary' : 'border-surface-300')}>
            {value === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
          </div>
          {opt.label}
        </label>
      ))}
    </div>
  );
}

// ─── SearchInput ─────────────────────────────────────────────────────────────
export function SearchInput({ value, onChange, placeholder = 'Search...', className }) {
  return (
    <div className={cn('relative', className)}>
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="form-input pl-8"
      />
    </div>
  );
}
