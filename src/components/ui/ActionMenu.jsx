import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical, MoreHorizontal } from 'lucide-react';
import { cn } from '@/utils/helpers';

export function ActionMenu({ actions, vertical = true, className = '' }) {
  const filteredActions = (actions || []).filter(Boolean);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const menuRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  if (filteredActions.length === 0) return null;

  useEffect(() => {
    const handler = (e) => { 
      if (ref.current && !ref.current.contains(e.target) && menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false); 
      }
    };
    document.addEventListener('mousedown', handler);
    // Close on scroll to prevent floating menu from detaching
    window.addEventListener('scroll', () => setOpen(false), true);
    return () => {
      document.removeEventListener('mousedown', handler);
      window.removeEventListener('scroll', () => setOpen(false), true);
    };
  }, []);

  const handleClick = (e) => {
    e.stopPropagation();
    if (!open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const menuHeight = filteredActions.length * 36 + 16;
      let top = rect.bottom + window.scrollY + 4;
      
      // If menu would go off the bottom of the screen, open upwards
      if (rect.bottom + menuHeight > window.innerHeight) {
        top = rect.top + window.scrollY - menuHeight - 4;
      }
      
      setCoords({ 
        top, 
        left: rect.right - 176 + window.scrollX // 176px is w-44
      });
    }
    setOpen(o => !o);
  };

  const Icon = vertical ? MoreVertical : MoreHorizontal;

  return (
    <div className={cn("relative", className)} ref={ref}>
      <button 
        className="btn-ghost btn-icon p-1.5 rounded-full hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors" 
        onClick={handleClick}
        title="Actions"
      >
        <Icon size={16} className="text-surface-500" />
      </button>
      
      {open && createPortal(
        <div 
          ref={menuRef}
          style={{ top: coords.top, left: coords.left }}
          className="absolute z-[100] w-44 bg-white dark:bg-surface-800 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] border border-surface-100 dark:border-surface-700 py-1 animate-fade-in"
        >
          {filteredActions.map((action, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); action.onClick(e); setOpen(false); }}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors text-left font-medium', 
                action.danger 
                  ? 'text-danger-600 dark:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-900/20' 
                  : 'text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700'
              )}
            >
              {action.icon && <action.icon size={14} />}
              {action.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
