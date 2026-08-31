import { cn } from '../../utils/helpers';

export function FormField({ label, error, required, children, hint, className }) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="text-danger-500 ml-0.5">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-surface-400 dark:text-surface-500">{hint}</p>}
      {error && <p className="form-error"><span>⚠</span>{error}</p>}
    </div>
  );
}

export function Input({ className, label, error, required, hint, ...props }) {
  const inputEl = <input className={cn('form-input', error && 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/20', className)} {...props} />;
  if (label) {
    return <FormField label={label} error={error} required={required} hint={hint}>{inputEl}</FormField>;
  }
  return inputEl;
}

export function Textarea({ className, rows = 4, label, error, required, hint, ...props }) {
  const textareaEl = <textarea className={cn('form-input resize-none', error && 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/20', className)} rows={rows} {...props} />;
  if (label) {
    return <FormField label={label} error={error} required={required} hint={hint}>{textareaEl}</FormField>;
  }
  return textareaEl;
}

export function Select({ children, options, className, label, error, required, hint, ...props }) {
  const selectEl = (
    <div className="relative">
      <select className={cn('form-select pr-8', error && 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/20', className)} {...props}>
        {options ? options.map((opt, i) => (
          <option key={i} value={opt.value}>{opt.label}</option>
        )) : children}
      </select>
      <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-surface-400" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
    </div>
  );
  if (label) {
    return <FormField label={label} error={error} required={required} hint={hint}>{selectEl}</FormField>;
  }
  return selectEl;
}

export { FileUpload } from './FileUpload.jsx';

export function Switch({ checked, onChange, label, size = 'md' }) {
  const sizes = { sm: 'w-8 h-4', md: 'w-11 h-6', lg: 'w-14 h-7' };
  const knobSizes = { sm: 'w-3 h-3', md: 'w-4 h-4', lg: 'w-5 h-5' };
  const translate = { sm: checked ? 'translate-x-4' : 'translate-x-0.5', md: checked ? 'translate-x-5' : 'translate-x-1', lg: checked ? 'translate-x-7' : 'translate-x-1' };
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div className={cn('relative rounded-full transition-colors duration-200', sizes[size], checked ? 'bg-primary' : 'bg-surface-300 dark:bg-surface-600')} onClick={onChange}>
        <div className={cn('absolute top-1/2 -translate-y-1/2 bg-white rounded-full shadow transition-transform duration-200', knobSizes[size], translate[size])} />
      </div>
      {label && <span className="text-sm text-surface-700 dark:text-surface-300">{label}</span>}
    </label>
  );
}

export function RadioGroup({ options, value, onChange, name }) {
  return (
    <div className="flex flex-wrap gap-3">
      {options.map(opt => (
        <label key={opt.value} className={cn('flex items-center gap-2 cursor-pointer px-4 py-2 rounded-xl border-2 transition-all text-sm font-medium', value === opt.value ? 'border-primary bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300' : 'border-surface-200 dark:border-surface-600 text-surface-600 dark:text-surface-400 hover:border-surface-300')}>
          <input type="radio" name={name} value={opt.value} checked={value === opt.value} onChange={() => onChange(opt.value)} className="sr-only" />
          <div className={cn('w-4 h-4 rounded-full border-2 flex items-center justify-center', value === opt.value ? 'border-primary' : 'border-surface-300')}>
            {value === opt.value && <div className="w-2 h-2 rounded-full bg-primary" />}
          </div>
          {opt.label}
        </label>
      ))}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Search...', className }) {
  return (
    <div className={cn('relative', className)}>
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={cn('form-input pl-9', className)} />
    </div>
  );
}
