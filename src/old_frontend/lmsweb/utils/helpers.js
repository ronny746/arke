import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num?.toString() || '0';
}

export function formatCurrency(amount, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

export function formatDate(date, fmt = 'dd MMM yyyy') {
  if (!date) return '—';
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  if (fmt === 'dd MMM yyyy') return `${day} ${month} ${year}`;
  if (fmt === 'dd/MM/yyyy') return `${day}/${String(d.getMonth()+1).padStart(2,'0')}/${year}`;
  return d.toLocaleDateString();
}

export function getInitials(name = '') {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

export function randomId() {
  return Math.random().toString(36).slice(2);
}

export function truncate(str, n = 40) {
  return str?.length > n ? str.slice(0, n) + '...' : str || '';
}

export function getStatusBadge(status) {
  const map = {
    active: 'badge-success',
    inactive: 'badge-surface',
    suspended: 'badge-danger',
    pending: 'badge-warning',
    expired: 'badge-danger',
    trial: 'badge-accent',
    basic: 'badge-surface',
    premium: 'badge-secondary',
    enterprise: 'badge-primary',
    present: 'badge-success',
    absent: 'badge-danger',
    late: 'badge-warning',
    published: 'badge-success',
    draft: 'badge-surface',
    graded: 'badge-primary',
    submitted: 'badge-accent',
  };
  return map[status?.toLowerCase()] || 'badge-surface';
}
