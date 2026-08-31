import { useState, useEffect, useRef } from 'react';
import { cn } from '../../utils/helpers';

// Base Modal
export function Modal({ isOpen, onClose, children, size = 'md', title }) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-6xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className={cn('relative w-full max-h-[90vh] flex flex-col bg-white dark:bg-surface-800 rounded-2xl shadow-2xl animate-slide-up overflow-hidden', sizes[size])}>
        {children}
      </div>
    </div>
  );
}

export function ModalHeader({ title, onClose, subtitle }) {
  return (
    <div className="flex items-start justify-between p-6 border-b border-surface-100 dark:border-surface-700">
      <div>
        <h2 className="text-lg font-semibold text-surface-800 dark:text-white">{title}</h2>
        {subtitle && <p className="text-sm text-surface-500 dark:text-surface-400 mt-0.5">{subtitle}</p>}
      </div>
      <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 transition-colors ml-4">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  );
}

export function ModalBody({ children, className }) {
  return <div className={cn('p-6 overflow-y-auto flex-1', className)}>{children}</div>;
}

export function ModalFooter({ children, className }) {
  return <div className={cn('flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-100 dark:border-surface-700 bg-surface-50 dark:bg-surface-850', className)}>{children}</div>;
}

// Confirm Modal
export function ConfirmModal({ isOpen, onClose, onConfirm, title = 'Confirm Action', message, confirmText = 'Confirm', confirmVariant = 'primary', loading = false }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <ModalHeader title={title} onClose={onClose} />
      <ModalBody>
        <p className="text-surface-600 dark:text-surface-300 text-sm">{message}</p>
      </ModalBody>
      <ModalFooter>
        <button className="btn-outline" onClick={onClose}>Cancel</button>
        <button
          className={cn(`btn-${confirmVariant}`, loading && 'opacity-70 cursor-not-allowed')}
          onClick={onConfirm}
          disabled={loading}
        >
          {loading && <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />}
          {confirmText}
        </button>
      </ModalFooter>
    </Modal>
  );
}

// Delete Modal
export function DeleteModal({ isOpen, onClose, onConfirm, itemName, loading = false }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <ModalHeader title="Delete Confirmation" onClose={onClose} />
      <ModalBody>
        <div className="flex gap-4">
          <div className="w-12 h-12 rounded-xl bg-danger-100 dark:bg-danger-900/30 flex items-center justify-center flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-danger-600"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </div>
          <div>
            <p className="font-medium text-surface-800 dark:text-white">Are you sure?</p>
            <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
              This will permanently delete <strong>{itemName}</strong>. This action cannot be undone.
            </p>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <button className="btn-outline" onClick={onClose}>Cancel</button>
        <button className="btn-danger" onClick={onConfirm} disabled={loading}>
          {loading && <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />}
          Delete
        </button>
      </ModalFooter>
    </Modal>
  );
}

// Slide-over / Drawer
export function Drawer({ isOpen, onClose, title, children, size = 'md' }) {
  const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl' };
  
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('relative bg-white dark:bg-surface-800 h-full w-full shadow-2xl flex flex-col animate-slide-in-right', sizes[size])}>
        <div className="flex items-center justify-between p-6 border-b border-surface-100 dark:border-surface-700">
          <h2 className="text-lg font-semibold text-surface-800 dark:text-white">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-400 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}
