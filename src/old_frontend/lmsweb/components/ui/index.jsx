import { cn, getInitials } from '../../utils/helpers';

export function Badge({ children, variant = 'primary', dot = false, className }) {
  const variants = {
    primary: 'badge-primary',
    secondary: 'badge-secondary',
    accent: 'badge-accent',
    success: 'badge-success',
    warning: 'badge-warning',
    danger: 'badge-danger',
    surface: 'badge-surface',
  };
  return (
    <span className={cn(variants[variant], className)}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  );
}

export function Avatar({ name, src, size = 'md', className }) {
  const sizes = { xs: 'w-6 h-6 text-xs', sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base', xl: 'w-16 h-16 text-xl' };
  const colors = ['from-primary to-secondary', 'from-accent to-primary', 'from-success to-accent', 'from-warning to-danger', 'from-secondary to-danger'];
  const colorClass = colors[(name?.charCodeAt(0) || 0) % colors.length];

  if (src) {
    return <img src={src} alt={name} className={cn('avatar', sizes[size], className)} />;
  }
  return (
    <div className={cn('rounded-full flex items-center justify-center font-semibold text-white bg-gradient-to-br flex-shrink-0', sizes[size], `bg-gradient-to-br ${colorClass}`, className)}>
      {getInitials(name)}
    </div>
  );
}

export function Card({ children, className, hover = false, glass = false, ...props }) {
  return (
    <div className={cn(glass ? 'card-glass' : 'card', hover && 'cursor-pointer hover:shadow-card-hover', className)} {...props}>
      {children}
    </div>
  );
}

export function StatCard({ title, value, change, icon: Icon, color = 'primary', format, subtitle }) {
  const colorMap = {
    primary: { icon: 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400', card: 'stat-card-primary' },
    secondary: { icon: 'bg-secondary-100 dark:bg-secondary-900/30 text-secondary-600 dark:text-secondary-400', card: 'stat-card-secondary' },
    accent: { icon: 'bg-accent-100 dark:bg-accent-900/30 text-accent-600 dark:text-accent-400', card: 'stat-card-accent' },
    success: { icon: 'bg-success-100 dark:bg-success-900/30 text-success-600 dark:text-success-400', card: 'stat-card-success' },
    warning: { icon: 'bg-warning-100 dark:bg-warning-900/30 text-warning-600 dark:text-warning-400', card: 'stat-card-warning' },
    danger: { icon: 'bg-danger-100 dark:bg-danger-900/30 text-danger-600 dark:text-danger-400', card: 'stat-card-danger' },
  };
  const isPositive = change >= 0;

  return (
    <div className={cn('stat-card', colorMap[color]?.card)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-surface-500 dark:text-surface-400 font-medium truncate">{title}</p>
          <p className="text-2xl font-bold mt-1 text-surface-800 dark:text-white animate-count-up">
            {format === 'currency' ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)
             : format === 'percent' ? `${value}%`
             : typeof value === 'number' && value >= 1000 ? value.toLocaleString()
             : value}
          </p>
          {subtitle && <p className="text-xs text-surface-400 dark:text-surface-500 mt-0.5">{subtitle}</p>}
          {change !== undefined && (
            <p className={cn('text-xs font-medium mt-2', isPositive ? 'text-success-600 dark:text-success-400' : 'text-danger-600 dark:text-danger-400')}>
              {isPositive ? '↑' : '↓'} {Math.abs(change)}% vs last month
            </p>
          )}
        </div>
        {Icon && (
          <div className={cn('p-3 rounded-xl flex-shrink-0', colorMap[color]?.icon)}>
            <Icon size={22} />
          </div>
        )}
      </div>
    </div>
  );
}

export function Divider({ className }) {
  return <hr className={cn('divider', className)} />;
}

export function Skeleton({ className, lines = 1 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={cn('skeleton h-4 rounded', className)} />
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && (
        <div className="w-16 h-16 rounded-2xl bg-surface-100 dark:bg-surface-700 flex items-center justify-center mb-4">
          <Icon size={32} className="text-surface-400" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-surface-700 dark:text-surface-200 mb-1">{title}</h3>
      {description && <p className="text-sm text-surface-400 dark:text-surface-500 mb-4 max-w-sm">{description}</p>}
      {action}
    </div>
  );
}

export function Tooltip({ children, text, position = 'top' }) {
  return (
    <div className="relative group inline-flex">
      {children}
      <div className={cn(
        'absolute z-50 px-2 py-1 text-xs font-medium text-white bg-surface-800 dark:bg-surface-700 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none',
        position === 'top' && 'bottom-full mb-2 left-1/2 -translate-x-1/2',
        position === 'bottom' && 'top-full mt-2 left-1/2 -translate-x-1/2',
        position === 'left' && 'right-full mr-2 top-1/2 -translate-y-1/2',
        position === 'right' && 'left-full ml-2 top-1/2 -translate-y-1/2',
      )}>
        {text}
      </div>
    </div>
  );
}
