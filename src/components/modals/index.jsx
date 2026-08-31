"use client";
import { useEffect } from 'react';
import { X, Trash2, AlertTriangle } from 'lucide-react';
import { cn } from '../../utils/helpers';

// ─── Modal ────────────────────────────────────────────────────────────────────
export function Modal({ isOpen, onClose, children, size = 'md' }) {
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!isOpen) return null;

  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl', full: 'max-w-6xl' };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      {/* Panel */}
      <div className={cn(
        'relative w-full max-h-[90vh] flex flex-col bg-white dark:bg-surface-800 rounded-2xl shadow-2xl overflow-hidden animate-slide-up',
        sizes[size]
      )}>
        {children}
      </div>
    </div>
  );
}

// ─── ModalHeader ─────────────────────────────────────────────────────────────
export function ModalHeader({ title, subtitle, onClose }) {
  return (
    <div className="flex items-start justify-between px-5 py-4 border-b border-surface-100 dark:border-surface-700 flex-shrink-0">
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-surface-800 dark:text-white leading-tight">{title}</h2>
        {subtitle && <p className="text-sm text-surface-500 dark:text-surface-400 mt-0.5">{subtitle}</p>}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="ml-4 flex-shrink-0 p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 transition-colors"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

// ─── ModalBody ────────────────────────────────────────────────────────────────
export function ModalBody({ children, className }) {
  return (
    <div className={cn('px-5 py-4 overflow-y-auto flex-1', className)}>
      {children}
    </div>
  );
}

// ─── ModalFooter ─────────────────────────────────────────────────────────────
export function ModalFooter({ children, className }) {
  return (
    <div className={cn('flex items-center justify-end gap-2 px-5 py-3 border-t border-surface-100 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/50 flex-shrink-0', className)}>
      {children}
    </div>
  );
}

// ─── ConfirmModal ────────────────────────────────────────────────────────────
export function ConfirmModal({
  isOpen, onClose, onConfirm,
  title = 'Confirm Action', message,
  confirmText = 'Confirm', confirmVariant = 'primary', loading = false
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <ModalHeader title={title} onClose={onClose} />
      <ModalBody>
        <p className="text-sm text-surface-600 dark:text-surface-300">{message}</p>
      </ModalBody>
      <ModalFooter>
        <button className="btn-outline btn-sm" onClick={onClose}>Cancel</button>
        <button
          className={cn(`btn-${confirmVariant}`, 'btn-sm', loading && 'opacity-70 cursor-not-allowed')}
          onClick={onConfirm}
          disabled={loading}
        >
          {loading && <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
          {confirmText}
        </button>
      </ModalFooter>
    </Modal>
  );
}

// ─── DeleteModal ─────────────────────────────────────────────────────────────
export function DeleteModal({ isOpen, onClose, onConfirm, itemName, loading = false }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <ModalHeader title="Delete Confirmation" onClose={onClose} />
      <ModalBody>
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-xl bg-danger-50 dark:bg-danger-900/30 flex items-center justify-center flex-shrink-0">
            <Trash2 size={18} className="text-danger-500" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-surface-800 dark:text-white">Are you sure?</p>
            <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
              This will permanently delete <strong className="text-surface-700 dark:text-surface-200">{itemName}</strong>. This action cannot be undone.
            </p>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <button className="btn-outline btn-sm" onClick={onClose}>Cancel</button>
        <button className="btn-danger btn-sm" onClick={onConfirm} disabled={loading}>
          {loading && <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
          Delete
        </button>
      </ModalFooter>
    </Modal>
  );
}

// ─── Drawer / Slide-over ─────────────────────────────────────────────────────
export function Drawer({ isOpen, onClose, title, children, size = 'md' }) {
  const sizes = { sm: 'max-w-xs', md: 'max-w-sm', lg: 'max-w-md', xl: 'max-w-2xl' };

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className={cn(
        'relative bg-white dark:bg-surface-800 h-full w-full border-l border-surface-100 dark:border-surface-700 shadow-2xl flex flex-col animate-slide-in-right',
        sizes[size]
      )}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 dark:border-surface-700 flex-shrink-0">
          <h2 className="text-base font-semibold text-surface-800 dark:text-white">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-400 hover:text-surface-600 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
